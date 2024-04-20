import schemas from './schemas';
import { cloneByJSON, getObjectFromArray, isEqual } from './utils';
import { v4 as uuidv4 } from 'uuid';
import store from '../store';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import weekday from 'dayjs/plugin/weekday';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';
dayjs.locale('ru');
dayjs.extend(customParseFormat).extend(weekday).extend(relativeTime);

export class Entities {
    constructor(state) {
        if (state) this.state = cloneByJSON(state);
        else this.state = cloneByJSON(store.getters.getAllData);
    }
    _generateId() {
        return uuidv4();
    }
    _create(obj) {
        const entity = {
            ...this.schema,
            ...obj,
            _id: this._generateId(),
            _createdAt: dayjs().format(),
        };
        return entity;
    }
    _add(obj) {
        return this.state[this.field].data.push(obj);
    }
    _find(id) {
        let index;
        const entity = this.state[this.field].data.find(({ _id }, idx) => {
            if (_id !== id) return false;
            index = idx;
            return true;
        });
        return { entity, index };
    }
    _change(target, source) {
        return Object.assign(target, source);
    }
    _delete(index) {
        return this.state[this.field].data.splice(index, 1);
    }
    getResult() {
        return [
            {
                field: this.field,
                data: this.state[this.field].data,
            },
        ];
    }
    add(obj) {
        const entity = this._create(obj);
        this._add(entity);
        return this.getResult();
    }
    change(obj) {
        const { entity } = this._find(obj._id);
        this._change(entity, obj);
        return this.getResult();
    }
    delete(id) {
        const { index } = this._find(id);
        this._delete(index);
        return this.getResult();
    }
}

export class Tables extends Entities {
    constructor(state) {
        super(state);
        this.field = 'tables';
        this.schema = schemas.table;
    }
    // change(obj) {
    //   const { entity, index } = this._find(obj._id)
    //   const beforeChanges = cloneByJSON(entity)
    //   let result = this.change(obj)
    //   if (isEqual(result[this.field][index].plans_id, beforeChanges.plans_id)) return result
    //   const unusable_plans_id = []
    //   result[this.field].forEach(({plans_id}) => {
    //     // plans_id.forEach(id => {
    //     //   if (this.state.plans)
    //     // })
    //   })
    //   // If unusable plans exist, delete these plans entities
    // }
    delete(id) {
        if (this.state[this.field].data.length < 2)
            throw new Error('Нельзя удалить последнюю таблицу');
        const { entity, index } = this._find(id);
        // const child_tables = this.state[this.field].data.filter(({inherited_id}) => inherited_id === entity._id)
        // if (child_tables.length > 0) {
        //   // If this table has children, in every entity delete inferited_id field
        //   // (or change on id of deleting table parent),
        //   // copy fields plans_id into child tables
        // }
        this._delete(index);
        let result = this.getResult();

        if (entity.plans_id.length) {
            const plans = new Plans(this.state);
            entity.plans_id.forEach(plan_id => {
                plans.delete(plan_id);
            });
            result = result.concat(plans.getResult());
        }

        return result;
    }
}

export class Categories extends Entities {
    constructor(state) {
        super(state);
        this.field = 'categories';
        this.schema = schemas.category;
    }
    delete(id, { redefined_category_id } = {}) {
        const { entity, index } = this._find(id);
        let result = [];

        const categ_actions = this.state.actions.data.filter(
            ({ category_id }) => entity._id === category_id
        );
        if (categ_actions.length) {
            const actions = new Actions(this.state);
            categ_actions.forEach(action => {
                if (redefined_category_id && this._find(redefined_category_id).index >= 0) {
                    actions.add({
                        ...action,
                        category_id: redefined_category_id,
                    });
                }
                actions.delete(action._id);
                result = result.concat(actions.getResult());
            });
        }

        const categ_plans = this.state.plans.data.filter(
            ({ category_id }) => entity._id === category_id
        );
        if (categ_plans.length) {
            const isRedefinedCategoryExist =
                redefined_category_id && this._find(redefined_category_id).index >= 0;
            const redefined_category_plans = isRedefinedCategoryExist
                ? this.state.plans.data.filter(({ category_id }) => {
                      return category_id === redefined_category_id;
                  }) || []
                : [];

            const plans = new Plans(this.state);
            categ_plans.forEach(plan => {
                if (isRedefinedCategoryExist) {
                    const sum = redefined_category_plans.find(({ date }) =>
                        dayjs(date).isSame(plan.date, 'month')
                    )?.sum;
                    plan.sum += sum || 0;
                    plans.add({
                        ...plan,
                        category_id: redefined_category_id,
                    });
                }
                plans.delete(plan._id);
                result = result.concat(plans.getResult());
            });
        }

        this._delete(index);
        result = result.concat(this.getResult());

        return result;
        // if (categ_actions.length || categ_plans.length) {
        //   const actions_pseudo = categ_actions.length ? 'операции' : ''
        //   const plans_pseudo = categ_plans.length ? 'планы' : ''
        //   const pseudo_connector = actions_pseudo && plans_pseudo ? ' и ' : ''
        //   const pseudo = actions_pseudo + pseudo_connector + plans_pseudo
        //   elConfirm(
        //     `
        //     В удаляемой категории "${entity.name}" есть некоторые ${pseudo}.
        //     Переопределить их в другую категорию?
        //   `,
        //     'Категория не пустая',
        //     {
        //       confirmButtonText: 'Переопределить',
        //       cancelButtonText: 'Переопределить',
        //       cancelButtonClass: 'el-button--danger',
        //     }
        //   ).then(() => {
        //     router.push()
        //   })
        // }
    }
}

