import db from '../db';
import { deleteAction, getAction, getActionsListByMonth, getActionSumsByCategoryIds, setAction } from './model/actions';
import {
    getCategoriesByGroups,
    getCategoriesList,
    getCategory,
    getIsEmptyCategory,
    setCategory,
} from './model/categories';
import { deleteCheck, getCheck, getChecks, setCheck } from './model/checks';
import { getBalanceDynamic, getCurrentBalance } from './model/config';
import {
    deletePlan,
    deletePlans,
    ensurePastPlans,
    extendPlans,
    getPlan,
    getPlansMatrix,
    recalcPlansOfCurrentMonth,
    recalcPlansOfMonth,
    setPlan,
    setSamePlans,
} from './model/plans';

const dbController = {
    init: db.initDB,
    setupInitial: db.setupInitialDB,
    close: db.closeDB,
    destroy: db.destroyDB,
    fill: db.fillDB,
    dump: db.dumpDB,
    hasData: db.hasDataInDB,
    getActionsListByMonth,
    getAction,
    setAction,
    deleteAction,
    getActionSumsByCategoryIds,
    getCategoriesByGroups,
    getCategoriesList,
    getCategory,
    setCategory,
    getIsEmptyCategory,
    getChecks,
    getCheck,
    setCheck,
    deleteCheck,
    getCurrentBalance,
    getBalanceDynamic,
    getPlan,
    setPlan: (data, _id = null) => setPlan(data, _id),
    setSamePlans: (data, _id = null, _endDate = null) => setSamePlans(data, _id, _endDate),
    extendPlans,
    deletePlans,
    deletePlan,
    recalcPlansOfMonth: date => recalcPlansOfMonth(date),
    recalcPlansOfCurrentMonth,
    getPlansMatrix,
    ensurePastPlans: () => ensurePastPlans(),
};

export default dbController;
