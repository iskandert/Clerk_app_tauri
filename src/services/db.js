import { deleteDB, openDB } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { validation } from './schemas';
import errorHelper from './helpers/errorHelper';
import schemaHelper from './helpers/schemaHelper';
import { categoryStatusEnum, categoryTypeEnum } from './constants';
import formatHelper from './helpers/formatHelper';

let db = null;

const DB_NAME = 'clerk-app';
const DB_VERSION = 1;

// const TABLES_STORE_NAME = 'tables';
const CATEGORIES_STORE_NAME = 'categories';
const ACTIONS_STORE_NAME = 'actions';
const PLANS_STORE_NAME = 'plans';
const CHECKS_STORE_NAME = 'checks';
const CONFIG_STORE_NAME = 'config';

const CATEGORY_ID_INDEX = 'category_id';
const DATE_INDEX = 'date';
const DATE_AND_CATEGORY_ID_INDEX = 'date_and_category_id';
const NAME_INDEX = 'name';
const STATUS_INDEX = 'status';
const TYPE_INDEX = 'type';
const IS_ACCOUNTED_INDEX = 'isAccounted';
const IS_ACCOUNTED_STATUS_AND_TYPE_INDEX = 'isAccounted_and_status_and_type';
const STATUS_AND_TYPE_AND_NAME_INDEX = 'status_and_type_and_name';

const READWRITE = 'readwrite';
const READONLY = 'readonly';

const initDB = async () => {
    db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // const tablesVault = db.createObjectStore(TABLES_STORE_NAME, { keyPath: '_id' });
            const categoriesVault = db.createObjectStore(CATEGORIES_STORE_NAME, { keyPath: '_id' });
            const actionsVault = db.createObjectStore(ACTIONS_STORE_NAME, { keyPath: '_id' });
            const plansVault = db.createObjectStore(PLANS_STORE_NAME, { keyPath: '_id' });
            db.createObjectStore(CHECKS_STORE_NAME, { keyPath: 'date' });
            db.createObjectStore(CONFIG_STORE_NAME);

            categoriesVault.createIndex(NAME_INDEX, 'name');
            categoriesVault.createIndex(STATUS_INDEX, 'status');
            categoriesVault.createIndex(TYPE_INDEX, 'type');
            categoriesVault.createIndex(IS_ACCOUNTED_INDEX, '_isAccounted');
            categoriesVault.createIndex(IS_ACCOUNTED_STATUS_AND_TYPE_INDEX, ['_isAccounted', 'status', 'type']);
            categoriesVault.createIndex(STATUS_AND_TYPE_AND_NAME_INDEX, ['status', 'type', 'name']);

            actionsVault.createIndex(CATEGORY_ID_INDEX, 'category_id');
            actionsVault.createIndex(DATE_INDEX, 'date');
            actionsVault.createIndex(DATE_AND_CATEGORY_ID_INDEX, ['date', 'category_id']);

            plansVault.createIndex(CATEGORY_ID_INDEX, 'category_id');
            plansVault.createIndex(DATE_INDEX, 'date');
            plansVault.createIndex(DATE_AND_CATEGORY_ID_INDEX, ['date', 'category_id']);
        },
        blocked() {
            //
        },
        blocking() {
            //
        },
        terminated() {
            //
        },
    });
};

const closeDB = async () => {
    try {
        db.close();
    } catch (error) {
        //
    }
};

const destroyDB = async () => {
    try {
        closeDB();
        await deleteDB(DB_NAME, {
            blocked() {
                //
            },
        });
    } catch (error) {
        //
    }
};

// --------------- ACTIONS -----------------
// API tasks:
// [x] get simple action (by _id)
// [x] set simple action (by data and _id)
// [ ] get array (by dates, filtered by month) of arrays (by _updatedAt) of actions
// [ ] get matrix (of actions or of reduced action sums (empty is 0)) (by category_ids x by months)

