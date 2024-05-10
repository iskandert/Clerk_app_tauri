import store from '../store';
import { getActionsMethods } from './repository/actions';
import { getCategoriesMethods } from './repository/categories';
import { getConfigMethods } from './repository/config';
import { getPlansMethods } from './repository/plans';
import { getTablesMethods } from './repository/tables';
import { cloneByJSON } from './utils';

const getDataChanging = () => {
    const data = cloneByJSON(store.getters.getAllData);

    return {
        data,
        actions: getActionsMethods(data),
        plans: getPlansMethods(data),
        categories: getCategoriesMethods(data),
        tables: getTablesMethods(data),
        config: getConfigMethods(data),
    };
};

export { getDataChanging };
