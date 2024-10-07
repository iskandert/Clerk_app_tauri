const getISOYearMonthString = value => {
    return dayjs(value).format('YYYY-MM');
};

const getISOYearMonthFromISODateString = value => {
    return value.slice(0, 7);
};

const getISODateString = value => {
    return dayjs(value).format('YYYY-MM-DD');
};

export default {
    getISODateString,
    getISOYearMonthString,
    getISOYearMonthFromISODateString,
};
