import dayjs from 'dayjs';
import errorHelper from '../../helpers/errorHelper';
import formatHelper from '../../helpers/formatHelper';
import schemaHelper from '../../helpers/schemaHelper';
import { dbIndexEnum, dbModeEnum, dbStoreEnum } from '../config';
import { getDBInstanse } from '../instance';
import { v4 as uuidv4 } from 'uuid';
import { categoryStatusEnum } from '../../constants';

const { PLANS_STORE_NAME } = dbStoreEnum;

const { CATEGORY_ID_AND_DATE_INDEX } = dbIndexEnum;

const { READONLY, READWRITE } = dbModeEnum;

const _getPlans = async ({ date, category_id, transaction = null }) => {
    if (!schemaHelper.plan.validator.date(date) || !schemaHelper.plan.validator.category_id(category_id)) {
        throw errorHelper.create.validation('_getPlans', { date, category_id });
    }

    let tx = transaction;
    try {
        const db = getDBInstanse();
        tx ||= db.transaction([PLANS_STORE_NAME], READONLY);
        const store = tx.objectStore(PLANS_STORE_NAME);

        return await store.index(CATEGORY_ID_AND_DATE_INDEX).getAll([category_id, date]);
    } catch (error) {
        tx?.abort();
        throw errorHelper.create.internal();
    }
};

const _setPlan = async ({ data, _id = null, needUpdateTime = true, transaction = null }) => {
    if (!schemaHelper.plan.checkEditableFields(data) || (_id && !schemaHelper.plan.validator._id(_id))) {
        throw errorHelper.create.validation('_setPlan', { data, _id, needUpdateTime });
    }

    const record = {};
    schemaHelper.plan.editableFields.forEach(field => {
        record[field] = data[field];
    });

    if (_id) {
        record._id = _id;
    } else {
        record._id = uuidv4();
    }
    if (needUpdateTime || !data._updatedAt) {
        record._updatedAt = dayjs().format();
    } else if (dayjs(data._updatedAt).format() === data._updatedAt) {
        record._updatedAt = data._updatedAt;
    } else {
        throw errorHelper.create.validation('_setPlan record', { needUpdateTime, data });
    }

    let tx = transaction;
    try {
        const db = getDBInstanse();
        tx ||= db.transaction([PLANS_STORE_NAME], READWRITE);
        const store = tx.objectStore(PLANS_STORE_NAME);

        const samePlans = (
            await store.index(CATEGORY_ID_AND_DATE_INDEX).getAll([record.category_id, record.date])
        ).filter(({ _id }) => _id !== record._id);

        for (plan of samePlans) {
            await store.delete(plan._id);
        }

        await store.put(record);
        if (!transaction) {
            await tx.done;
        }
        return record;
    } catch (error) {
        tx?.abort();
        errorHelper.throwCustomOrInternal(error);
    }
};

const _deletePlan = async ({ _id, transaction = null }) => {
    if (!_id || !schemaHelper.plan.validator._id(_id)) {
        throw errorHelper.create.validation('_deletePlan', { _id });
    }

    let tx = transaction;
    try {
        const db = getDBInstanse();
        tx ||= db.transaction([PLANS_STORE_NAME], READWRITE);
        await tx.objectStore(PLANS_STORE_NAME).delete(_id);
        if (!transaction) {
            await tx.done;
        }
    } catch (error) {
        tx?.abort();
        errorHelper.throwCustomOrInternal(error);
    }
};

const _updatePlanByAction = async ({ action, isDeleted, transaction = null }) => {
    if (schemaHelper.action.checkEditableFields(action)) {
        throw errorHelper.create.validation('_updatePlanByAction', { action, isDeleted });
    }

    try {
        const date = formatHelper.getISOYearMonthFromISODateString(action.date);
        const record = (await _getPlans({ date, category_id: action.category_id, transaction }))[0];
        if (date >= formatHelper.getISOYearMonthString()) return record || null;

        let data;
        if (!record && !isDeleted) {
            data = {
                date,
                category_id: action.category_id,
                sum: action.sum,
                comment: null,
            };
        } else if (record) {
            data = {
                ...record,
                sum: record.sum + (isDeleted ? -1 : 1) * action.sum,
            };

            if (data.sum <= 0) {
                await _deletePlan({ _id: data._id, transaction });
                return null;
            }
        }

        if (data) {
            return await _setPlan({ data, _id: record?._id, transaction });
        }

        return null;
    } catch (error) {
        transaction?.abort();
        errorHelper.throwCustomOrInternal(error);
    }
};

export { _getPlans, _setPlan, _deletePlan, _updatePlanByAction };
