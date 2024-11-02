import dayjs from 'dayjs';

const getISOYearMonthString = value => {
    return dayjs(value).format('YYYY-MM');
};

const getISOYearMonthFromISODateString = value => {
    return value.slice(0, 7);
};

const getISODateString = value => {
    return dayjs(value).format('YYYY-MM-DD');
};

const getSeparatedNumber = (value, options = {}) => new Intl.NumberFormat('ru-RU', { ...options }).format(value);

const getCurrency = (value, accuracy = 2) => {
    return getSeparatedNumber(value, {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: accuracy,
    });
};

const getEuropeanDateNecessary = date => {
    const dateObj = dayjs(date);
    let displayedDate = dateObj.format('D MMMM');

    if (dateObj.year() !== dayjs().year()) {
        displayedDate += ` ${dayjs().year()} г.`;
    }

    return displayedDate;
};

const getRelativeDay = (date, firstCapitalized = false) => {
    const now = getISODateString();
    const dateTruncated = getISODateString(date);

    let diff = dayjs(now).diff(dateTruncated, 'day');
    if (dateTruncated < now) {
        diff *= -1;
    }

    let name;
    switch (diff) {
        case -2:
            name = 'позавчера';
            break;
        case -1:
            name = 'вчера';
            break;
        case 0:
            name = 'сегодня';
            break;
        case 1:
            name = 'завтра';
            break;
        case 2:
            name = 'послезавтра';
            break;
        default:
            name = null;
    }

    if (!name) return name;

    return firstCapitalized ? getFirstCapitalized(name) : name;
};

const getWeekDay = (date, firstCapitalized = false) => {
    const day = dayjs(date).day();
    const name = [
        //
        'понедельник',
        'вторник',
        'среда',
        'четверг',
        'пятница',
        'суббота',
        'воскресенье',
    ][day];

    return firstCapitalized ? getFirstCapitalized(name) : name;
};

const getWeekDayShort = date => {
    const day = dayjs(date).day();
    return ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'][day];
};

const getFirstCapitalized = value => {
    return value[0].toUpperCase() + value.slice(1);
};

const formatHelper = {
    getISODateString,
    getISOYearMonthString,
    getISOYearMonthFromISODateString,
    getEuropeanDateNecessary,
    getSeparatedNumber,
    getCurrency,
    getRelativeDay,
    getWeekDay,
    getWeekDayShort,
    getFirstCapitalized,
};

export default formatHelper;
