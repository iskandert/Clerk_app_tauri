import { categoryStatusEnum, categoryTypeEnum } from '../constants';

const dbStoreEnum = {
    CATEGORIES_STORE_NAME: 'categories',
    ACTIONS_STORE_NAME: 'actions',
    PLANS_STORE_NAME: 'plans',
    CHECKS_STORE_NAME: 'checks',
    CONFIG_STORE_NAME: 'config',
};

const dbIndexEnum = {
    CATEGORY_ID_INDEX: 'category_id',
    DATE_INDEX: 'date',
    CATEGORY_ID_AND_DATE_INDEX: 'category_id_and_date',
    NAME_INDEX: 'name',
    STATUS_INDEX: 'status',
    TYPE_INDEX: 'type',
    IS_ACCOUNTED_INDEX: 'isAccounted',
    IS_ACCOUNTED_AND_STATUS_AND_TYPE_INDEX: 'isAccounted_and_status_and_type',
    STATUS_AND_TYPE_INDEX: 'status_and_type',
    STATUS_AND_TYPE_AND_NAME_INDEX: 'status_and_type_and_name',
};

const dbModeEnum = {
    READWRITE: 'readwrite',
    READONLY: 'readonly',
};

const dbSettings = {
    DB_NAME: 'clerk-app',
    DB_VERSION: 1,
};

const categoryAccountedNames = {
    [categoryStatusEnum.INCOME]: {
        [categoryTypeEnum.DEFAULT]: [
            //
            'Зарплата',
            'Подарки',
            'Банк начисления',
        ],
        [categoryTypeEnum.SAVINGS]: [
            //
            'Из накоплений',
        ],
    },
    [categoryStatusEnum.EXPENSE]: {
        [categoryTypeEnum.DEFAULT]: [
            //
            'Еда',
            'Рестораны',
            'ЖКХ',
            'Жилье',
            'Связь',
            'Крупные траты',
            'Спорт',
            'Одежда',
            'Подарки',
            'Путешествия',
            'Развлечения',
            'Транспорт',
            'Такси',
            'Здоровье',
            'Бытовое',
            'Прочее',
        ],
        [categoryTypeEnum.SAVINGS]: [
            //
            'Накопления',
        ],
    },
};

const categoryUnaccountedNames = {
    [categoryStatusEnum.INCOME]: {
        [categoryTypeEnum.DEFAULT]: 'Неучтенные доходы',
        [categoryTypeEnum.SAVINGS]: 'Неучтенный вывод',
    },
    [categoryStatusEnum.EXPENSE]: {
        [categoryTypeEnum.DEFAULT]: 'Неучтенные расходы',
        [categoryTypeEnum.SAVINGS]: 'Неучтенные накопления',
    },
};

export { dbStoreEnum, dbSettings, dbIndexEnum, dbModeEnum, categoryAccountedNames, categoryUnaccountedNames };
