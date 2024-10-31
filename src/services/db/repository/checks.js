import dayjs from 'dayjs';
import { categoryStatusEnum, categoryTypeEnum } from '../../constants';
import errorHelper from '../../helpers/errorHelper';
import schemaHelper from '../../helpers/schemaHelper';
import { getDBInstanse } from '../instance';
import { dbIndexEnum, dbModeEnum, dbSettings, dbStoreEnum } from '../config';

const { DB_NAME, DB_VERSION } = dbSettings;

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

const _getCheckFirst = async ({ transaction = null }) => {
    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction([CHECKS_STORE_NAME], READONLY);
        const dates = await tx.objectStore(CHECKS_STORE_NAME).getAllKeys();
        if (!dates.length) {
            return null;
        }

        const date = dates.sort()[0];
        return await _getCheck({ date, transaction: tx });
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _getCheckLast = async ({ transaction = null }) => {
    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction([CHECKS_STORE_NAME], READONLY);
        const dates = await tx.objectStore(CHECKS_STORE_NAME).getAllKeys();
        if (!dates.length) {
            return null;
        }

        const date = dates.sort()[dates.length - 1];
        return await _getCheck({ date, transaction: tx });
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _getCheck = async ({ date, transaction = null }) => {
    if (!date || !schemaHelper.check.validator.date(date)) {
        throw errorHelper.create.validation('_getCheck', { date });
    }

    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction([CHECKS_STORE_NAME], READWRITE);
        const record = await tx.objectStore(CHECKS_STORE_NAME).get(date);
        if (!transaction) {
            await tx.done;
        }
        return record || null;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _getCheckNext = async ({ date, isIncludeNow = false, transaction = null }) => {
    if (!date || !schemaHelper.check.validator.date(date)) {
        throw errorHelper.create.validation('_getCheckNext', { date, isIncludeNow });
    }

    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction([CHECKS_STORE_NAME], READONLY);
        const record = await tx.objectStore(CHECKS_STORE_NAME).get(IDBKeyRange.lowerBound(date, !isIncludeNow));
        if (!transaction) {
            await tx.done;
        }
        return record || null;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _getCheckPrev = async ({ date, transaction = null }) => {
    if (!date || !schemaHelper.check.validator.date(date)) {
        throw errorHelper.create.validation('_getCheckPrev', { date });
    }

    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction([CHECKS_STORE_NAME], READONLY);
        const records = await tx.objectStore(CHECKS_STORE_NAME).getAll(IDBKeyRange.upperBound(date, true));
        if (!transaction) {
            await tx.done;
        }
        return records.at(-1) || null;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _setCheck = async ({ data, needUpdateTime = true, transaction = null }) => {
    if (!schemaHelper.check.checkEditableFields(data)) {
        throw errorHelper.create.validation('_setCheck', { data, needUpdateTime });
    }

    const record = {};
    schemaHelper.check.editableFields.forEach(field => {
        record[field] = data[field];
    });

    if (needUpdateTime || !data._updatedAt) {
        record._updatedAt = dayjs().format();
    } else if (dayjs(data._updatedAt).format() === data._updatedAt) {
        record._updatedAt = data._updatedAt;
    } else {
        throw errorHelper.create.validation('_setCheck needUpdateTime', { needUpdateTime, data });
    }

    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction([CHECKS_STORE_NAME], READWRITE);
        await tx.objectStore(CHECKS_STORE_NAME).put(record);
        if (!transaction) {
            await tx.done;
        }
        return record;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _deleteCheck = async ({ date, transaction = null }) => {
    if (!date || !schemaHelper.check.validator.date(date)) {
        throw errorHelper.create.validation('_deleteCheck', { date });
    }

    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction([CHECKS_STORE_NAME], READWRITE);
        await tx.objectStore(CHECKS_STORE_NAME).delete(date);
        if (!transaction) {
            await tx.done;
        }
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

export { _getCheckFirst, _getCheckLast, _getCheck, _getCheckNext, _getCheckPrev, _setCheck, _deleteCheck };
