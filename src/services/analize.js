const getIsNormalDistribution = (data, threshold = 0.05) => {
    // тест Шапиро-Уилка
    // Сортируем данные
    const sortedData = data.slice().sort((a, b) => a - b);
    const n = sortedData.length;

    // Вычисляем коэффициенты W
    const mean = sortedData.reduce((acc, val) => acc + val, 0) / n;
    const deviations = sortedData.map(value => value - mean);
    const sumSquaredDeviations = deviations.reduce((acc, val) => acc + val * val, 0);
    const W =
        Math.pow(
            deviations.reduce((acc, val, i) => acc + val * sortedData[n - 1 - i], 0),
            2
        ) /
        sumSquaredDeviations /
        (n * n);

    // Вычисляем статистику теста
    const mu = -1.272145 + 1.05162 / Math.sqrt(n);
    const sigma = 1.0304 - 0.08465 / Math.sqrt(n);
    const z = Math.log(W);
    const Z = (z - mu) / sigma;

    // Вычисляем p-значение
    const p = 1 - Math.exp(-Math.exp(Z));

    // Возвращаем результат теста
    return {
        statistic: W,
        pValue: p,
        isNormal: p > threshold,
    };
};

const getStandardDeviation = data => {
    // data: number[]
    const n = data.length;
    if (!n) return 0;
    const mean = data.reduce((acc, val) => acc + val, 0) / n;
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / n;
    return Math.sqrt(variance);
};

const getIdsInNormalDistribution = data => {
    // data: { _id, value: number }
    // проверка по правилу 3-х сигм
    const dataStdDevs = data.map(({ value }) => value);
    const stdDev = getStandardDeviation(dataStdDevs);
    if (getIsNormalDistribution(dataStdDevs).isNormal) {
        const mean = dataStdDevs.reduce((sum, curr) => sum + curr, 0) / data.length;
        const lowerBound = mean - 3 * stdDev;
        const upperBound = mean + 3 * stdDev;

        return data
            .filter(({ value }) => value >= lowerBound && value <= upperBound)
            .map(({ _id }) => _id);
    } else {
        return data.map(({ _id }) => _id);
    }
};

const getPearsonCorrelation = (dataX, dataY, threshold = 0.05) => {
    // Вычисляем количество элементов в массиве
    const n = dataX.length;
    // Инициализируем переменные для сумм
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    // Вычисляем суммы всех значений и их произведений
    for (let i = 0; i < n; i++) {
        sumX += dataX[i];
        sumY += dataY[i];
        sumXY += dataX[i] * dataY[i];
        sumX2 += dataX[i] * dataX[i];
        sumY2 += dataY[i] * dataY[i];
    }

    // Вычисляем числитель и знаменатель формулы коэффициента корреляции Пирсона
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    if (denominator === 0) {
        return { k: 0 };
    }
    const k = numerator / denominator;

    return {
        k,
        isPositive: k >= threshold,
        isNegative: k <= -threshold,
    };
};

const getSmirnovStatistic = matrix => {
    const rows = Object.keys(matrix); // Количество строк в матрице
    const cols = Object.keys(matrix[Object.keys(matrix)[0]]); // Количество столбцов (выборок) в матрице
    let n = 0; // Общее количество наблюдений
    let gammaN = 0; // Статистика Колмогорова-Смирнова

    const nu_idot = Object.fromEntries(rows.map(row => [row, 0]));
    const nu_dotj = Object.fromEntries(cols.map(col => [col, 0]));
    const deviations = Object.fromEntries(
        rows.map(row => [row, Object.fromEntries(cols.map(col => [col, undefined]))])
    );

    // Заполнение nu_dotj и nu_idot и подсчет n
    for (const i of rows) {
        for (const j of cols) {
            nu_idot[i] += matrix[i][j];
            nu_dotj[j] += matrix[i][j];
            n += matrix[i][j];
        }
    }

    // Вычисление статистики Колмогорова-Смирнова
    for (const i of rows) {
        for (const j of cols) {
            const nu_ij = matrix[i][j];
            const nu_teoretical = (nu_idot[i] * nu_dotj[j]) / n;
            const term1 = nu_ij - nu_teoretical;
            const term2 = nu_idot[i] * nu_dotj[j];

            gammaN += (term1 * term1) / term2;
            deviations[i][j] = nu_ij / nu_teoretical;
        }
    }

    gammaN = n * gammaN;

    return { gammaN, deviations };
};

const getLinearRegression = (coordsList, pKoef) => {
    const n = coordsList.length;
    let x_sum = 0;
    let y_sum = 0;
    let x_squares_sum = 0;
    let y_squares_sum = 0;

    let x_min = undefined;
    let x_max = undefined;
    let y_min = undefined;
    let y_max = undefined;

    for (const { x, y } of coordsList) {
        x_sum += x;
        y_sum += y;
        x_squares_sum += x ** 2;
        y_squares_sum += y ** 2;

        x_min = x_min === undefined ? x : Math.min(x_min, x)
        y_min = y_min === undefined ? y : Math.min(y_min, y)
        x_max = x_max === undefined ? x : Math.max(x_max, x)
        y_max = y_max === undefined ? y : Math.max(y_max, y)
    }

    const x_mean = x_sum / n;
    const y_mean = y_sum / n;
    const x_squares_mean = x_squares_sum / n;
    const y_squares_mean = y_squares_sum / n;

    const beta_x = (x_squares_mean - x_mean ** 2) ** 0.5;
    const beta_y = (y_squares_mean - y_mean ** 2) ** 0.5;

    const a = pKoef * beta_y / beta_x;
    const b = (beta_x * y_mean - pKoef * beta_y * x_mean) / beta_x;

    const getY = (x) => {
        return a * x + b;
    } 

    let numerator = 0;
    let denominator = 0;

    for (const { x, y } of coordsList) {
        numerator += (getY(x) - y_mean) ** 2;
        denominator += (y - y_mean) ** 2;
    }

    let r_2;
    if (!denominator) {
        r_2 = 0;
    } else {
        r_2 = numerator / denominator;
    }

    return {
        y: getY,
        mathString: `y = ${a.toFixed(2)}x ${b < 0 ? '-' : '+'} ${Math.abs(b).toFixed(2)}`,
        bounds: [
            { x: x_min, y: y_min },
            { x: x_max, y: y_max },
        ],
        r_2,
    }
};

export {
    getStandardDeviation,
    getIdsInNormalDistribution,
    getPearsonCorrelation,
    getSmirnovStatistic,
    getLinearRegression,
};
