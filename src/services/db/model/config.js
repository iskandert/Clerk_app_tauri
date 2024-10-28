import dayjs from 'dayjs';
import { categoryStatusEnum, categoryTypeEnum } from '../../constants';
import errorHelper from '../../helpers/errorHelper';
import schemaHelper from '../../helpers/schemaHelper';
import { getDBInstanse } from '../instance';
import { _getConfigStart } from '../repository/config';
import formatHelper from '../../helpers/formatHelper';

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

const getCurrentBalance = async () => {
    const result = { default: 0, savings: 0 };

    try {
        const db = getDBInstanse();
        const tx = db.transaction(db.objectStoreNames, READONLY);
        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);
        const plansDateIndex = tx.objectStore(PLANS_STORE_NAME).index(DATE_INDEX);
        const actionsDateIndex = tx.objectStore(ACTIONS_STORE_NAME).index(DATE_INDEX);

        const startBalance = await _getConfigStart({ transaction: tx });
        result.default = startBalance.start_default_sum;
        result.savings = startBalance.start_savings_sum;

        const categories = await categoriesStore.getAll();
        const categoriesByIds = categories.reduce((acc, curr) => {
            acc[curr._id] = curr;
            return acc;
        }, {});
        const prevMonthsPlans = await plansDateIndex.getAll(
            IDBKeyRange.upperBound(formatHelper.getISOYearMonthString(), true)
        );
        const currMonthActions = await actionsDateIndex.getAll(
            IDBKeyRange.bound(`${formatHelper.getISOYearMonthString()}-01`, formatHelper.getISODateString())
        );

        [...prevMonthsPlans, ...currMonthActions].forEach(({ category_id, sum }) => {
            const { status, type } = categoriesByIds[category_id];
            const isExpense = status === categoryStatusEnum.EXPENSE;
            const isSavings = type === categoryTypeEnum.SAVINGS;

            result.default += isExpense ? -sum : sum;
            if (isSavings) {
                result.savings += isExpense ? sum : -sum;
            }
        });

        await tx.done;
        return result;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const getBalanceDynamic = async () => {
    try {
        const db = getDBInstanse();
        const tx = db.transaction(db.objectStoreNames, READONLY);
        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);
        const plansDateIndex = tx.objectStore(PLANS_STORE_NAME).index(DATE_INDEX);

        const categories = await categoriesStore.getAll();
        const categoriesByIds = categories.reduce((acc, curr) => {
            acc[curr._id] = curr;
            return acc;
        }, {});

        const dates = await plansDateIndex.getAllKeys();
        const startDate = dates[0];
        const endDate = dates.at(-1);

        const startBalance = await _getConfigStart({ transaction: tx });
        const balances = [
            {
                date: null,
                default: startBalance.start_default_sum,
                savings: startBalance.start_savings_sum,
            },
        ];
        let date = startDate;
        while (date <= endDate) {
            const prevBalance = balances.at(-1);

            const balance = {
                date,
                default: prevBalance.default,
                savings: prevBalance.savings,
            };

            const plans = await plansDateIndex.getAll(date);
            plans.forEach(({ category_id, sum }) => {
                const { status, type } = categoriesByIds[category_id];
                const isExpense = status === categoryStatusEnum.EXPENSE;
                const isSavings = type === categoryTypeEnum.SAVINGS;

                balance.default += isExpense ? -sum : sum;
                if (isSavings) {
                    balance.savings += isExpense ? sum : -sum;
                }
            });

            balances.push(balance);
            date = formatHelper.getISOYearMonthString(dayjs(`${date}-01`).add(1, 'month'));
        }

        await tx.done;
        return balances;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

export { getCurrentBalance, getBalanceDynamic };
