import dayjs from 'dayjs';
import errorHelper from '../../helpers/errorHelper';
import schemaHelper from '../../helpers/schemaHelper';
import { dbModeEnum, dbStoreEnum } from '../config';
import { getDBInstanse } from '../instance';
import { v4 as uuidv4 } from 'uuid';

const { ACTIONS_STORE_NAME } = dbStoreEnum;

const { READWRITE } = dbModeEnum;

const _setAction = async ({ data, _id = null, needUpdateTime = true, transaction = null }) => {
    if (!schemaHelper.action.checkEditableFields(data) || (_id && !schemaHelper.action.validator._id(_id))) {
        throw errorHelper.create.validation('_setAction', { data, _id, needUpdateTime });
    }

    const record = {};
    schemaHelper.action.editableFields.forEach(field => {
        record[field] = data[field];
    });

    if (_id) {
        record._id = _id;
    } else {
        record._id = uuidv4();
    }
    if (needUpdateTime || !data._updatedAt) {
        record._updatedAt = dayjs().format();
    } else if (dayjs(data._updatedAt).format() === data._updatedAt) {
        record._updatedAt = data._updatedAt;
    } else {
        throw errorHelper.create.validation('_setAction', { needUpdateTime, data });
    }

    let tx = transaction;
    try {
        const db = getDBInstanse();
        tx ||= db.transaction([ACTIONS_STORE_NAME], READWRITE);

        await tx.objectStore(ACTIONS_STORE_NAME).put(record);
        if (!transaction) {
            await tx.done;
        }
        return record;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const _deleteAction = async ({ _id, transaction = null }) => {
    if (!_id || !schemaHelper.action.validator._id(_id)) {
        throw errorHelper.create.validation('_deleteAction', { _id });
    }

    let tx = transaction;
    try {
        const db = getDBInstanse();
        tx ||= db.transaction([ACTIONS_STORE_NAME], READWRITE);
        await tx.objectStore(ACTIONS_STORE_NAME).delete(_id);
        if (!transaction) {
            await tx.done;
        }
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

export { _setAction, _deleteAction };
