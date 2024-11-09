import dayjs from 'dayjs';
import errorHelper from '../../helpers/errorHelper';
import formatHelper from '../../helpers/formatHelper';
import schemaHelper from '../../helpers/schemaHelper';
import { dbIndexEnum, dbModeEnum, dbStoreEnum } from '../config';
import { getDBInstanse } from '../instance';
import { v4 as uuidv4 } from 'uuid';
import { categoryStatusEnum } from '../../constants';
import { _deletePlan, _getPlans, _setPlan } from '../repository/plans';
import { _getCategory } from '../repository/categories';
import typeHelper from '../../helpers/typeHelper';

const {
    //
    CATEGORIES_STORE_NAME,
    ACTIONS_STORE_NAME,
    PLANS_STORE_NAME,
} = dbStoreEnum;

const {
    //
    DATE_INDEX,
    CATEGORY_ID_AND_DATE_INDEX,
} = dbIndexEnum;

const { READONLY, READWRITE } = dbModeEnum;

const getPlan = async _id => {
    if (!_id || !schemaHelper.plan.validator._id(_id)) {
        throw errorHelper.create.validation('getPlan', { _id });
    }

    try {
        const db = getDBInstanse();
        const record = await db.get(PLANS_STORE_NAME, _id);
        if (!record) {
            throw errorHelper.create.notFound();
        }
        return record;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const setPlan = async (data, _id = null, transaction = null) => {
    if (
        !schemaHelper.plan.checkEditableFields(data) ||
        (_id && !schemaHelper.plan.validator._id(_id)) ||
        formatHelper.getISOYearMonthString() > data.date
    ) {
        throw errorHelper.create.validation('setPlan', { data, _id });
    }

    let tx = transaction;
    try {
        const db = getDBInstanse();
        tx ||= db.transaction([PLANS_STORE_NAME, CATEGORIES_STORE_NAME], READWRITE);
        const store = tx.objectStore(PLANS_STORE_NAME);

        let oldRecord;
        if (_id) {
            oldRecord = await store.get(_id);
            if (!oldRecord) {
                throw errorHelper.create.notFound();
            } else if (!schemaHelper.plan.validator.date(oldRecord.date)) {
                throw errorHelper.create.validation('setPlan oldRecord', { oldRecord });
            } else {
                const categoryRecord = await _getCategory({ _id: oldRecord.category_id, transaction: tx });
                errorHelper.throwOnNotEditable(categoryRecord);
            }
        }
        if (oldRecord?.category_id !== data.category_id) {
            const categoryRecord = await _getCategory({ _id: data.category_id, transaction: tx });
            errorHelper.throwOnNotEditable(categoryRecord);
        }

        const record = await _setPlan({ data, _id, transaction: tx });
        if (!transaction) {
            await tx.done;
        }
        return record;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const setSamePlans = async (data = null, _id = null, endDate, transaction = null) => {
    if (
        !schemaHelper.plan.validator.date(endDate) ||
        (!data && !_id) ||
        (data && !schemaHelper.plan.checkEditableFields(data)) ||
        (_id && !schemaHelper.plan.validator._id(_id))
    ) {
        throw errorHelper.create.validation('setSamePlans', { data, _id, endDate });
    }

    let tx = transaction;
    try {
        const db = getDBInstanse();
        tx ||= db.transaction([PLANS_STORE_NAME, CATEGORIES_STORE_NAME], READWRITE);

        let record;
        if (data) {
            record = await setPlan(data, _id, tx);
        } else {
            record = await getPlan(_id);
        }

        if (formatHelper.getISOYearMonthString() > record.date || record.date >= endDate) {
            throw errorHelper.create.validation('setSamePlans date', { record, endDate });
        }

        const dates = [];
        let currentDate = dayjs(record.date);
        do {
            currentDate = currentDate.add(1, 'month');
            dates.push(formatHelper.getISOYearMonthString(currentDate));
        } while (currentDate.isBefore(endDate, 'month'));

        await Promise.all(
            dates.map(async date => {
                await _setPlan({
                    data: {
                        ...record,
                        date,
                    },
                    transaction: tx,
                });
            })
        );
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

const extendPlans = async (date, endDate) => {
    if (
        !schemaHelper.plan.validator.date(date) ||
        !schemaHelper.plan.validator.date(endDate) ||
        formatHelper.getISOYearMonthString() > formatHelper.getISOYearMonthString(dayjs(date).add(1, 'month')) ||
        endDate <= date
    ) {
        throw errorHelper.create.validation('extendPlans', { date, endDate });
    }

    let tx;
    try {
        const db = getDBInstanse();
        tx = db.transaction([PLANS_STORE_NAME, CATEGORIES_STORE_NAME], READWRITE);
        const plansDateIndex = tx.objectStore(PLANS_STORE_NAME).index(DATE_INDEX);
        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);

        const categories = await categoriesStore.getAll();
        const categoriesByIds = categories.reduce((acc, curr) => {
            acc[curr._id] = curr;
            return acc;
        }, {});

        const plans = await plansDateIndex.getAll(date);
        const planIdsToExtend = [];
        plans.forEach(({ category_id, _id }) => {
            const { _isEditable } = categoriesByIds[category_id];

            if (_isEditable) {
                planIdsToExtend.push(_id);
            }
        });

        await Promise.all(
            planIdsToExtend.map(async _id => {
                await setSamePlans(null, _id, endDate);
            })
        );
        await tx.done;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const deletePlans = async (date, endDate = date, categoryIds) => {
    if (
        !schemaHelper.plan.validator.date(date) ||
        formatHelper.getISOYearMonthString() > date ||
        !schemaHelper.plan.validator.date(endDate) ||
        endDate < date ||
        !categoryIds?.length ||
        categoryIds.some(_id => !schemaHelper.category.validator._id(_id))
    ) {
        throw errorHelper.create.validation('deletePlans', { date, endDate, categoryIds });
    }

    let tx;
    try {
        const db = getDBInstanse();
        tx = db.transaction([PLANS_STORE_NAME, CATEGORIES_STORE_NAME], READWRITE);
        const plansIndex = tx.objectStore(PLANS_STORE_NAME).index(CATEGORY_ID_AND_DATE_INDEX);
        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);

        const categories = (await categoriesStore.getAll()).filter(({ _id }) => categoryIds.includes(_id));
        if (categories.some(({ _isEditable }) => !_isEditable)) {
            throw errorHelper.create.validation('deletePlans _isEditable', { categories });
        }

        const planIdsToDelete = [];
        await Promise.all(
            categories.map(async ({ _id }) => {
                const plans = await plansIndex.getAll(IDBKeyRange.bound([_id, date], [_id, endDate]));
                plans.forEach(({ _id }) => planIdsToDelete.push(_id));
            })
        );

        await Promise.all(
            planIdsToDelete.map(async _id => {
                await _deletePlan({ _id, transaction: tx });
            })
        );

        await tx.done;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const deletePlan = async _id => {
    if (!_id || !schemaHelper.plan.validator._id(_id)) {
        throw errorHelper.create.validation('deletePlan', { _id });
    }

    let tx;
    try {
        const db = getDBInstanse();
        tx = db.transaction([PLANS_STORE_NAME, CATEGORIES_STORE_NAME], READWRITE);
        const store = tx.objectStore(PLANS_STORE_NAME);

        const record = await store.get(_id);
        if (!record) {
            throw errorHelper.create.notFound();
        } else {
            const categoryRecord = await _getCategory({ _id: record.category_id, transaction: tx });
            errorHelper.throwOnNotEditable(categoryRecord);

            if (record.date < formatHelper.getISOYearMonthString()) {
                throw errorHelper.create.validation('deletePlan record', { record });
            }
        }

        await _deletePlan({ _id, transaction: tx });
        await tx.done;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const recalcPlansOfCurrentMonth = async () => {
    await recalcPlansOfMonth(formatHelper.getISOYearMonthString());
};

const recalcPlansOfMonth = async (date, transaction = null) => {
    if (!schemaHelper.plan.validator.date(date)) {
        throw errorHelper.create.validation('recalcPlansOfMonth', { date });
    }

    let tx = transaction;
    try {
        const db = getDBInstanse();
        tx ||= db.transaction([PLANS_STORE_NAME, ACTIONS_STORE_NAME], READWRITE);
        const plansCategoryIdAndDateIndex = tx.objectStore(PLANS_STORE_NAME).index(CATEGORY_ID_AND_DATE_INDEX);
        const plansDateIndex = tx.objectStore(PLANS_STORE_NAME).index(DATE_INDEX);
        const actionsDateIndex = tx.objectStore(ACTIONS_STORE_NAME).index(DATE_INDEX);
        const actions = await actionsDateIndex.getAll(
            IDBKeyRange.bound(
                `${date}-01`,
                formatHelper.getISODateString(dayjs(date).date(1).add(1, 'month').subtract(1, 'day'))
            )
        );
        const actionsSum = {};

        actions.forEach(({ sum, category_id }) => {
            if (!actionsSum[category_id]) {
                actionsSum[category_id] = 0;
            }

            actionsSum[category_id] += sum;
        });

        const plans = await plansDateIndex.getAll(date);
        const unprocessedPlanIds = new Set(plans.map(({ _id }) => _id));

        await Promise.all(
            Object.keys(actionsSum).map(async category_id => {
                const plan = await plansCategoryIdAndDateIndex.get([category_id, date]);
                const _id = plan?._id || null;
                unprocessedPlanIds.delete(_id);

                if (!actionsSum[category_id] && plan) {
                    await _deletePlan({ _id, transaction: tx });
                } else {
                    await _setPlan({
                        data: {
                            category_id,
                            date,
                            comment: plan?.comment || null,
                            sum: actionsSum[category_id],
                        },
                        _id,
                        transaction: tx,
                    });
                }
            })
        );

        await Promise.all(
            Array.from(unprocessedPlanIds).map(async _id => {
                await _deletePlan({ _id, transaction: tx });
            })
        );
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

const getPlansMatrix = async () => {
    let tx;
    try {
        const db = getDBInstanse();
        tx = db.transaction([CATEGORIES_STORE_NAME, PLANS_STORE_NAME], READONLY);
        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);
        const plansStore = tx.objectStore(PLANS_STORE_NAME);

        const categories = await categoriesStore.getAll();
        const categoriesByIds = categories.reduce((acc, curr) => {
            acc[curr._id] = curr;
            return acc;
        }, {});

        const matrix = {};
        const plans = await plansStore.getAll();
        plans.forEach(plan => {
            if (!matrix[plan.date]) {
                matrix[plan.date] = {
                    [categoryStatusEnum.INCOME]: 0,
                    [categoryStatusEnum.EXPENSE]: 0,
                    byCategoryId: {},
                };
            }
            matrix[plan.date].byCategoryId[plan.category_id] = plan;

            const { status } = categoriesByIds[plan.category_id];
            matrix[plan.date][status] += plan.sum;
        });

        await tx.done;
        return matrix;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const ensurePastPlans = async (transaction = null) => {
    let tx = transaction;
    try {
        const db = getDBInstanse();
        tx ||= db.transaction([ACTIONS_STORE_NAME, PLANS_STORE_NAME], READWRITE);
        // const plansIndex = tx.objectStore(PLANS_STORE_NAME).index(CATEGORY_ID_AND_DATE_INDEX);
        // const actionsIndex = tx.objectStore(ACTIONS_STORE_NAME).index(CATEGORY_ID_AND_DATE_INDEX);

        // const plansIndex = tx.objectStore(PLANS_STORE_NAME).index(DATE_INDEX);
        const plansStore = tx.objectStore(PLANS_STORE_NAME);
        const plans = await plansStore.getAll();
        const dates = new Set(plans.map(({ date }) => date));

        await Promise.all(
            Array.from(dates).map(async date => {
                // const [category_id, date] = key;
                if (date >= formatHelper.getISOYearMonthString()) return;
                await recalcPlansOfMonth(date, tx);

                // const plan = await plansIndex.get(key);
                // const lastDate = formatHelper.getISODateString(dayjs(date).date(1).add(1, 'month').subtract(1, 'day'));
                // // const actions = await actionsIndex.getAll(key);
                // const actions = await actionsIndex.getAll(
                //     IDBKeyRange.bound([category_id, `${date}-01`], [category_id, lastDate])
                // );
                // let sum = 0;
                // actions.forEach(action => (sum += action.sum));
                // if (sum !== plan.sum) {
                //     await _setPlan({
                //         data: {
                //             ...plan,
                //             sum,
                //         },
                //         _id: plan._id,
                //         transaction: tx,
                //     });
                // }
            })
        );
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

export {
    getPlan,
    setPlan,
    setSamePlans,
    extendPlans,
    deletePlans,
    deletePlan,
    recalcPlansOfCurrentMonth,
    recalcPlansOfMonth,
    getPlansMatrix,
    ensurePastPlans,
};
