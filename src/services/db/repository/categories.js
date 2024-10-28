import dayjs from 'dayjs';
import { categoryStatusEnum, categoryTypeEnum } from '../../constants';
import errorHelper from '../../helpers/errorHelper';
import schemaHelper from '../../helpers/schemaHelper';
import { getDBInstanse } from '../instance';
import { v4 as uuidv4 } from 'uuid';
import { categoryAccountedNames, categoryUnaccountedNames } from '../config';

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

const _getCategory = async ({ _id, transaction = null }) => {
    if (!_id || !schemaHelper.category.validator._id(_id)) {
        throw errorHelper.create.validation();
    }

    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction([CATEGORIES_STORE_NAME], READONLY);
        const record = await tx.objectStore(CATEGORIES_STORE_NAME).get(_id);

        if (!transaction) {
            await tx.done;
        }
        return record || null;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _setCategory = async ({ data, _id = null, _isAccounted = true, needUpdateTime = true, transaction = null }) => {
    if (!schemaHelper.category.checkEditableFields(data) || (_id && !schemaHelper.category.validator._id(_id))) {
        throw errorHelper.create.validation();
    }

    const record = { _isAccounted };
    schemaHelper.category.editableFields.forEach(field => {
        record[field] = data[field];
    });

    if (_id) {
        record._id = _id;
    } else {
        record._id = uuidv4();
    }
    if (record._isAccounted) {
        record._isEditable = true;
    } else {
        record._isEditable = false;
    }
    if (needUpdateTime || !data._updatedAt) {
        record._updatedAt = dayjs().format();
    } else if (dayjs(data._updatedAt).format() === data._updatedAt) {
        record._updatedAt = data._updatedAt;
    } else {
        throw errorHelper.create.validation();
    }

    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction([CATEGORIES_STORE_NAME], READWRITE);
        await tx.objectStore(CATEGORIES_STORE_NAME).put(record);
        if (!transaction) {
            await tx.done;
        }
        return record;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _setInitialCategories = async ({ transaction = null }) => {
    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction([CATEGORIES_STORE_NAME], READWRITE);
        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);

        let categories = await categoriesStore.getAll();
        if (categories.length) {
            throw errorHelper.create.validation();
        }

        const accountedNames = categoryAccountedNames;
        const unaccountedNames = categoryUnaccountedNames;

        const accountedData = [];
        const unaccountedData = [];
        for (const status in accountedNames) {
            for (const type in accountedNames[status]) {
                for (const name of accountedNames[status][type]) {
                    accountedData.push({
                        status,
                        type,
                        name,
                    });
                }
                unaccountedData.push({
                    status,
                    type,
                    name: unaccountedNames[status][type],
                });
            }
        }

        await Promise.all(
            [
                ...accountedData.map(data => ({ data, _isAccounted: true })),
                ...unaccountedData.map(data => ({ data, _isAccounted: false })),
            ].map(async settings => {
                await _setCategory({ ...settings, transaction: tx });
            })
        );

        if (!transaction) {
            await tx.done;
        }
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

// TODO temporally denied category deleting

// const _deleteCategory = async ({ _id, transaction = null }) => {
//     if (!_id || !schemaHelper.category.validator._id(_id)) {
//         throw errorHelper.create.validation();
//     }

//     try {
//         const db = getDBInstanse();
//         const tx = transaction || db.transaction([CATEGORIES_STORE_NAME], READWRITE);
//         await tx.objectStore(CATEGORIES_STORE_NAME).delete(_id);
//         if (!transaction) {
//             await tx.done;
//         }
//     } catch (error) {
//         errorHelper.throwCustomOrInternal(error);
//     }
// };

export {
    _getCategory,
    _setCategory,
    _setInitialCategories,
    // _deleteCategory,
};