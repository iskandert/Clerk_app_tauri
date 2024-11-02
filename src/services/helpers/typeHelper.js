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
    return getIsNumber(value) && value > 0;
};

const getIsBooleanNumber = value => {
    return getIsNumber(value) && [0, 1].includes(value);
};

const getIsISOYearMonthString = value => {
    return getIsString(value) && dayjs(value).format('YYYY-MM') === value;
};

const getIsISODateString = value => {
    return getIsString(value) && dayjs(value).format('YYYY-MM-DD') === value;
};

const getIsISORawDateString = value => {
    return getIsString(value) && dayjs(value).format() === value;
};

const getIsNull = value => {
    return value === null;
};

const getIsObject = value => {
    return typeof value === 'object' && !Array.isArray(value) && !getIsNull(value);
};

const typeHelper = {
    getIsBoolean,
    getIsString,
    getIsNumber,
    getIsBooleanNumber,
    getIsPositiveNumber,
    getIsISOYearMonthString,
    getIsISODateString,
    getIsISORawDateString,
    getIsNull,
    getIsObject,
};

export default typeHelper;
