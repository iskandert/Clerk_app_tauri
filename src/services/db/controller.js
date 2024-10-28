import db from '../db';
import { deleteAction, getAction, getActionsListByMonth, setAction } from './model/actions';
import { getCategoriesList, getCategory, setCategory } from './model/categories';
import { deleteCheck, getCheck, getChecks, setCheck } from './model/checks';
import { getBalanceDynamic, getCurrentBalance } from './model/config';
import {
    deletePlan,
    deletePlans,
    ensurePastPlans,
    extendPlans,
    getPlan,
    getPlansMatrix,
    recalcPlansOfMonth,
    setPlan,
    setSamePlans,
} from './model/plans';

const dbController = {
    init: db.initDB,
    close: db.closeDB,
    destroy: db.destroyDB,
    fill: db.fillDB,
    dump: db.dumpDB,
    getActionsListByMonth,
    getAction,
    setAction,
    deleteAction,
    getCategoriesList,
    getCategory,
    setCategory,
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
    recalcPlansOfMonth,
    getPlansMatrix,
    ensurePastPlans,
};

export default dbController;
