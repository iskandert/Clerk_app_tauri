import { deleteDB, openDB } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import errorHelper from './helpers/errorHelper';
import schemaHelper from './helpers/schemaHelper';
import { categoryStatusEnum, categoryTypeEnum } from './constants';
import formatHelper from './helpers/formatHelper';
import dayjs from 'dayjs';
import typeHelper from './helpers/typeHelper';
import {
    categoryAccountedNames,
    categoryUnaccountedNames,
    dbIndexEnum,
    dbModeEnum,
    dbSettings,
    dbStoreEnum,
} from './db/config';
import { transformData } from './db/transform';
import { getDBInstanse, setDBInstanse } from './db/instance';
import { _setCategory, _setInitialCategories } from './db/repository/categories';
import { _setConfigField, _setInitialConfigStart, _updateConfigStart } from './db/repository/config';
import { _getCheckFirst, _setCheck } from './db/repository/checks';
import { _setAction } from './db/repository/actions';
import { _setPlan } from './db/repository/plans';
import { ensurePastPlans } from './db/model/plans';

const { DB_NAME, DB_VERSION } = dbSettings;

const {
    //
    CATEGORIES_STORE_NAME,
    ACTIONS_STORE_NAME,
    PLANS_STORE_NAME,
    CHECKS_STORE_NAME,
    CONFIG_STORE_NAME,
} = dbStoreEnum;

const {
    //
    DATE_INDEX,
    CATEGORY_ID_AND_DATE_INDEX,
    IS_ACCOUNTED_INDEX,
    IS_ACCOUNTED_AND_STATUS_AND_TYPE_INDEX,
    STATUS_AND_TYPE_INDEX,
} = dbIndexEnum;

const { READONLY, READWRITE } = dbModeEnum;

const initDB = async () => {
    const db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            const categoriesVault = db.createObjectStore(CATEGORIES_STORE_NAME, { keyPath: '_id' });
            const actionsVault = db.createObjectStore(ACTIONS_STORE_NAME, { keyPath: '_id' });
            const plansVault = db.createObjectStore(PLANS_STORE_NAME, { keyPath: '_id' });
            db.createObjectStore(CHECKS_STORE_NAME, { keyPath: 'date' });
            db.createObjectStore(CONFIG_STORE_NAME);

            categoriesVault.createIndex(IS_ACCOUNTED_INDEX, '_isAccounted');
            categoriesVault.createIndex(IS_ACCOUNTED_AND_STATUS_AND_TYPE_INDEX, ['_isAccounted', 'status', 'type']);
            categoriesVault.createIndex(STATUS_AND_TYPE_INDEX, ['status', 'type']);

            actionsVault.createIndex(DATE_INDEX, 'date');
            actionsVault.createIndex(CATEGORY_ID_AND_DATE_INDEX, ['category_id', 'date']);

            plansVault.createIndex(DATE_INDEX, 'date');
            plansVault.createIndex(CATEGORY_ID_AND_DATE_INDEX, ['category_id', 'date']);
        },
        blocked() {
            //
        },
        blocking() {
            //
        },
        terminated() {
            //
        },
    });

    setDBInstanse(db);
};

const closeDB = async () => {
    try {
        getDBInstanse().close();
    } catch (error) {
        //
    }
};

const destroyDB = async () => {
    try {
        closeDB();
        await deleteDB(DB_NAME, {
            blocked() {
                //
            },
        });
    } catch (error) {
        //
    }
};