const getActions = async ({ date, category_id }) => {
    if (
        (!date && !category_id) ||
        (date && !schemaHelper.action.validator.date(date)) ||
        (category_id && !schemaHelper.action.validator.category_id(category_id))
    ) {
        throw errorHelper.create.validation();
    }

    try {
        if (date && category_id) {
            return await db.getAllFromIndex(ACTIONS_STORE_NAME, DATE_AND_CATEGORY_ID_INDEX, [date, category_id]);
        } else if (date) {
            return await db.getAllFromIndex(ACTIONS_STORE_NAME, DATE_INDEX, date);
        } else {
            return await db.getAllFromIndex(ACTIONS_STORE_NAME, CATEGORY_ID_INDEX, category_id);
        }
    } catch (error) {
        throw errorHelper.create.internal();
    }
};

const getAction = async _id => {
    if (!_id || !schemaHelper.action.validator._id(_id)) {
        throw errorHelper.create.validation();
    }

    try {
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
        throw errorHelper.create.validation();
    }

    try {
        const tx = transaction || db.transaction(db.objectStoreNames, READWRITE);
        const store = tx.objectStore(ACTIONS_STORE_NAME);

        let oldRecord;
        if (_id) {
            oldRecord = await store.get(_id);

            if (!oldRecord) {
                throw errorHelper.create.notFound();
            } else {
                const categoryRecord = await _getCategory({ _id: oldRecord.category_id, transaction: tx });
                throwOnNotEditable(categoryRecord);
            }
        }

        if (oldRecord?.category_id !== data.category_id) {
            const categoryRecord = await _getCategory({ _id: data.category_id, transaction: tx });
            throwOnNotEditable(categoryRecord);
        }

        const record = await _setAction({ data, _id, transaction: tx });
        await _updateDataByAction({ oldAction: oldRecord, newAction: record, transaction: tx });
        return record;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _setAction = async ({ data, _id = null, transaction = null }) => {
    if (!schemaHelper.action.checkEditableFields(data) || (_id && !schemaHelper.action.validator._id(_id))) {
        throw errorHelper.create.validation();
    }

    const record = {};
    schemaHelper.action.editableFields.forEach(field => {
        record[field] = data[field];
    });

    if (_id) {
        record._id = _id;
    } else {
        record._id = uuidv4();
    }
    record._updatedAt = dayjs().format();

    try {
        const tx = transaction || db.transaction([ACTIONS_STORE_NAME], READWRITE);

        await tx.objectStore(ACTIONS_STORE_NAME).put(record);
        if (!transaction) {
            await tx.done;
        }
        return record;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const deleteAction = async _id => {
    if (!_id || !schemaHelper.action.validator._id(_id)) {
        throw errorHelper.create.validation();
    }

    try {
        const tx = transaction || db.transaction(db.objectStoreNames, READWRITE);
        const store = tx.objectStore(ACTIONS_STORE_NAME);

        const record = await store.get(_id);
        if (!record) {
            throw errorHelper.create.notFound();
        } else {
            const categoryRecord = await _getCategory({ _id: record.category_id, transaction: tx });
            throwOnNotEditable(categoryRecord);
        }

        await _deleteAction({ _id, transaction: tx });
        await _updateDataByAction({ oldAction: record, newAction: null, transaction: tx });
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _deleteAction = async ({ _id, transaction = null }) => {
    if (!_id || !schemaHelper.action.validator._id(_id)) {
        throw errorHelper.create.validation();
    }

    try {
        const tx = transaction || db.transaction([ACTIONS_STORE_NAME], READWRITE);
        await tx.objectStore(ACTIONS_STORE_NAME).delete(_id);
        if (!transaction) {
            await tx.done;
        }
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _setUnaccountedAction = async ({ date, sum, status, type, transaction = null }) => {
    if (
        !schemaHelper.action.validator.date(date) ||
        !schemaHelper.action.validator.sum(sum) ||
        !schemaHelper.category.validator.status(status) ||
        !schemaHelper.category.validator.type(type)
    ) {
        throw errorHelper.create.validation();
    }

    try {
        const tx = transaction || db.transaction(db.objectStoreNames, READWRITE);
        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);

        const oppositeStatus =
            status === categoryStatusEnum.EXPENSE ? categoryStatusEnum.INCOME : categoryStatusEnum.EXPENSE;

        const increasingActionCategory = await categoriesStore
            .index(IS_ACCOUNTED_STATUS_AND_TYPE_INDEX)
            .get([false, oppositeStatus, type]);
        const decreasingActionCategory = await categoriesStore
            .index(IS_ACCOUNTED_STATUS_AND_TYPE_INDEX)
            .get([false, status, type]);

        const actionsIndex = tx.objectStore(ACTIONS_STORE_NAME).index(DATE_AND_CATEGORY_ID_INDEX);
        const increasingAction = await actionsIndex.get([date, increasingActionCategory._id]);
        const decreasingAction = await actionsIndex.get([date, decreasingActionCategory._id]);

        if (decreasingAction) {
            if (decreasingAction.sum > sum) {
                const updatedAction = await _setAction({
                    data: {
                        ...decreasingAction,
                        sum: decreasingAction.sum - sum,
                    },
                    _id: decreasingAction._id,
                    transaction: tx,
                });

                await _updatePlanByAction({
                    action: decreasingAction,
                    isDeleted: true,
                    transaction: tx,
                });

                await _updatePlanByAction({
                    action: updatedAction,
                    isDeleted: false,
                    transaction: tx,
                });

                if (!transaction) {
                    await tx.done;
                }
                return updatedAction;
            } else {
                await _deleteAction({
                    _id: decreasingAction._id,
                    transaction: tx,
                });

                await _updatePlanByAction({
                    action: decreasingAction,
                    isDeleted: true,
                    transaction: tx,
                });

                sum -= decreasingAction.sum;

                if (!sum) {
                    if (!transaction) {
                        await tx.done;
                    }
                    return null;
                }
            }
        }

        if (increasingAction) {
            const updatedAction = await _setAction({
                data: {
                    ...increasingAction,
                    sum: increasingAction.sum + sum,
                },
                _id: increasingAction._id,
                transaction: tx,
            });

            await _updatePlanByAction({
                action: increasingAction,
                isDeleted: true,
                transaction: tx,
            });

            await _updatePlanByAction({
                action: updatedAction,
                isDeleted: false,
                transaction: tx,
            });

            if (!transaction) {
                await tx.done;
            }
            return updatedAction;
        } else {
            const newAction = await _setAction({
                data: {
                    category_id: increasingActionCategory._id,
                    sum,
                    date,
                    comment: null,
                },
                transaction: tx,
            });

            await _updatePlanByAction({
                action: newAction,
                isDeleted: false,
                transaction: tx,
            });

            if (!transaction) {
                await tx.done;
            }
            return newAction;
        }
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _updateUnaccountedByAction = async ({ action, isDeleted = false, transaction = null }) => {
    if (!schemaHelper.action.checkEditableFields(action)) {
        throw errorHelper.create.validation();
    }

    try {
        const tx = transaction || db.transaction(db.objectStoreNames, READWRITE);

        const nextCheck = await _getCheckNext({
            date: action.date,
            transaction: tx,
            isIncludeNow: true,
        });
        const prevCheck = await _getCheckPrev({
            date: action.date,
            transaction: tx,
        });
        if (!nextCheck || !prevCheck) return null;

        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);
        const category = await categoriesStore.get(action.category_id);
        if (!category) return null;

        const oppositeStatus =
            action.status === categoryStatusEnum.EXPENSE ? categoryStatusEnum.INCOME : categoryStatusEnum.EXPENSE;

        const result = await _setUnaccountedAction({
            date: nextCheck.date,
            sum: action.sum,
            status: isDeleted ? oppositeStatus : action.status,
            type: category.type,
            transaction: tx,
        });

        if (!transaction) {
            await tx.done;
        }
        return result;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _deleteUnaccountedByDate = async ({ date, transaction = null }) => {
    if (!schemaHelper.action.validator.date(date)) {
        throw errorHelper.create.validation();
    }

    try {
        const tx = transaction || db.transaction(db.objectStoreNames, READWRITE);

        const actionsStore = tx.objectStore(ACTIONS_STORE_NAME);
        const actionsDateIndex = actionsStore.index(DATE_INDEX);

        const unaccountedCategories = await _getUnaccountedCategories({ transaction: tx });
        const unaccountedCategoryIds = unaccountedCategories.map(({ _id }) => _id);
        const unaccountedActions = (await actionsDateIndex.getAll(date)).filter(({ _id }) => {
            return unaccountedCategoryIds.includes(_id);
        });

        for (action of unaccountedActions) {
            await _deleteAction({
                _id: action._id,
                transaction: tx,
            });

            await _updatePlanByAction({
                action,
                isDeleted: true,
                transaction: tx,
            });
        }

        if (!transaction) {
            await tx.done;
        }
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _updateUnaccountedByDate = async ({ date, transaction = null }) => {
    if (!schemaHelper.action.validator.date(date)) {
        throw errorHelper.create.validation();
    }

    try {
        const tx = transaction || db.transaction(db.objectStoreNames, READWRITE);

        const actionsStore = tx.objectStore(ACTIONS_STORE_NAME);
        const actionsDateIndex = actionsStore.index(DATE_INDEX);
        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);
        const categories = await categoriesStore.getAll();
        const categoriesByIds = categories.reduce((acc, curr) => {
            acc[curr._id] = curr;
            return acc;
        }, {});

        await _deleteUnaccountedByDate({ date, transaction: tx });

        const nextCheck = await _getCheckNext({ date, transaction: tx, isIncludeNow: true });
        const prevCheck = await _getCheckPrev({ date, transaction: tx });

        if (!nextCheck || !prevCheck) {
            if (!transaction) {
                await tx.done;
            }
            return null;
        }

        const actions = await actionsDateIndex.getAll(IDBKeyRange.bound(prevCheck.date, nextCheck.date, true, false));
        const calculatedBalanceSum = prevCheck.balance_sum;
        const calculatedSavingsSum = prevCheck.savings_sum;

        actions.forEach(({ category_id, sum }) => {
            const { status, type } = categoriesByIds[category_id];

            if (status === categoryStatusEnum.EXPENSE) {
                calculatedBalanceSum -= sum;
                if (type === categoryTypeEnum.SAVINGS) {
                    calculatedSavingsSum += sum;
                }
            } else if (status === categoryStatusEnum.INCOME) {
                calculatedBalanceSum += sum;
                if (type === categoryTypeEnum.SAVINGS) {
                    calculatedSavingsSum -= sum;
                }
            }
        });

        const balanceDiff = calculatedBalanceSum - nextCheck.balance_sum;
        const savingsDiff = calculatedSavingsSum - nextCheck.savings_sum;

        if (balanceDiff !== 0) {
            await _setUnaccountedAction({
                date: nextCheck.date,
                sum: Math.abs(balanceDiff),
                status: balanceDiff > 0 ? categoryStatusEnum.INCOME : categoryStatusEnum.EXPENSE,
                type: categoryTypeEnum.DEFAULT,
                transaction: tx,
            });
        }
        if (savingsDiff !== 0) {
            await _setUnaccountedAction({
                date: nextCheck.date,
                sum: Math.abs(savingsDiff),
                status: savingsDiff > 0 ? categoryStatusEnum.EXPENSE : categoryStatusEnum.INCOME,
                type: categoryTypeEnum.SAVINGS,
                transaction: tx,
            });
        }

        if (!transaction) {
            await tx.done;
        }
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

// --------------- PLANS -----------------
// API tasks:
// [x] get simple plan (by _id)
// [x] set simple plan (by data and _id) (after check _isEditable)
// [ ] get matrix (of plans (empty is {sum: 0})) (by category_ids x by months)
// [ ] get total sums (by months)
// [x] update plan by new action
// [x] update unaccounted actions

const _getPlans = async ({ date, category_id, transaction = null }) => {
    if (
        (!date && !category_id) ||
        (date && !schemaHelper.plan.validator.date(date)) ||
        (category_id && !schemaHelper.plan.validator.category_id(category_id))
    ) {
        throw errorHelper.create.validation();
    }

    try {
        const tx = transaction || db.transaction([PLANS_STORE_NAME], READONLY);
        const store = tx.objectStore(PLANS_STORE_NAME);

        if (date && category_id) {
            return await store.index(DATE_AND_CATEGORY_ID_INDEX).getAll([date, category_id]);
        } else if (date) {
            return await store.index(DATE_INDEX).getAll(date);
        } else {
            return await store.index(CATEGORY_ID_INDEX).getAll(category_id);
        }
    } catch (error) {
        throw errorHelper.create.internal();
    }
};

const getPlan = async _id => {
    if (!_id || !schemaHelper.plan.validator._id(_id)) {
        throw errorHelper.create.validation();
    }

    try {
        const record = await db.get(PLANS_STORE_NAME, _id);
        if (!record) {
            throw errorHelper.create.notFound();
        }
        return record;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const setPlan = async (data, _id = null) => {
    if (!schemaHelper.plan.checkEditableFields(data) || (_id && !schemaHelper.plan.validator._id(_id))) {
        throw errorHelper.create.validation();
    }

    try {
        const tx = transaction || db.transaction([PLANS_STORE_NAME, CATEGORIES_STORE_NAME], READWRITE);
        const store = tx.objectStore(PLANS_STORE_NAME);

        let oldRecord;
        if (_id) {
            oldRecord = await store.get(_id);
            if (!oldRecord) {
                throw errorHelper.create.notFound();
            } else {
                const categoryRecord = await _getCategory({ _id: oldRecord.category_id, transaction: tx });
                throwOnNotEditable(categoryRecord);
            }
        }
        if (oldRecord?.category_id !== data.category_id) {
            const categoryRecord = await _getCategory({ _id: data.category_id, transaction: tx });
            throwOnNotEditable(categoryRecord);
        }

        const record = await _setPlan({ data, _id, transaction: tx });
        return record;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _setPlan = async ({ data, _id = null, transaction = null }) => {
    if (!schemaHelper.plan.checkEditableFields(data) || (_id && !schemaHelper.plan.validator._id(_id))) {
        throw errorHelper.create.validation();
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
    record._updatedAt = dayjs().format();

    try {
        const tx = transaction || db.transaction([PLANS_STORE_NAME], READWRITE);

        await tx.objectStore(PLANS_STORE_NAME).put(record);
        if (!transaction) {
            await tx.done;
        }
        return record;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const deletePlan = async _id => {
    if (!_id || !schemaHelper.plan.validator._id(_id)) {
        throw errorHelper.create.validation();
    }

    try {
        const tx = transaction || db.transaction([PLANS_STORE_NAME, CATEGORIES_STORE_NAME], READWRITE);
        const store = tx.objectStore(PLANS_STORE_NAME);

        const record = await store.get(_id);
        if (!record) {
            throw errorHelper.create.notFound();
        } else {
            const categoryRecord = await _getCategory({ _id: record.category_id, transaction: tx });
            throwOnNotEditable(categoryRecord);

            if (record.date < formatHelper.getISOYearMonthString()) {
                throw errorHelper.create.validation();
            }
        }

        await _deletePlan({ _id, transaction: tx });
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _deletePlan = async ({ _id, transaction = null }) => {
    if (!_id || !schemaHelper.plan.validator._id(_id)) {
        throw errorHelper.create.validation();
    }

    try {
        const tx = transaction || db.transaction([PLANS_STORE_NAME], READWRITE);
        await tx.objectStore(PLANS_STORE_NAME).delete(_id);
        if (!transaction) {
            await tx.done;
        }
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const _updateDataByAction = async ({ newAction = null, oldAction = null, transaction = null }) => {
    if (
        (!newAction && !oldAction) ||
        !(schemaHelper.action.checkEditableFields(newAction) || schemaHelper.action.checkEditableFields(oldAction))
    ) {
        throw errorHelper.create.validation();
    }

    try {
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

const _updatePlanByAction = async ({ action, isDeleted, transaction = null }) => {
    if (schemaHelper.action.checkEditableFields(action)) {
        throw errorHelper.create.validation();
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
        errorHelper.throwCustomOrInternal(error);
    }
};

// --------------- CATEGORIES -----------------
// API tasks:
// [x] get simple category (by _id)
// [-] set simple category (by data and _id) (after check _isEditable)
// [ ] get object (keys are all combinations of status and type) with arrays (each filtered by key) of categories
// [ ] create unaccounted plans' categories

const getCategories = async ({ status, type, name }) => {
    const simpleIndexParamsCount = 1;
    const complexIndexParamsCount = 3;
    if (
        ![simpleIndexParamsCount, complexIndexParamsCount].includes(!!status + !!type + !!name) ||
        (status && !schemaHelper.category.validator.status(status)) ||
        (type && !schemaHelper.category.validator.type(type)) ||
        (name && !schemaHelper.category.validator.name(name))
    ) {
        throw errorHelper.create.validation();
    }

    try {
        if (status && type && name) {
            return await db.getAllFromIndex(CATEGORIES_STORE_NAME, STATUS_AND_TYPE_AND_NAME_INDEX, [
                status,
                type,
                name,
            ]);
        } else if (status) {
            return await db.getAllFromIndex(CATEGORIES_STORE_NAME, STATUS_INDEX, status);
        } else if (type) {
            return await db.getAllFromIndex(CATEGORIES_STORE_NAME, TYPE_INDEX, type);
        } else {
            return await db.getAllFromIndex(CATEGORIES_STORE_NAME, NAME_INDEX, name);
        }
    } catch (error) {
        throw errorHelper.create.internal();
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

const _getUnaccountedCategories = async ({ transaction = null }) => {
    try {
        const tx = transaction || db.transaction([CATEGORIES_STORE_NAME], READONLY);
        const categoriesAccountedIndex = tx.objectStore(CATEGORIES_STORE_NAME).index(IS_ACCOUNTED_INDEX);

        const result = await categoriesAccountedIndex.getAll(false);

        if (!transaction) {
            await tx.done;
        }
        return result;
    } catch (error) {}
};

const _getCategory = async ({ _id, transaction = null }) => {
    if (!_id || !schemaHelper.category.validator._id(_id)) {
        throw errorHelper.create.validation();
    }

    try {
        const tx = transaction || db.transaction([CATEGORIES_STORE_NAME], READWRITE);
        const record = await tx.objectStore(CATEGORIES_STORE_NAME).get(_id);

        if (!transaction) {
            await tx.done;
        }
        return record || null;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const setCategory = async (data, _id = null) => {
    if (!schemaHelper.category.checkEditableFields(data) || (_id && !schemaHelper.category.validator._id(_id))) {
        throw errorHelper.create.validation();
    }

    try {
        const tx = transaction || db.transaction([CATEGORIES_STORE_NAME], READWRITE);

        if (_id) {
            const oldRecord = await tx.store.get(_id);

            if (!oldRecord) {
                throw errorHelper.create.notFound();
            } else {
                throwOnNotEditable(oldRecord);
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

const _setCategory = async ({ data, _id = null, _isAccounted = true, transaction = null }) => {
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
    record._updatedAt = dayjs().format();

    try {
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

// TODO temporally denied category deleting
// const deleteCategory = async _id => {
//     if (!_id || !schemaHelper.category.validator._id(_id)) {
//         throw errorHelper.create.validation();
//     }

//     try {
//         const tx = transaction || db.transaction([CATEGORIES_STORE_NAME], READWRITE);

//         const record = await tx.store.get(_id);
//         if (!record) {
//             throw errorHelper.create.notFound();
//         } else {
//             throwOnNotEditable(record);
//         }

//         await _deleteCategory({ _id, transaction: tx });
//         await tx.done;
//         // TODO update unaccounted actions
//         // TODO reassign plans and actions
//     } catch (error) {
//         errorHelper.throwCustomOrInternal(error);
//     }
// };

// const _deleteCategory = async ({ _id, transaction = null }) => {
//     if (!_id || !schemaHelper.category.validator._id(_id)) {
//         throw errorHelper.create.validation();
//     }

//     try {
//         const tx = transaction || db.transaction([CATEGORIES_STORE_NAME], READWRITE);
//         await tx.objectStore(CATEGORIES_STORE_NAME).delete(_id);
//         if (!transaction) {
//             await tx.done;
//         }
//     } catch (error) {
//         errorHelper.throwCustomOrInternal(error);
//     }
// };

const throwOnNotEditable = record => {
    if (!record._isEditable) {
        throw errorHelper.create.validation();
    }
};

// --------------- CHECKS -----------------
// API tasks:
// [x] get prev check
// [x] get all checks
// [x] delete check
// [x] set simple check (by data)

const _getCheckFirst = async ({ transaction }) => {
    try {
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

const _getCheckLast = async ({ transaction }) => {
    try {
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

const getChecks = async () => {
    try {
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

const _getCheck = async ({ date, transaction = null }) => {
    if (!date || !schemaHelper.check.validator.date(date)) {
        throw errorHelper.create.validation();
    }

    try {
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

const _getCheckNext = async ({ date, transaction = null, isIncludeNow = false }) => {
    if (!date || !schemaHelper.check.validator.date(date)) {
        throw errorHelper.create.validation();
    }

    try {
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

const _getCheckPrev = async ({ date, transaction }) => {
    if (!date || !schemaHelper.check.validator.date(date)) {
        throw errorHelper.create.validation();
    }

    try {
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

const setCheck = async data => {
    if (!schemaHelper.check.checkEditableFields(data)) {
        throw errorHelper.create.validation();
    }

    try {
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

const _setCheck = async ({ data, transaction = null }) => {
    if (!schemaHelper.check.checkEditableFields(data)) {
        throw errorHelper.create.validation();
    }

    const record = {};
    schemaHelper.check.editableFields.forEach(field => {
        record[field] = data[field];
    });

    record._updatedAt = dayjs().format();

    try {
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

const deleteCheck = async date => {
    if (!date || !schemaHelper.check.validator.date(date)) {
        throw errorHelper.create.validation();
    }

    try {
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

const _deleteCheck = async ({ date, transaction = null }) => {
    if (!date || !schemaHelper.check.validator.date(date)) {
        throw errorHelper.create.validation();
    }

    try {
        const tx = transaction || db.transaction([CHECKS_STORE_NAME], READWRITE);
        await tx.objectStore(CHECKS_STORE_NAME).delete(date);
        if (!transaction) {
            await tx.done;
        }
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

// --------------- CONFIG -----------------
// API tasks:
// [x] set start
// [x] get start
// [x] delete start

const _updateConfigStart = async ({ firstCheck, transaction = null }) => {
    if (!schemaHelper.check.checkEditableFields(firstCheck)) {
        throw errorHelper.create.validation();
    }

    try {
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
            start_balance_sum: firstCheck.balance_sum,
            start_savings_sum: firstCheck.savings_sum,
        };

        prevActions.forEach(({ category_id, sum }) => {
            const { status, type } = categoriesByIds[category_id];

            if (status === categoryStatusEnum.EXPENSE) {
                data.start_balance_sum += sum;
                if (type === categoryTypeEnum.SAVINGS) {
                    data.start_savings_sum -= sum;
                }
            } else if (status === categoryStatusEnum.INCOME) {
                data.start_balance_sum -= sum;
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

const _getConfigStart = async ({ transaction = null }) => {
    try {
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

// TODO
// unaccounted logic
// other complex methods
// logic for first-time checking
// logic for data parsing
// logic for data saving

// TODO
// private (this) and user methods (in separate file)

export default {
    initDB,
    closeDB,
    destroyDB,
};
