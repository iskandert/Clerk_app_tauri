import formatHelper from '../helpers/formatHelper';
import { categoryUnaccountedNames, dbSettings, dbStoreEnum } from './config';

const transformData = (data, version = dbSettings.DB_VERSION) => {
    if (data.version === version) {
        return data;
    }

    let transformedData;
    if (!data.version) {
        transformedData = getV1FromV0(data);
        // TODO every version in future
        // } else if (data.version === 1) {
        // transformedData = getV2FromV1(data);
    } else {
        return {};
    }

    return transformData(transformedData, version);
};

const getV1FromV0 = data => {
    const {
        //
        CATEGORIES_STORE_NAME,
        ACTIONS_STORE_NAME,
        PLANS_STORE_NAME,
        CHECKS_STORE_NAME,
        CONFIG_STORE_NAME,
    } = dbStoreEnum;

    const result = {
        version: 1,
        [CATEGORIES_STORE_NAME]: [],
        [ACTIONS_STORE_NAME]: [],
        [PLANS_STORE_NAME]: [],
        [CHECKS_STORE_NAME]: [],
        [CONFIG_STORE_NAME]: {},
    };

    const normalizedData = Object.fromEntries(data.map(({ field, data }) => [field, data]));

    normalizedData[CATEGORIES_STORE_NAME].forEach(record => {
        result[CATEGORIES_STORE_NAME].push({
            _id: record._id,
            status: record.status,
            type: record.type,
            name: record.name,
            isAccounted: true,
            _updatedAt: record._createdAt,
        });
    });

    for (const status in categoryUnaccountedNames) {
        for (const type in categoryUnaccountedNames[status]) {
            result[CATEGORIES_STORE_NAME].push({
                status,
                type,
                name: categoryUnaccountedNames[status][type],
                isAccounted: false,
            });
        }
    }

    normalizedData[ACTIONS_STORE_NAME].forEach(record => {
        if (!result[CATEGORIES_STORE_NAME].map(({ _id }) => _id).includes(record.category_id)) {
            return;
        }

        result[ACTIONS_STORE_NAME].push({
            _id: record._id,
            category_id: record.category_id,
            sum: record.sum,
            date: formatHelper.getISODateString(record.date),
            comment: record.comment,
            _updatedAt: record._createdAt,
        });
    });

    normalizedData[PLANS_STORE_NAME].forEach(record => {
        if (!result[CATEGORIES_STORE_NAME].map(({ _id }) => _id).includes(record.category_id)) {
            return;
        }

        result[PLANS_STORE_NAME].push({
            _id: record._id,
            category_id: record.category_id,
            sum: record.sum,
            date: record.date,
            comment: record.comment,
            _updatedAt: record._createdAt,
        });
    });

    const {
        //
        start_balance,
        start_savings,
        checked_balance,
        checked_savings,
        checking_date,
    } = normalizedData[CONFIG_STORE_NAME];

    result[CONFIG_STORE_NAME].start_default_sum = start_balance;
    result[CONFIG_STORE_NAME].start_savings_sum = start_savings;

    result[CHECKS_STORE_NAME].push({
        date: formatHelper.getISODateString(checking_date),
        default_sum: checked_balance,
        savings_sum: checked_savings,
    });

    return result;
};

export { transformData };
