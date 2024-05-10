import schemas from '../schemas';
import commonMethods from './common';

const getPlansMethods = state => {
    const data = commonMethods.getData(state);

    const formatSettings = obj => {
        const settings = cloneByJSON(obj);

        if (settings.date) settings.date = dayjs(settings.date).format('YYYY-MM');
        if (settings.sum !== undefined) settings.sum = Math.round(+settings.sum);

        return settings;
    };

    // TODO fill only existing fields
    const fillSchema = obj => ({
        ...schemas.plan,
        ...formatSettings(obj),
    });

    const add = obj => {
        const settings = fillSchema(obj);
        const plan = commonMethods.create(settings);
        data.plans.push(plan);
        return plan;
    };

    const ensurePast = (newAction = null, oldAction = null) => {
        let now = dayjs();

        let newActionDate;
        let oldActionDate;
        let newActionPlan;
        let oldActionPlan;

        if (newAction) {
            newActionDate = dayjs(newAction.date).format('YYYY-MM');
            newActionPlan = data.plans.find(({ date, category_id }) => {
                return (
                    dayjs(date).isSame(newActionDate, 'month') &&
                    category_id === newAction.category_id
                );
            });
        }
        if (oldAction) {
            oldActionDate = dayjs(oldAction.date).format('YYYY-MM');
            oldActionPlan = data.plans.find(({ date, category_id }) => {
                return (
                    dayjs(date).isSame(oldActionDate, 'month') &&
                    category_id === oldAction.category_id
                );
            });
        }
        if (!oldActionDate && !newActionDate) return;

        if (oldActionDate && now.isAfter(oldActionDate, 'month') && oldActionPlan) {
            oldActionPlan.sum -= +oldAction.sum;
            if (Math.round(oldActionPlan.sum) <= 0) {
                commonMethods.deleteEntityById(oldActionPlan._id, data.plans);
            }
        }
        if (newActionDate && now.isAfter(newActionDate, 'month')) {
            if (newActionPlan) {
                newActionPlan.sum += +newAction.sum;
            } else {
                let plan = plans._create({
                    date: newActionDate,
                    sum: newAction.sum,
                    category_id: newAction.category_id,
                });
                plans._add(plan);

                result = result.concat(plans.getResult());
            }
        }

        return result;
    };

    return { ensurePast };
};

export { getPlansMethods };
