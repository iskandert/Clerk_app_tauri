import store from '../store';
import { dayjs } from './utils';

function setPlansMatrix({ plans = [] }) {
    const plansIdsByDatesByCategoriesIds = {};
    const plansIndexesByIds = {};
    plans.forEach(({ date, _id, category_id }, idx) => {
        // set plans indexes by ids
        plansIndexesByIds[_id] = idx;
        const formattedDate = dayjs(date).format('YYYY-MM');
        // set plans by dates by categories
        if (!plansIdsByDatesByCategoriesIds?.[formattedDate])
            plansIdsByDatesByCategoriesIds[formattedDate] = {};
        plansIdsByDatesByCategoriesIds[formattedDate][category_id] = _id;
    });
    store.commit('SET_CALC_DATA', {
        f: 'plansIdsByDatesByCategoriesIds',
        data: plansIdsByDatesByCategoriesIds,
    });
    store.commit('SET_CALC_DATA', {
        f: 'plansIndexesByIds',
        data: plansIndexesByIds,
    });
}

function setBalancesByDates({ plans = [], categories = [], config = {} }) {
    const categoriesIds = {
        income: {
            default: [],
            savings: [],
        },
        expense: {
            default: [],
            savings: [],
        },
    };
    const categoriesIndexesByIds = {};
    const sumsByDatesByCategoriesStatuses = {};
    const balancesByDates = {};
    const plansIdsByDatesByCategoriesIds = store.getters.getCalcs('plansIdsByDatesByCategoriesIds');
    const plansIndexesByIds = store.getters.getCalcs('plansIndexesByIds');
    let firstDate = '';
    let lastDate = '';
    let datesRange = [];
    categories.forEach(({ _id, status, type }, idx) => {
        // set categories indexes by ids
        categoriesIndexesByIds[_id] = idx;
        // set categories by status by types
        categoriesIds[status]?.[type]?.push(_id);
    });
    // set sums by dates by categories types
    for (const date in plansIdsByDatesByCategoriesIds) {
        if (date < firstDate || !firstDate) firstDate = date;
        if (date > lastDate || !lastDate) lastDate = date;
        sumsByDatesByCategoriesStatuses[date] = {
            income: {
                balance: 0,
                default: 0,
                savings: 0,
            },
            expense: {
                balance: 0,
                default: 0,
                savings: 0,
            },
        };
        Object.entries(plansIdsByDatesByCategoriesIds[date]).forEach(([category_id, plan_id]) => {
            const { status, type } = categories[categoriesIndexesByIds[category_id]];
            const { sum } = plans[plansIndexesByIds[plan_id]];
            sumsByDatesByCategoriesStatuses[date][status].balance += sum;
            sumsByDatesByCategoriesStatuses[date][status][type] += sum;
        });
    }
    // set dates range
    // // console.log('firstDate', firstDate)
    // // console.log('lastDate', lastDate)
    let currentDate = firstDate;
    while (!(currentDate > lastDate)) {
        // // console.log('currentDate', currentDate)
        datesRange.push(currentDate);
        currentDate = dayjs(currentDate).add(1, 'month').format('YYYY-MM');
    }
    // // console.log('datesRange', datesRange)
    // set balances by dates
    datesRange.forEach((date, idx, arr) => {
        let prevBalances = balancesByDates[arr[idx - 1]];
        const currSums = sumsByDatesByCategoriesStatuses[date];
        const currDufference = {
            balance: (currSums?.income?.balance || 0) - (currSums?.expense?.balance || 0),
            savings: (currSums?.expense?.savings || 0) - (currSums?.income?.savings || 0),
        };
        if (!idx) {
            prevBalances = {
                balance: config.start_balance,
                savings: config.start_savings,
            };
        }
        // console.log('prev balance', prevBalances?.balance)
        // console.log('prev savings', prevBalances?.savings)
        balancesByDates[date] = {
            balance: prevBalances?.balance + currDufference.balance,
            balanceDiff: currDufference.balance,
            savings: prevBalances?.savings + currDufference.savings,
            savingsDiff: currDufference.savings,
        };
        // console.log('curr balance', balancesByDates[date]?.balance)
        // console.log('curr savings', balancesByDates[date]?.savings)
    });
    store.commit('SET_CALC_DATA', {
        f: 'balancesByDates',
        data: balancesByDates,
    });
    store.commit('SET_CALC_DATA', {
        f: 'sumsByDatesByCategoriesStatuses',
        data: sumsByDatesByCategoriesStatuses,
    });
    store.commit('SET_CALC_DATA', {
        f: 'categoriesIds',
        data: categoriesIds,
    });
    store.commit('SET_CALC_DATA', {
        f: 'categoriesIndexesByIds',
        data: categoriesIndexesByIds,
    });
    store.commit('SET_CALC_DATA', {
        f: 'datesRange',
        data: datesRange,
    });
}

function setProgressByCategories({ plans = [], actions = [], categories = [] }) {
    const thisMonth = dayjs().format('YYYY-MM');
    const sumsByCategoriesIds = {};
    const progressByCategoriesIds = {};
    const plansIdsByCategoriesIds =
        store.getters.getCalcs('plansIdsByDatesByCategoriesIds')?.[thisMonth] || {};
    const plansIndexesByIds = store.getters.getCalcs('plansIndexesByIds');
    const sumsByCategoriesStatuses =
        store.getters.getCalcs('sumsByDatesByCategoriesStatuses')?.[thisMonth] || {};
    actions.forEach(({ category_id, sum, date }) => {
        if (!dayjs(date).isSame(thisMonth, 'month')) return;
        if (sumsByCategoriesIds[category_id] === undefined) sumsByCategoriesIds[category_id] = 0;
        sumsByCategoriesIds[category_id] += sum;
    });
    // set progress by categories
    const groupsSums = {
        income: 0,
        expense: 0,
    };
    // console.log(sumsByCategoriesIds)
    categories.forEach(({ _id, status }) => {
        const sum = Math.round(sumsByCategoriesIds[_id] || 0);
        const planSum = plans[plansIndexesByIds?.[plansIdsByCategoriesIds?.[_id]]]?.sum;
        // console.log(groupsSums[status], sum, planSum)
        groupsSums[status] += sum;
        // console.log(groupsSums[status])
        if (sum !== undefined)
            progressByCategoriesIds[_id] = {
                sum,
                percentage:
                    planSum !== undefined
                        ? Math.round((sum / planSum || 0) * 10000) / 100
                        : undefined,
            };
    });
    // console.log(groupsSums)
    // set progress by categories groups
    for (const status in groupsSums) {
        const sum = groupsSums[status];
        const planSum = sumsByCategoriesStatuses[status]?.balance;
        progressByCategoriesIds[status] = {
            sum,
            percentage:
                planSum !== undefined ? Math.round((sum / planSum || 0) * 10000) / 100 : undefined,
        };
    }
    store.commit('SET_CALC_DATA', {
        f: 'progressByCategoriesIds',
        data: progressByCategoriesIds,
    });
}

export {
    //
    setPlansMatrix,
    setBalancesByDates,
    setProgressByCategories,
};
