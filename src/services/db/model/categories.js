import { categoryStatusEnum, categoryTypeEnum } from '../../constants';
import errorHelper from '../../helpers/errorHelper';
import schemaHelper from '../../helpers/schemaHelper';
import { dbIndexEnum, dbModeEnum, dbSettings, dbStoreEnum } from '../config';
import { getDBInstanse } from '../instance';
import { _getCategory, _setCategory } from '../repository/categories';

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

const getCategoriesByGroups = async () => {
    let tx;
    try {
        const db = getDBInstanse();
        tx = db.transaction([CATEGORIES_STORE_NAME], READONLY);
        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);
        const categoriesIndex = categoriesStore.index(IS_ACCOUNTED_AND_STATUS_AND_TYPE_INDEX);

        const result = {};
        for (const status of Object.values(categoryStatusEnum)) {
            result[status] = {};
            for (const type of Object.values(categoryTypeEnum)) {
                const categories = await categoriesIndex.getAll([1, status, type]);
                const unaccountedCategories = await categoriesIndex.getAll([0, status, type]);
                result[status][type] = [
                    ...categories.sort((categA, categB) => categA.name.localeCompare(categB.name)),
                    ...unaccountedCategories.sort((categA, categB) => categA.name.localeCompare(categB.name)),
                ];
            }
        }

        await tx.done;
        return result;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const getCategoriesList = async () => {
    let tx;
    try {
        const db = getDBInstanse();
        tx = db.transaction([CATEGORIES_STORE_NAME], READONLY);
        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);

        const records = await categoriesStore.getAll();
        await tx.done;
        return records;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const getCategory = async _id => {
    if (!_id || !schemaHelper.category.validator._id(_id)) {
        throw errorHelper.create.validation('getCategory', { _id });
    }

    try {
        const record = await _getCategory({ _id });
        if (!record) {
            throw errorHelper.create.notFound();
        }
        return record;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const getIsEmptyCategory = async _id => {
    if (!_id || !schemaHelper.category.validator._id(_id)) {
        throw errorHelper.create.validation('getIsEmptyCategory', { _id });
    }

    let tx;

    try {
        const db = getDBInstanse();
        tx = db.transaction([ACTIONS_STORE_NAME, PLANS_STORE_NAME], READONLY);

        const actionsStore = tx.objectStore(ACTIONS_STORE_NAME);
        const plansStore = tx.objectStore(PLANS_STORE_NAME);

        const actions = await actionsStore.getAll();
        const plans = await plansStore.getAll();

        const count = [...actions, ...plans].filter(({ category_id }) => category_id === _id).length;

        return !count;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const setCategory = async (data, _id = null) => {
    if (!schemaHelper.category.checkEditableFields(data) || (_id && !schemaHelper.category.validator._id(_id))) {
        throw errorHelper.create.validation('setCategory', { data, _id });
    }

    let tx;
    try {
        const db = getDBInstanse();
        tx = db.transaction([CATEGORIES_STORE_NAME], READWRITE);

        if (_id) {
            const oldRecord = await tx.store.get(_id);

            if (!oldRecord) {
                throw errorHelper.create.notFound();
            } else {
                errorHelper.throwOnNotEditable(oldRecord);
                // TODO temporally denied change status or type
                // TODO when enable, update unaccounted actions
                if (oldRecord.status !== data.status || oldRecord.type !== data.type) {
                    throw errorHelper.create.validation('setCategory oldRecord', { oldRecord, data });
                }
            }
        }

        await _setCategory({
            data,
            _id,
            transaction: tx,
        });

        await tx.done;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

// TODO temporally denied category deleting
// const deleteCategory = async _id => {
//     if (!_id || !schemaHelper.category.validator._id(_id)) {
//         throw errorHelper.create.validation('deleteCategory',{ _id});
//     }

//     try {
//         const db = getDBInstanse();
//         const tx = transaction || db.transaction([CATEGORIES_STORE_NAME], READWRITE);

//         const record = await tx.store.get(_id);
//         if (!record) {
//             throw errorHelper.create.notFound();
//         } else {
//             errorHelper.throwOnNotEditable(record);
//         }

//         await _deleteCategory({ _id, transaction: tx });
//         await tx.done;
//         // TODO update unaccounted actions
//         // TODO reassign plans and actions
//     } catch (error) {
//         errorHelper.throwCustomOrInternal(error);
//     }
// };

export {
    getCategoriesByGroups,
    getCategoriesList,
    getCategory,
    setCategory,
    getIsEmptyCategory,
    // deleteCategory,
};