export class Actions extends Entities {
    constructor(state) {
        super(state);
        this.field = 'actions';
        this.schema = schemas.action;
    }
    _format_settings(obj) {
        const settings = cloneByJSON(obj);

        if (settings?.date) settings.date = dayjs(settings.date).format();
        if (settings?.sum !== undefined) settings.sum = Math.round(+settings.sum * 100) / 100;

        return settings;
    }
    add(obj, { new_category_settings = {} } = {}) {
        const actionSettings = this._format_settings(obj);
        let result = [];

        if (actionSettings.category_id === 'new') {
            const categories = new Categories(this.state);
            const newCategory = categories._create(new_category_settings);
            categories._add(newCategory);
            actionSettings.category_id = newCategory._id;
            result = result.concat(categories.getResult());
        }

        const action = this._create(actionSettings);
        this._add(action);
        result = result.concat(this.getResult(), this.updatePastPlan(action, {}));

        const config = new Config(this.state);
        config.checkStart(action);
        result = result.concat(config.getResult());

        return result;
    }
    change(obj) {
        let result = [];
        const actionSettings = this._format_settings(obj);

        const { entity: newAction } = this._find(actionSettings._id);
        const oldAction = cloneByJSON(newAction);
        this._change(newAction, actionSettings);
        result = result.concat(this.getResult(), this.updatePastPlan(newAction, oldAction));

        const config = new Config(this.state);
        config.checkStart();
        result = result.concat(config.getResult());

        return result;
    }
    delete(id) {
        let result = [];

        const { entity: oldAction } = cloneByJSON(this._find(id));
        super.delete(id);
        result = result.concat(this.getResult(), this.updatePastPlan({}, oldAction));

        const config = new Config(this.state);
        config.checkStart();
        result = result.concat(config.getResult());

        return result;
    }
    updatePastPlan(newAction, oldAction) {
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
    }
    simplifyByDays() {
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
    }
    randomize() {
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
    }
}

