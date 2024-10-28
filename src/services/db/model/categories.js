import { categoryStatusEnum, categoryTypeEnum } from '../../constants';
import errorHelper from '../../helpers/errorHelper';
import schemaHelper from '../../helpers/schemaHelper';
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

const getCategoriesList = async () => {
    try {
        const db = getDBInstanse();
        const tx = db.transaction([CATEGORIES_STORE_NAME], READONLY);
        const categoriesIndex = tx.objectStore(CATEGORIES_STORE_NAME).index(STATUS_AND_TYPE_INDEX);

        const result = {};
        for (const status of Object.values(categoryStatusEnum)) {
            result[status] = {};
            for (const type of Object.values(categoryTypeEnum)) {
                const categories = await categoriesIndex.getAll([status, type]);
                result[status][type] = categories.sort((categA, categB) => categA.name.localeCompare(categB.name));
            }
        }

        await tx.done;
        return result;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const getCategory = async _id => {
    if (!_id || !schemaHelper.category.validator._id(_id)) {
        throw errorHelper.create.validation();
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

const setCategory = async (data, _id = null) => {
    if (!schemaHelper.category.checkEditableFields(data) || (_id && !schemaHelper.category.validator._id(_id))) {
        throw errorHelper.create.validation();
    }

    try {
        const db = getDBInstanse();
        const tx = transaction || db.transaction([CATEGORIES_STORE_NAME], READWRITE);

        if (_id) {
            const oldRecord = await tx.store.get(_id);

            if (!oldRecord) {
                throw errorHelper.create.notFound();
            } else {
                errorHelper.throwOnNotEditable(oldRecord);
                // TODO temporally denied change status or type
                // TODO when enable, update unaccounted actions
                if (oldRecord.status !== data.status || oldRecord.type !== data.type) {
                    throw errorHelper.create.validation();
                }
            }
        }

        await _setCategory({
            data,
            _id,
            transaction: tx,
        });

        await tx.done();
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

// TODO temporally denied category deleting
// const deleteCategory = async _id => {
//     if (!_id || !schemaHelper.category.validator._id(_id)) {
//         throw errorHelper.create.validation();
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
    getCategoriesList,
    getCategory,
    setCategory,
    // deleteCategory,
};
