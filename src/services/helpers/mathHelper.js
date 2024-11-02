const round = (value, decimalCount = 2) => {
    const multiplier = decimalCount * 10 || 1;
    return Math.round(value * multiplier) / multiplier;
};

const mathHelper = {
    round,
};

export default mathHelper;