export class Plans extends Entities {
    constructor(state) {
        super(state);
        this.field = 'plans';
        this.schema = schemas.plan;
    }
    _deleteSameDate(obj) {
        const planSettings = this._format_settings(obj);

        this.state[this.field].data.filter(({ date, _id, category_id }) => {
            if (date !== planSettings.date || category_id !== planSettings.category_id)
                return false;
            this.delete(_id);
            return true;
        });
    }
    _addMorePlans(obj) {
        const planSettings = this._format_settings(obj);
        let dateLast = dayjs(planSettings.dateLast);
        delete planSettings.dateLast;

        if (!dayjs(planSettings.date).isBefore(dateLast, 'month')) return;

        let dateCurr = dayjs(planSettings.date).add(1, 'month');
        while (!dateCurr.isAfter(dateLast, 'month')) {
            if (!dateCurr.isBefore(dayjs(), 'month')) {
                let settings = {
                    ...planSettings,
                    date: dateCurr.format('YYYY-MM'),
                };
                const plan = this._create(settings);
                this._deleteSameDate(settings);
                this._add(plan);
            }

            dateCurr = dateCurr.add(1, 'month');
        }
    }
    _format_settings(obj) {
        const settings = cloneByJSON(obj);

        if (settings?.date) settings.date = dayjs(settings.date).format('YYYY-MM');
        if (settings?.sum !== undefined) settings.sum = Math.round(+settings.sum);

        return settings;
    }
    add(obj, { new_category_settings = {}, current_table_id } = {}) {
        const planSettings = this._format_settings(obj);
        let result = [];

        if (!planSettings.sum || planSettings.sum < 0) return result;

        if (planSettings.category_id === 'new') {
            const categories = new Categories(this.state);
            const newCategory = categories._create(new_category_settings);
            categories._add(newCategory);
            planSettings.category_id = newCategory._id;
            result = result.concat(categories.getResult());
        }

        if (planSettings.dateLast) {
            this._addMorePlans(planSettings);
            delete planSettings.dateLast;
        }

        if (!dayjs(planSettings.date).isBefore(dayjs(), 'month')) {
            const plan = this._create(planSettings);
            // plan.date = dayjs(plan.date).format('YYYY-MM')
            this._deleteSameDate(plan.date);
            this._add(plan);
            result = result.concat(this.getResult());

            const tables = new Tables(this.state);
            for (const table of current_table_id
                ? [tables._find(current_table_id)]
                : tables.state.tables.data) {
                table.plans_id.push(plan._id);
            }
            result = result.concat(tables.getResult());
        }

        return result;
    }
    extendMany(obj) {
        const settings = cloneByJSON(obj);
        let result = [];

        if (!settings.date || !settings.dateLast || !settings.categories_ids?.length) return result;

        if (dayjs(settings.date).isBefore(dayjs(), 'month')) return result;

        settings.date = dayjs(settings.date).format('YYYY-MM');
        settings.dateLast = dayjs(settings.dateLast).format('YYYY-MM');

        this.state[this.field].data.forEach(plan => {
            if (!settings.categories_ids.includes(plan.category_id) || plan.date !== settings.date)
                return;
            this.change({
                ...plan,
                dateLast: settings.dateLast,
            });
        });

        result = result.concat(this.getResult());

        return result;
    }
    change(obj) {
        let result = [];
        const planSettings = this._format_settings(obj);

        if (planSettings.sum <= 0) return result;

        if (planSettings.dateLast) {
            this._addMorePlans(planSettings);
            delete planSettings.dateLast;
        }
        super.change(planSettings);
        result = result.concat(this.getResult());

        return result;
    }
    delete(id) {
        let result = [];

        const tables = this.state.tables.data;
        tables.forEach(table => {
            const plan_id_index = table.plans_id.indexOf(id);
            if (plan_id_index < 0) return;
            table.plans_id.splice(plan_id_index, 1);
        });

        super.delete(id);
        result = result.concat(this.getResult());

        return result;
    }
    deleteMany(obj) {
        let result = [];
        if (!obj) return result;

        const settings = cloneByJSON(obj);

        if (settings.date) settings.date = dayjs(settings.date).format('YYYY-MM');
        if (settings.dateLast) settings.dateLast = dayjs(settings.dateLast).format('YYYY-MM');

        this.state[this.field].data
            .filter(plan => {
                let isSameDate;

                if (settings.dateLast)
                    isSameDate = plan.date >= settings.date && plan.date <= settings.dateLast;
                else isSameDate = plan.date === settings.date;

                if (isSameDate) return settings.categories_ids.includes(plan.category_id);
                return false;
            })
            .forEach(({ _id }) => this.delete(_id));

        result = result.concat(this.getResult());

        return result;
    }
    checkPlans() {
        let result = [];

        this.deleteDublicates();
        this.updatePlans({ mode: 'past' });
        this.deleteEmptyPlans();

        result = result.concat(this.getResult());

        return result;
    }
    recalcCurrentPlans() {
        let result = [];

        this.updatePlans();
        this.deleteEmptyPlans();

        result = result.concat(this.getResult());

        return result;
    }
    deleteEmptyPlans() {
        let result = [];

        const idsToDelete = [];
        this.state[this.field].data.forEach(plan => {
            if (Math.round(+plan.sum) > 0) return;
            idsToDelete.push(plan._id);
        });

        idsToDelete.forEach(id => this.delete(id));

        if (idsToDelete.length) result = result.concat(this.getResult());

        return result;
    }
    deleteDublicates() {
        let result = [];

        const idsToDelete = [];
        const plansExistingObj = {};
        this.state[this.field].data.forEach(plan => {
            if (plansExistingObj[plan.date]?.[plan.category_id]) {
                idsToDelete.push(plan._id);
                return;
            }

            if (!plansExistingObj[plan.date]) plansExistingObj[plan.date] = {};
            plansExistingObj[plan.date][plan.category_id] = true;
        });

        idsToDelete.forEach(id => this.delete(id));

        if (idsToDelete.length) result = result.concat(this.getResult());

        return result;
    }
    updatePlans(settings) {
        let result = [];

        const plansObj = {};
        const isPastMode = settings?.mode === 'past';
        const now = dayjs();
        this.state[this.field].data.forEach(plan => {
            if (isPastMode ? !now.isAfter(plan.date, 'month') : !now.isSame(plan.date, 'month'))
                return;

            plan.sum = 0;
            if (!plansObj[plan.date]) plansObj[plan.date] = {};
            plansObj[plan.date][plan.category_id] = plan;
        });

        this.state.actions.data.forEach(action => {
            const date = dayjs(action.date).format('YYYY-MM');
            if (isPastMode ? !now.isAfter(date, 'month') : !now.isSame(date, 'month')) return;

            let plan = plansObj[date]?.[action.category_id];
            if (plan) return (plan.sum += +action.sum);

            plan = this._create({
                date,
                sum: +action.sum,
                category_id: action.category_id,
            });
            this._add(plan);

            if (!plansObj[date]) plansObj[date] = {};
            plansObj[date][action.category_id] = plan;
        });

        result = result.concat(this.getResult());

        return result;
    }
    randomizePlans() {
        let result = [];

        return result;
    }
}

