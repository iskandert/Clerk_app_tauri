import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const getData = data => {
    return {
        actions: data.actions.data,
        plans: data.plans.data,
        categories: data.categories.data,
        tables: data.tables.data,
        config: data.config.data,
    };
};

// const getCommonMethods = state => {
const generateId = () => uuidv4();

const createEntity = obj => ({
    ...obj,
    _id: generateId(),
    _createdAt: dayjs().format(),
});
// const add = obj => {
//     const entity = createEntity(obj);
//     this._add(entity);
//     return this.getResult();
// };
// const _add = obj => {
//     return this.state[this.field].data.push(obj);
// };
const findEntity = (id, data) => {
    return data.find(({ _id }) => {
        if (_id !== id) return false;
        return true;
    });
};
const findEntityIndex = (id, data) => {
    return data.findIndex(({ _id }) => {
        if (_id !== id) return false;
        return true;
    });
};
// const changeEntity = (target, source) => {
//     return Object.assign(target, source);
// };
// const deleteEntityByIndex = (index, data) => {
//     return data.splice(index, 1)[0];
// };
const deleteEntityById = (id, data) => {
    const { index } = findEntityIndex(id, data);
    return data.splice(index, 1)[0];
};
const findAndChangeEntity = (obj, data) => {
    const { entity } = find(obj._id, data);
    return Object.assign(entity, obj);
};
// const delete =(id) => {
//     const { index } = this._find(id);
//     this._delete(index);
//     return this.getResult();
// }
// return { generateId, create };
// };

export default {
    getData,
    createEntity,
    findEntity,
    findEntityIndex,
    deleteEntityById,
    findAndChangeEntity,
};
