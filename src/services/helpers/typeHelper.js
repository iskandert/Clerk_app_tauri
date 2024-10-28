import dayjs from 'dayjs';

const getIsBoolean = value => {
    return typeof value === 'boolean';
};

const getIsString = value => {
    return typeof value === 'string';
};

const getIsNumber = value => {
    return typeof value === 'number';
};

const getIsPositiveNumber = value => {
    return isNumber(value) && value > 0;
};

const getIsISOYearMonthString = value => {
    return isString(value) && dayjs(value).format('YYYY-MM') === value;
};

const getIsISODateString = value => {
    return isString(value) && dayjs(value).format('YYYY-MM-DD') === value;
};

const getIsISORawDateString = value => {
    return isString(value) && dayjs(value).format() === value;
};

const getIsNull = value => {
    return value === null;
};

const getIsObject = value => {
    return typeof value === 'object' && !Array.isArray(value) && !isNull(value);
};

const typeHelper = {
    getIsBoolean,
    getIsString,
    getIsNumber,
    getIsPositiveNumber,
    getIsISOYearMonthString,
    getIsISODateString,
    getIsISORawDateString,
    getIsNull,
    getIsObject,
};

export default typeHelper;