export class Config extends Entities {
    constructor(state) {
        super(state);
        this.field = 'config';
        this.schema = schemas.config;
        delete this._generateId;
        delete this._create;
        delete this._add;
        delete this._find;
        delete this._delete;
        delete this.add;
        delete this.delete;
    }
    _compare_dates(date) {
        const checking_date = this.state[this.field].data.checking_date;
        if (dayjs(date).isBefore(checking_date, 'day')) return -1;
        if (dayjs(date).isAfter(checking_date, 'day')) return 1;
        return 0;
    }
    _round_balances() {
        // this.state[this.field].data.start_balance = Math.round(this.state[this.field].data.start_balance * 100) / 100
        // this.state[this.field].data.start_savings = Math.round(this.state[this.field].data.start_savings * 100) / 100
        this.state[this.field].data.start_balance = Math.round(
            this.state[this.field].data.start_balance
        );
        this.state[this.field].data.start_savings = Math.round(
            this.state[this.field].data.start_savings
        );
    }
    _fix_start(action) {
        if (this._compare_dates(action.date) === 1) return;

        const categories = new Categories(this.state);
        const { entity: category } = categories._find(action.category_id);
        let isExpense = category.status === 'expense';

        this.state[this.field].data.start_balance += isExpense ? action.sum : -action.sum;
        if (category.type === 'savings') {
            this.state[this.field].data.start_savings += isExpense ? -action.sum : action.sum;
        }

        this._round_balances();
        return this.getResult();
    }
    change(obj) {
        let configSettings = cloneByJSON(obj);
        if (configSettings.checked_balance_date) {
            configSettings.checked_balance_date = dayjs(
                configSettings.checked_balance_date
            ).format();
        }
        this._change(this.state[this.field].data, configSettings);
        this._round_balances();
        return this.getResult();
    }
    setStart({ checked_balance, checked_savings, checking_date }) {
        let result = [];

        this.change({
            start_balance: checked_balance,
            start_savings: checked_savings,
            checked_balance,
            checked_savings,
            checking_date: dayjs(checking_date).format(),
        });

        this.state.actions.data.forEach(action => this._fix_start(action));
        this._round_balances();
        result = result.concat(this.getResult());

        return result;
    }
    checkStart(action) {
        let result = [];

        if (!this.state[this.field].data.checking_date) return result;

        if (!action) {
            this.change({
                start_balance: this.state[this.field].data.checked_balance,
                start_savings: this.state[this.field].data.checked_savings,
            });
            this.state.actions.data.forEach(action => this._fix_start(action));
        } else this._fix_start(action);
        result = result.concat(this.getResult());

        return result;
    }
    getCurrent() {
        const result = { balance: 0, savings: 0 };

        if (!this.state[this.field]?.data?.checking_date) return result;

        result.balance = this.state[this.field].data.start_balance;
        result.savings = this.state[this.field].data.start_savings;

        this.state.actions.data.forEach(action => {
            const categories = new Categories(this.state);
            const { entity: category } = categories._find(action.category_id);
            let isExpense = category.status === 'expense';

            result.balance += isExpense ? -action.sum : action.sum;
            if (category.type === 'savings') {
                result.savings += isExpense ? action.sum : -action.sum;
            }
        });
        result.balance = Math.round(result.balance);
        result.savings = Math.round(result.savings);

        return result;
    }
}
