import { getDataChanging } from '../repository';
import { cloneByJSON } from '../utils';

export default {
    add(actionSettings, categorySettings = null) {
        const { data, actions, categories, config, plans } = getDataChanging();

        actionSettings = cloneByJSON(actionSettings);

        if (actionSettings.category_id === 'new') {
            const newCategory = categories.add(categorySettings);
            actionSettings.category_id = newCategory._id;
        }
        const action = actions.add(actionSettings);
        plans.ensurePast(action);
        config.ensureStart(action);

        return data;
    },
};
