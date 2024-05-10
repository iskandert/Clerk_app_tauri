import dayjs from 'dayjs';
import { cloneByJSON } from '../utils';
import commonMethods from './common';
import { getCategoriesMethods } from './categories';
import schemas from '../schemas';

const getActionsMethods = state => {
    const data = commonMethods.getData(state);

    const formatSettings = obj => {
        const settings = cloneByJSON(obj);

        if (settings.date) settings.date = dayjs(settings.date).format();
        if (settings.sum !== undefined) settings.sum = Math.round(+settings.sum * 100) / 100;

        return settings;
    };

    const fillSchema = obj => ({
        ...schemas.action,
        ...formatSettings(obj),
    });

    const add = obj => {
        const settings = fillSchema(obj);
        const action = commonMethods.create(settings);
        data.actions.push(action);
        return action;
    };
    const change = obj => {
        // let result = [];
        const settings = formatSettings(obj);

        const { entity: newAction } = this._find(settings._id);
        const oldAction = cloneByJSON(newAction);
        this._change(newAction, settings);
        // result = result.concat(this.getResult(), this.updatePastPlan(newAction, oldAction));

        // const config = new Config(this.state);
        // config.checkStart();
        // result = result.concat(config.getResult());

        // return result;
    };
    // const delete = (id) => {
    //     let result = [];

    //     const { entity: oldAction } = cloneByJSON(this._find(id));
    //     super.delete(id);
    //     result = result.concat(this.getResult(), this.updatePastPlan({}, oldAction));

    //     const config = new Config(this.state);
    //     config.checkStart();
    //     result = result.concat(config.getResult());

    //     return result;
    // }
    const updatePastPlan = (newAction, oldAction) => {
        let result = [];

        let oldActionDate;
        let newActionDate;
        let now = dayjs();
        if (oldAction?._id) oldActionDate = dayjs(oldAction.date).format('YYYY-MM');
        if (newAction?._id) newActionDate = dayjs(newAction.date).format('YYYY-MM');
        if (!oldActionDate && !newActionDate) return result;

        const plans = new Plans(this.state);
        const oldActionPlan = this.state.plans.data.find(({ date, category_id }) => {
            return (
                dayjs(date).isSame(oldActionDate, 'month') && category_id === oldAction?.category_id
            );
        });
        const newActionPlan = this.state.plans.data.find(({ date, category_id }) => {
            return (
                dayjs(date).isSame(newActionDate, 'month') && category_id === newAction?.category_id
            );
        });

        if (oldActionDate && now.isAfter(oldActionDate, 'month') && oldActionPlan) {
            oldActionPlan.sum -= +oldAction.sum;
            if (Math.round(oldActionPlan.sum) <= 0) {
                plans.delete(oldActionPlan._id);
            } else plans.change(oldActionPlan);

            result = result.concat(plans.getResult());
        }
        if (newActionDate && now.isAfter(newActionDate, 'month')) {
            if (newActionPlan) {
                newActionPlan.sum += +newAction.sum;
                plans.change(newActionPlan);

                result = result.concat(plans.getResult());
            }
            if (!newActionPlan) {
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
    const simplifyByDays = () => {
        let result = [];

        const simplyfied = {};

        this.state[this.field].data.forEach(action => {
            const date = dayjs(action.date).format('YYYY-MM-DD');
            if (!simplyfied[date]) {
                simplyfied[date] = {};
            }
            if (!simplyfied[date][action.category_id]) {
                simplyfied[date][action.category_id] = action;
            } else {
                simplyfied[date][action.category_id].sum += action.sum;
            }
        });

        const data = [];
        Object.values(simplyfied)
            .map(Object.values)
            .forEach(actions => data.push(...actions));

        result.push({
            field: this.field,
            data,
        });

        return result;
    };
    const randomize = () => {
        let result = [];

        const randomized = {};
        const sums = {};

        this.state[this.field].data.forEach(action => {
            const date = dayjs(action.date).format('YYYY-MM');
            if (!randomized[action.category_id]) {
                randomized[action.category_id] = [];
            }
            if (!sums[action.category_id]) {
                sums[action.category_id] = {};
            }
            if (!sums[action.category_id][date]) {
                sums[action.category_id][date] = 0;
            }
            sums[action.category_id][date] += action.sum;

            randomized[action.category_id].push(action);
        });

        Object.values(sums).forEach(categorySums => {
            const average =
                Object.values(categorySums).reduce((sum, curr) => (sum += curr)) /
                Object.keys(categorySums).length;
            categorySums.average = average;
            console.log(average);
        });

        const sumsSteps = [
            { sum: 100000, transform: value => value * 0.2 },
            { sum: 50000, transform: value => value * 0.4 },
            { sum: 10000, transform: value => value * 2 },
            { sum: 20000, transform: value => value * 0.6 },
            { sum: 5000, transform: value => value * 3.6 },
            { sum: 0, transform: value => value * 6 },
        ];

        Object.entries(randomized).forEach(([category_id, actions]) => {
            for (const step of sumsSteps) {
                if (sums[category_id].average > step.sum) {
                    actions.forEach(action => (action.sum = step.transform(action.sum)));
                    return;
                }
            }
        });

        const data = [];
        Object.values(randomized).forEach(actions => data.push(...actions));

        result.push({
            field: this.field,
            data,
        });

        return result;
    };

    return {add}
};

export { getActionsMethods };
