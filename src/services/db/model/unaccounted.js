import dayjs from 'dayjs';
import errorHelper from '../../helpers/errorHelper';
import formatHelper from '../../helpers/formatHelper';
import schemaHelper from '../../helpers/schemaHelper';
import { dbIndexEnum, dbModeEnum, dbStoreEnum } from '../config';
import { getDBInstanse } from '../instance';
import { v4 as uuidv4 } from 'uuid';
import { categoryStatusEnum, categoryTypeEnum } from '../../constants';
import { _deleteAction, _setAction } from '../repository/actions';
import { _updatePlanByAction } from '../repository/plans';
import { _getCheckNext, _getCheckPrev } from '../repository/checks';

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

const _setUnaccountedAction = async ({ date, sum, status, type, transaction = null }) => {
    if (
        !schemaHelper.action.validator.date(date) ||
        !schemaHelper.action.validator.sum(sum) ||
        !schemaHelper.category.validator.status(status) ||
        !schemaHelper.category.validator.type(type)
    ) {
        throw errorHelper.create.validation('_setUnaccountedAction', { date, sum, status, type });
    }

    let tx = transaction;
    try {
        const db = getDBInstanse();
        tx ||= db.transaction(db.objectStoreNames, READWRITE);
        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);

        const oppositeStatus =
            status === categoryStatusEnum.EXPENSE ? categoryStatusEnum.INCOME : categoryStatusEnum.EXPENSE;

        const increasingActionCategory = await categoriesStore
            .index(IS_ACCOUNTED_AND_STATUS_AND_TYPE_INDEX)
            .get([0, status, type]);
        const decreasingActionCategory = await categoriesStore
            .index(IS_ACCOUNTED_AND_STATUS_AND_TYPE_INDEX)
            .get([0, oppositeStatus, type]);

        const actionsIndex = tx.objectStore(ACTIONS_STORE_NAME).index(CATEGORY_ID_AND_DATE_INDEX);
        const increasingAction = await actionsIndex.get([increasingActionCategory._id, date]);
        const decreasingAction = await actionsIndex.get([decreasingActionCategory._id, date]);

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
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const _updateUnaccountedByAction = async ({ action, isDeleted = false, transaction = null }) => {
    if (!schemaHelper.action.checkEditableFields(action)) {
        throw errorHelper.create.validation('_updateUnaccountedByAction', { action, isDeleted });
    }

    let tx = transaction;
    try {
        const db = getDBInstanse();
        tx ||= db.transaction(db.objectStoreNames, READWRITE);

        const nextCheck = await _getCheckNext({
            date: action.date,
            transaction: tx,
            isIncludeNow: true,
        });
        const prevCheck = await _getCheckPrev({
            date: action.date,
            transaction: tx,
        });
        if (!nextCheck || !prevCheck) {
            return null;
        }

        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);
        const category = await categoriesStore.get(action.category_id);
        if (!category) return null;

        const oppositeStatus =
            category.status === categoryStatusEnum.EXPENSE ? categoryStatusEnum.INCOME : categoryStatusEnum.EXPENSE;

        const result = await _setUnaccountedAction({
            date: nextCheck.date,
            sum: action.sum,
            status: !isDeleted ? oppositeStatus : category.status,
            type: category.type,
            transaction: tx,
        });

        if (!transaction) {
            await tx.done;
        }
        return result;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const _deleteUnaccountedByDate = async ({ date, transaction = null }) => {
    if (!schemaHelper.action.validator.date(date)) {
        throw errorHelper.create.validation('_deleteUnaccountedByDate', { date });
    }

    let tx = transaction;
    try {
        const db = getDBInstanse();
        tx ||= db.transaction(db.objectStoreNames, READWRITE);

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
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const _updateUnaccountedByDate = async ({ date, transaction = null }) => {
    if (!schemaHelper.action.validator.date(date)) {
        throw errorHelper.create.validation('_updateUnaccountedByDate', { date });
    }

    let tx = transaction;
    try {
        const db = getDBInstanse();
        tx ||= db.transaction(db.objectStoreNames, READWRITE);

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
        let calculatedDefaultSum = prevCheck.default_sum;
        let calculatedSavingsSum = prevCheck.savings_sum;

        actions.forEach(({ category_id, sum }) => {
            const { status, type } = categoriesByIds[category_id];

            if (status === categoryStatusEnum.EXPENSE) {
                calculatedDefaultSum -= sum;
                if (type === categoryTypeEnum.SAVINGS) {
                    calculatedSavingsSum += sum;
                }
            } else if (status === categoryStatusEnum.INCOME) {
                calculatedDefaultSum += sum;
                if (type === categoryTypeEnum.SAVINGS) {
                    calculatedSavingsSum -= sum;
                }
            }
        });

        const savingsDiff = calculatedSavingsSum - nextCheck.savings_sum;
        const defaultDiff = calculatedDefaultSum - nextCheck.default_sum + savingsDiff;

        if (savingsDiff !== 0) {
            await _setUnaccountedAction({
                date: nextCheck.date,
                sum: Math.abs(savingsDiff),
                status: savingsDiff > 0 ? categoryStatusEnum.EXPENSE : categoryStatusEnum.INCOME,
                type: categoryTypeEnum.SAVINGS,
                transaction: tx,
            });
        }
        if (defaultDiff !== 0) {
            await _setUnaccountedAction({
                date: nextCheck.date,
                sum: Math.abs(defaultDiff),
                status: defaultDiff > 0 ? categoryStatusEnum.INCOME : categoryStatusEnum.EXPENSE,
                type: categoryTypeEnum.DEFAULT,
                transaction: tx,
            });
        }

        if (!transaction) {
            await tx.done;
        }
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const _getUnaccountedCategories = async ({ transaction = null }) => {
    let tx = transaction;
    try {
        const db = getDBInstanse();
        tx ||= db.transaction([CATEGORIES_STORE_NAME], READONLY);
        const categoriesAccountedIndex = tx.objectStore(CATEGORIES_STORE_NAME).index(IS_ACCOUNTED_INDEX);

        const result = await categoriesAccountedIndex.getAll(0);

        if (!transaction) {
            await tx.done;
        }
        return result;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

export {
    _setAction,
    _deleteAction,
    _setUnaccountedAction,
    _updateUnaccountedByAction,
    _deleteUnaccountedByDate,
    _updateUnaccountedByDate,
};