const setupInitialDB = async () => {
    let tx;
    try {
        const db = getDBInstanse();
        tx = db.transaction(db.objectStoreNames, READWRITE);

        await _setInitialCategories({ transaction: tx });
        await _setInitialConfigStart({ transaction: tx });
        await tx.done;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const fillDB = async data => {
    let tx;
    try {
        const db = getDBInstanse();
        tx = db.transaction(db.objectStoreNames, READWRITE);

        if (!data) {
            throw errorHelper.create.validation('fillDB', { data });
        }

        const isV0 = !data.version;
        console.log(data.version);

        data = transformData(data);

        // if (
        //     !Array.isArray(data[CATEGORIES_STORE_NAME]) ||
        //     !Array.isArray(data[ACTIONS_STORE_NAME]) ||
        //     !Array.isArray(data[PLANS_STORE_NAME]) ||
        //     !Array.isArray(data[CHECKS_STORE_NAME]) ||
        //     !typeHelper.getIsObject(data[CONFIG_STORE_NAME])
        // ) {
        //     throw errorHelper.create.validation();
        // }

        console.log(CATEGORIES_STORE_NAME, data[CATEGORIES_STORE_NAME]);
        console.log(ACTIONS_STORE_NAME, data[ACTIONS_STORE_NAME]);
        console.log(PLANS_STORE_NAME, data[PLANS_STORE_NAME]);
        console.log(CHECKS_STORE_NAME, data[CHECKS_STORE_NAME]);
        console.log(CONFIG_STORE_NAME, data[CONFIG_STORE_NAME]);

        await Promise.all(
            data[CATEGORIES_STORE_NAME].map(async data => {
                return await _setCategory({
                    data,
                    _id: data._id,
                    isAccounted: !!data._isAccounted,
                    needUpdateTime: false,
                    transaction: tx,
                });
            })
        );

        await Promise.all(
            data[ACTIONS_STORE_NAME].map(async data => {
                return await _setAction({
                    data,
                    _id: data._id,
                    needUpdateTime: false,
                    transaction: tx,
                });
            })
        );

        await Promise.all(
            data[PLANS_STORE_NAME].map(async data => {
                return await _setPlan({
                    data,
                    _id: data._id,
                    needUpdateTime: false,
                    transaction: tx,
                });
            })
        );

        await Promise.all(
            data[CHECKS_STORE_NAME].map(async data => {
                return await _setCheck({
                    data,
                    _id: data._id,
                    needUpdateTime: false,
                    transaction: tx,
                });
            })
        );

        await Promise.all(
            Object.entries(data[CONFIG_STORE_NAME]).map(async ([key, value]) => {
                return await _setConfigField({
                    key,
                    value,
                    transaction: tx,
                });
            })
        );

        await ensurePastPlans(tx);
        if (isV0) {
            const firstCheck = await _getCheckFirst({ transaction: tx });
            if (firstCheck) {
                await _updateConfigStart({ firstCheck, transaction: tx });
            }
        }

        await tx.done;
    } catch (error) {
        try {
            tx?.abort();
        } catch {}
        errorHelper.throwCustomOrInternal(error);
    }
};

const dumpDB = async () => {
    try {
        const db = getDBInstanse();
        const tx = db.transaction(db.objectStoreNames, READONLY);

        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);
        const actionsStore = tx.objectStore(ACTIONS_STORE_NAME);
        const plansStore = tx.objectStore(PLANS_STORE_NAME);
        const checksStore = tx.objectStore(CHECKS_STORE_NAME);
        const configStore = tx.objectStore(CONFIG_STORE_NAME);

        const result = {
            version: DB_VERSION,
        };

        result[CATEGORIES_STORE_NAME] = await categoriesStore.getAll();
        result[ACTIONS_STORE_NAME] = await actionsStore.getAll();
        result[PLANS_STORE_NAME] = await plansStore.getAll();
        result[CHECKS_STORE_NAME] = await checksStore.getAll();

        const configKeys = await configStore.getAllKeys();
        const configRecords = await Promise.all(
            configKeys.map(async key => {
                const value = await configStore.get(key);
                return [key, value];
            })
        );
        result[CONFIG_STORE_NAME] = Object.fromEntries(configRecords);

        await tx.done;
        return result;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

const hasDataInDB = async () => {
    try {
        const db = getDBInstanse();
        const tx = db.transaction([CATEGORIES_STORE_NAME], READONLY);
        const categoriesStore = tx.objectStore(CATEGORIES_STORE_NAME);

        const records = await categoriesStore.getAll();
        return !!records.length;
    } catch (error) {
        errorHelper.throwCustomOrInternal(error);
    }
};

export default {
    initDB,
    setupInitialDB,
    closeDB,
    destroyDB,
    fillDB,
    dumpDB,
    hasDataInDB,
};
