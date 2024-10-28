import { categoryStatusEnum, categoryTypeEnum } from '../../constants';
import errorHelper from '../../helpers/errorHelper';
import schemaHelper from '../../helpers/schemaHelper';
import { getDBInstanse } from '../instance';
import { _deleteCheck, _getCheck, _getCheckNext, _getCheckPrev, _setCheck } from '../repository/checks';
import { _resetConfigStart, _updateConfigStart } from '../repository/config';
import { _deleteUnaccountedByDate, _updateUnaccountedByDate } from './unaccounted';

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

const getChecks = async () => {
    try {
        const db = getDBInstanse();
        const tx = db.transaction([CHECKS_STORE_NAME], READONLY);
        const records = await tx.store.getAll();
        if (!records.length) {
            throw errorHelper.create.notFound();
        }
        return records;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const getCheck = async date => {
    if (!date || !schemaHelper.check.validator.date(date)) {
        throw errorHelper.create.validation();
    }

    try {
        const record = await _getCheck({ date });
        if (!record) {
            throw errorHelper.create.notFound();
        }
        return record;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const setCheck = async data => {
    if (!schemaHelper.check.checkEditableFields(data)) {
        throw errorHelper.create.validation();
    }

    try {
        const db = getDBInstanse();
        const tx = db.transaction(db.objectStoreNames, READWRITE);
        const currentCheck = await _setCheck({ data, transaction: tx });

        const nextCheck = await _getCheckNext({ date: data.date, transaction: tx });
        const prevCheck = await _getCheckPrev({ date: data.date, transaction: tx });

        if (prevCheck) {
            await _updateUnaccountedByDate({ date: currentCheck.date, transaction: tx });
        } else {
            await _updateConfigStart({ firstCheck: data, transaction: tx });
        }
        if (nextCheck) {
            await _updateUnaccountedByDate({ date: nextCheck.date, transaction: tx });
        }

        await tx.done;
        return currentCheck;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const deleteCheck = async date => {
    if (!date || !schemaHelper.check.validator.date(date)) {
        throw errorHelper.create.validation();
    }

    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction(db.objectStoreNames, READWRITE);
        const store = tx.objectStore(CHECKS_STORE_NAME);
        const record = await store.get(date);
        if (!record) {
            throw errorHelper.create.notFound();
        }

        await _deleteCheck({ date, transaction: tx });

        const nextCheck = await _getCheckNext({ date, transaction: tx });
        const prevCheck = await _getCheckPrev({ date, transaction: tx });

        await _deleteUnaccountedByDate({ date, transaction: tx });

        if (!prevCheck) {
            if (nextCheck) {
                await _deleteUnaccountedByDate({ date: nextCheck.date, transaction: tx });
                await _updateConfigStart({ firstCheck: nextCheck, transaction: tx });
            } else {
                await _resetConfigStart({ transaction: tx });
            }
        } else if (nextCheck) {
            await _updateUnaccountedByDate({ date: nextCheck.date, transaction: tx });
        }

        await tx.done;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

export { getChecks, getCheck, setCheck, deleteCheck };
