import dayjs from 'dayjs';
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
import mathHelper from '../../helpers/mathHelper';

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
    if (!schemaHelper.plan.validator.date(ISOYearMonth)) {
        throw errorHelper.create.validation('getActionsListByMonth', { ISOYearMonth });
    }

    let tx;
    try {
        const db = getDBInstanse();
        tx = db.transaction([ACTIONS_STORE_NAME, CATEGORIES_STORE_NAME], READONLY);
        const actionsIndex = tx.objectStore(ACTIONS_STORE_NAME).index(DATE_INDEX);

        const startDate = `${ISOYearMonth}-01`;
        const startDayjs = dayjs(startDate);
        const endDate = formatHelper.getISODateString(startDayjs.date(startDayjs.daysInMonth()));

        const actions = await actionsIndex.getAll(IDBKeyRange.bound(startDate, endDate));
        const actionsByDates = {};

        actions
            .map(action => ({
                ...action,
                sum: mathHelper.round(action.sum),
            }))
            .forEach(action => {
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
        try {
            tx?.abort();
        } catch {}
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

        return {
            ...record,
            sum: mathHelper.round(record.sum),
        };
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const setAction = async (data, _id = null) => {
    if (!schemaHelper.action.checkEditableFields(data) || (_id && !schemaHelper.action.validator._id(_id))) {
        throw errorHelper.create.validation('setAction', { data, _id });
    }

    let tx;
    try {
        const db = getDBInstanse();
        tx = db.transaction(db.objectStoreNames, READWRITE);
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
        await tx.done;
        return record;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const deleteAction = async _id => {
    if (!_id || !schemaHelper.action.validator._id(_id)) {
        throw errorHelper.create.validation('deleteAction', { _id });
    }

    let tx;
    try {
        const db = getDBInstanse();
        tx = db.transaction(db.objectStoreNames, READWRITE);
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
        await tx.done;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const _updateDataByAction = async ({ newAction = null, oldAction = null, transaction = null }) => {
    if (
        (!newAction && !oldAction) ||
        (newAction && !schemaHelper.action.checkEditableFields(newAction)) ||
        (oldAction && !schemaHelper.action.checkEditableFields(oldAction))
    ) {
        throw errorHelper.create.validation('_updateDataByAction', { newAction, oldAction });
    }

    let tx = transaction;
    try {
        const db = getDBInstanse();
        tx ||= db.transaction(db.objectStoreNames, READWRITE);

        if (
            oldAction &&
            formatHelper.getISOYearMonthFromISODateString(oldAction.date) < formatHelper.getISOYearMonth()
        ) {
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

        if (
            newAction &&
            formatHelper.getISOYearMonthFromISODateString(newAction.date) < formatHelper.getISOYearMonth()
        ) {
            await _updatePlanByAction({
                action: newAction,
                isDeleted: false,
                transaction: tx,
            });

            await _updateUnaccountedByAction({
                action: newAction,
                isDeleted: false,
                transaction: tx,
            });
        }

        const firstCheck = await _getCheckFirst({ transaction: tx });
        if (oldAction?.date <= firstCheck.date || newAction?.date <= firstCheck.date) {
            await _updateConfigStart({ firstCheck, transaction: tx });
        }

        await tx.done;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const getActionSumsByCategoryIds = async (ISOYearMonth = formatHelper.getISOYearMonthString()) => {
    if (ISOYearMonth && !schemaHelper.plan.validator.date(ISOYearMonth)) {
        throw errorHelper.create.validation('getActionSumsByCategoryIds', { ISOYearMonth });
    }

    let tx;
    try {
        const db = getDBInstanse();
        tx = db.transaction([CATEGORIES_STORE_NAME, ACTIONS_STORE_NAME], READONLY);
        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);
        const actionsIndex = tx.objectStore(ACTIONS_STORE_NAME).index(CATEGORY_ID_AND_DATE_INDEX);

        const categoryIds = await categoriesStore.getAllKeys();
        const firstDate = `${ISOYearMonth || formatHelper.getISOYearMonthString()}-01`;
        const currMonth = formatHelper.getISOYearMonthString();
        const lastDate =
            ISOYearMonth === currMonth
                ? formatHelper.getISODateString()
                : formatHelper.getISODateString(dayjs(firstDate).date(dayjs(firstDate).daysInMonth()));

        console.log(firstDate, lastDate);

        const result = Object.fromEntries(
            await Promise.all(
                categoryIds.map(async id => {
                    const actions = await actionsIndex.getAll(IDBKeyRange.bound([id, firstDate], [id, lastDate]));
                    return [id, actions.reduce((sum, action) => sum + action.sum, 0)];
                })
            )
        );
        await tx.done;
        return result;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

export { getActionsListByMonth, getAction, setAction, deleteAction, getActionSumsByCategoryIds };
