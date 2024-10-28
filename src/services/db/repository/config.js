import dayjs from 'dayjs';
import { categoryStatusEnum, categoryTypeEnum } from '../../constants';
import errorHelper from '../../helpers/errorHelper';
import schemaHelper from '../../helpers/schemaHelper';
import { getDBInstanse } from '../instance';

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

const _updateConfigStart = async ({ firstCheck, transaction = null }) => {
    if (!schemaHelper.check.checkEditableFields(firstCheck)) {
        throw errorHelper.create.validation();
    }

    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction(db.objectStoreNames, READWRITE);
        const actionsStore = tx.objectStore(ACTIONS_STORE_NAME);
        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);

        const prevActions = await actionsStore.getAll(IDBKeyRange.upperBound(firstCheck.date));
        const categories = await categoriesStore.getAll();
        const categoriesByIds = categories.reduce((acc, curr) => {
            acc[curr._id] = curr;
            return acc;
        }, {});

        const data = {
            start_default_sum: firstCheck.default_sum,
            start_savings_sum: firstCheck.savings_sum,
        };

        prevActions.forEach(({ category_id, sum }) => {
            const { status, type } = categoriesByIds[category_id];

            if (status === categoryStatusEnum.EXPENSE) {
                data.start_default_sum += sum;
                if (type === categoryTypeEnum.SAVINGS) {
                    data.start_savings_sum -= sum;
                }
            } else if (status === categoryStatusEnum.INCOME) {
                data.start_default_sum -= sum;
                if (type === categoryTypeEnum.SAVINGS) {
                    data.start_savings_sum += sum;
                }
            }
        });

        await _setConfigStart({ data, transaction: tx });
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _setConfigStart = async ({ data, transaction = null }) => {
    if (!schemaHelper.config.checkStartFields(data)) {
        throw errorHelper.create.validation();
    }

    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction([CONFIG_STORE_NAME], READWRITE);
        const store = tx.objectStore(CONFIG_STORE_NAME);

        await Promise.all(
            schemaHelper.config.startFields.map(field => {
                return store.put(data[field], field);
            })
        );

        if (!transaction) {
            await tx.done;
        }
        return data;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _setConfigField = async ({ key, value, transaction = null }) => {
    if (
        !schemaHelper.config.validator.field(key) ||
        (schemaHelper.config.startFields.includes(key) && !schemaHelper.config.validator[key](value))
    ) {
        throw errorHelper.create.validation();
    }

    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction([CONFIG_STORE_NAME], READWRITE);
        const store = tx.objectStore(CONFIG_STORE_NAME);

        await store.put(value, key);

        if (!transaction) {
            await tx.done;
        }
        return value;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _getConfigStart = async ({ transaction = null }) => {
    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction([CONFIG_STORE_NAME], READONLY);
        const store = tx.objectStore(CONFIG_STORE_NAME);

        const result = {};

        await Promise.all(
            schemaHelper.config.startFields.map(async field => {
                result[field] = await store.get(field);
            })
        );

        if (!transaction) {
            await tx.done;
        }
        return result;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _resetConfigStart = async ({ transaction = null }) => {
    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction([CONFIG_STORE_NAME], READWRITE);
        const store = tx.objectStore(CONFIG_STORE_NAME);

        await Promise.all(
            schemaHelper.config.startFields.map(field => {
                return store.put(0, field);
            })
        );

        if (!transaction) {
            await tx.done;
        }
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _setInitialConfigStart = async ({ transaction = null }) => {
    await _resetConfigStart({ transaction });
};

export {
    _updateConfigStart,
    _setConfigStart,
    _setConfigField,
    _getConfigStart,
    _resetConfigStart,
    _setInitialConfigStart,
};
