import errorHelper from '../../helpers/errorHelper';
import formatHelper from '../../helpers/formatHelper';
import schemaHelper from '../../helpers/schemaHelper';
import { dbIndexEnum, dbModeEnum, dbStoreEnum } from '../config';
import { getDBInstanse } from '../instance';
import { _getCategory } from '../repository/categories';
import { _getCheckFirst } from '../repository/checks';
import { _updateConfigStart } from '../repository/config';
import { _updatePlanByAction } from '../repository/plans';
import { _deleteAction, _setAction, _updateUnaccountedByAction } from './unaccounted';

const {
    //
    CATEGORIES_STORE_NAME,
    ACTIONS_STORE_NAME,
    PLANS_STORE_NAME,
    CHECKS_STORE_NAME,
    CONFIG_STORE_NAME,
} = dbStoreEnum;

const {
    //
    DATE_INDEX,
    CATEGORY_ID_AND_DATE_INDEX,
    IS_ACCOUNTED_INDEX,
    IS_ACCOUNTED_AND_STATUS_AND_TYPE_INDEX,
    STATUS_AND_TYPE_INDEX,
} = dbIndexEnum;

const { READONLY, READWRITE } = dbModeEnum;

const getActionsListByMonth = async ISOYearMonth => {
    if (schemaHelper.plan.validator.date(ISOYearMonth)) {
        throw errorHelper.create.validation('getActionsListByMonth', { ISOYearMonth });
    }

    try {
        const db = getDBInstanse();
        const tx = db.transaction([ACTIONS_STORE_NAME], READONLY);
        const actionsIndex = tx.objectStore(ACTIONS_STORE_NAME).index(DATE_INDEX);

        const startDate = `${ISOYearMonth}-01`;
        const endDate = formatHelper.getISODateString(dayjs(startDate).add(1, 'month'));

        const actions = await actionsIndex.getAll(IDBKeyRange.bound(startDate, endDate));
        const actionsByDates = {};

        actions.forEach(action => {
            if (!actionsByDates[action.date]) {
                actionsByDates[action.date] = {
                    date: action.date,
                    actions: [],
                };
            }
            actionsByDates[action.date].actions.push(action);
        });

        for (const date in actionsByDates) {
            actionsByDates[date].actions.sort(({ _updatedAt: time1 }, { _updatedAt: time2 }) => {
                if (time1 < time2) return 1;
                if (time1 > time2) return -1;
                return 0;
            });
        }

        await tx.done;
        return Object.values(actionsByDates).sort(({ date: date1 }, { date: date2 }) => {
            if (date1 < date2) return 1;
            if (date1 > date2) return -1;
            return 0;
        });
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const getAction = async _id => {
    if (!_id || !schemaHelper.action.validator._id(_id)) {
        throw errorHelper.create.validation('getAction', { _id });
    }

    try {
        const db = getDBInstanse();
        const record = await db.get(ACTIONS_STORE_NAME, _id);
        if (!record) {
            throw errorHelper.create.notFound();
        }
        return record;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const setAction = async (data, _id = null) => {
    if (!schemaHelper.action.checkEditableFields(data) || (_id && !schemaHelper.action.validator._id(_id))) {
        throw errorHelper.create.validation('setAction', { data, _id });
    }

    try {
        const db = getDBInstanse();
        const tx = db.transaction(db.objectStoreNames, READWRITE);
        const store = tx.objectStore(ACTIONS_STORE_NAME);

        let oldRecord;
        if (_id) {
            oldRecord = await store.get(_id);

            if (!oldRecord) {
                throw errorHelper.create.notFound();
            } else {
                const categoryRecord = await _getCategory({ _id: oldRecord.category_id, transaction: tx });
                errorHelper.throwOnNotEditable(categoryRecord);
            }
        }

        if (oldRecord?.category_id !== data.category_id) {
            const categoryRecord = await _getCategory({ _id: data.category_id, transaction: tx });
            errorHelper.throwOnNotEditable(categoryRecord);
        }

        const record = await _setAction({ data, _id, transaction: tx });
        await _updateDataByAction({ oldAction: oldRecord, newAction: record, transaction: tx });
        return record;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const deleteAction = async _id => {
    if (!_id || !schemaHelper.action.validator._id(_id)) {
        throw errorHelper.create.validation('deleteAction', { _id });
    }

    try {
        const db = getDBInstanse();
        const tx = db.transaction(db.objectStoreNames, READWRITE);
        const store = tx.objectStore(ACTIONS_STORE_NAME);

        const record = await store.get(_id);
        if (!record) {
            throw errorHelper.create.notFound();
        } else {
            const categoryRecord = await _getCategory({ _id: record.category_id, transaction: tx });
            errorHelper.throwOnNotEditable(categoryRecord);
        }

        await _deleteAction({ _id, transaction: tx });
        await _updateDataByAction({ oldAction: record, newAction: null, transaction: tx });
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _updateDataByAction = async ({ newAction = null, oldAction = null, transaction = null }) => {
    if (
        (!newAction && !oldAction) ||
        !(schemaHelper.action.checkEditableFields(newAction) || schemaHelper.action.checkEditableFields(oldAction))
    ) {
        throw errorHelper.create.validation('_updateDataByAction', { newAction, oldAction });
    }

    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction(db.objectStoreNames, READWRITE);

        if (oldAction) {
            await _updatePlanByAction({
                action: oldAction,
                isDeleted: true,
                transaction: tx,
            });

            await _updateUnaccountedByAction({
                action: oldAction,
                isDeleted: true,
                transaction: tx,
            });
        }

        if (newAction) {
            await _updatePlanByAction({
                action: newAction,
                isDeleted: false,
                transaction: tx,
            });

            await _updateUnaccountedByAction({
                action: oldAction,
                isDeleted: false,
                transaction: tx,
            });
        }

        const firstCheck = await _getCheckFirst({ transaction: tx });
        if (oldAction?.date <= firstCheck.date || newAction?.date <= firstCheck.date) {
            await _updateConfigStart({ firstCheck, transaction: tx });
        }

        tx.done();
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

export { getActionsListByMonth, getAction, setAction, deleteAction };
