<template>
    <el-card>
        <h4>Корреляция категорий бюджета</h4>
        <div class="content">
            <div class="controls">
                <el-badge :is-dot="hasSettings">
                    <el-button
                        :size="isMobileSize ? 'large' : ''"
                        :icon="iconDataAnalysis"
                        type="primary"
                        round
                        @click="isOpened = true"
                    >
                        Выбрать данные
                    </el-button>
                </el-badge>
                <el-checkbox
                    v-model="isRangedValues"
                    label="Сортировка по возрастанию"
                />
                <el-checkbox
                    v-model="isRelativeSums"
                    label="Относительные значения"
                />
            </div>
            <div
                v-if="sums"
                class="result"
                :style="correlationBackgroundColor"
            >
                <div class="koef"><i style="">ρ</i> = {{ correlation.k.toFixed(2) }}</div>
                <div class="title">{{ correlation.title }}{{ correlation.type ? ',' : '' }}</div>
                <div class="type">
                    {{ correlation.type }}
                </div>
            </div>
        </div>
        <div
            v-if="sums"
            class="charts-container"
        >
            <div class="chart-container">
                <Line
                    :data="dataLine"
                    :options="optionsLine"
                />
            </div>
            <!-- </div>
        <div
            v-if="sums"
            class="chart-container"
        > -->
            <div class="chart-container">
                <Scatter
                    :data="dataScatter"
                    :options="optionsScatter"
                />
            </div>
        </div>
    </el-card>

    <el-dialog
        width="min(100vw, 500px)"
        v-model="isOpened"
        :append-to-body="true"
        :before-close="() => handleCancelStatistic()"
        :destroy-on-close="true"
    >
        <template #header>
            <h4>Настроить корреляцию</h4>
        </template>
        <AnaliticCorrelationForm
            @call-to-end="handleCancelStatistic"
            :categories_ids="categoryIds"
            :dates="dates"
            class="dialog"
        />
    </el-dialog>
</template>
<script setup>
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Scatter } from 'vue-chartjs';
import { dayjs, getCssVar, getFormattedCount } from '../services/utils';
import { ref, shallowRef, computed } from 'vue';
import store from '../store';
import { DataAnalysis } from '@element-plus/icons-vue';
import AnaliticCorrelationForm from './AnaliticCorrelationForm.vue';
import { getLinearRegression, getPearsonCorrelation } from '../services/analize';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const iconDataAnalysis = shallowRef(DataAnalysis);

const CORRELATION_STEPS = [
    { k: 0.05, title: 'Нет корреляции' },
    { k: 0.3, title: 'Слабая корреляция' },
    { k: 0.5, title: 'Умеренная корреляция' },
    { k: 0.7, title: 'Заметная корреляция' },
    { k: 0.9, title: 'Высокая корреляция' },
    { k: 1.1, title: 'Весьма высокая корреляция' },
];

const isOpened = ref(false);
const isRangedValues = ref(false);
const isRelativeSums = ref(true);
const categoryIds = ref([]);
const dates = ref([]);

const hasSettings = computed(() => {
    return categoryIds.value?.length && dates.value?.length;
});
const isMobileSize = computed(() => {
    return store.getters['getWindowSizeState'];
});
const plansStored = computed(() => {
    return store.getters.getData('plans') || [];
});
const plansCalc = computed(() => {
    return store.getters.getCalcs('plansIdsByDatesByCategoriesIds') || {};
});
const plansIndexes = computed(() => {
    return store.getters.getCalcs('plansIndexesByIds') || {};
});
const categoriesStored = computed(() => {
    return store.getters.getData('categories');
});
const categoriesChecked = computed(() => {
    return Object.fromEntries(
        categoryIds.value.map(id => [id, categoriesStored.value.find(({ _id }) => _id === id)])
    );
});
const sums = computed(() => {
    if (!categoryIds.value.length) return null;
    let category_a_sum = 0;
    let category_b_sum = 0;

    return dates.value
        .map(date => {
            const getSumByCategoryId = category_id => {
                return (
                    plansStored.value?.[
                        plansIndexes.value?.[plansCalc.value?.[date]?.[category_id]]
                    ]?.sum || 0
                );
            };

            const sum_a = getSumByCategoryId(categoryIds.value[0]);
            const sum_b = getSumByCategoryId(categoryIds.value[1]);
            category_a_sum += sum_a;
            category_b_sum += sum_b;

            return {
                sum_a,
                sum_b,
                date: dayjs(date).format('YYYY MMMM'),
            };
        })
        .map(data => ({
            ...data,
            nu_a: +(data.sum_a / category_a_sum).toFixed(4),
            nu_b: +(data.sum_b / category_b_sum).toFixed(4),
        }));
});
const sumsRanged = computed(() => {
    if (!isRangedValues.value) return sums.value;
    return sums.value.slice().sort(({ sum_a: sum1 }, { sum_a: sum2 }) => {
        if (sum1 < sum2) return -1;
        if (sum1 > sum2) return 1;
        return 0;
    });
});
const correlation = computed(() => {
    const dataA = [];
    const dataB = [];
    sums.value.forEach(data => {
        dataA.push(data.sum_a);
        dataB.push(data.sum_b);
    });
    const result = getPearsonCorrelation(dataA, dataB);
    for (const { k, title } of CORRELATION_STEPS) {
        if (Math.abs(result.k) < k) {
            result.title = title;
            break;
        }
    }
    if (result.isNegative) {
        result.type = 'отрицательная';
    } else if (result.isPositive) {
        result.type = 'положительная';
    }
    return result;
});
const correlationBackgroundColor = computed(() => {
    const diff = correlation.value.k * 100;
    let isLess = diff < 0;

    let prefix = 'background-color:';
    const middleColor = 'var(--el-color-gray-light-3)';

    if (!diff) return prefix + middleColor;

    const diffAbs = Math.min(Math.abs(diff), 100);
    let endColor = 'var(--el-color-success-dark-2)';
    if (isLess) {
        endColor = 'var(--el-color-warning-dark-2)';
    }
    return prefix + `color-mix(in srgb, ${middleColor} ${100 - diffAbs}%, ${endColor})`;
});
const dataLine = computed(() => {
    return {
        labels: sumsRanged.value.map(({ date }) => date),
        datasets: [
            {
                label: categoriesChecked.value[categoryIds.value[0]].name,
                data: sumsRanged.value.map(({ sum_a, nu_a }) =>
                    !isRelativeSums.value ? sum_a : nu_a
                ),
                backgroundColor: getCssVar('--el-color-primary'),
                borderColor: getCssVar('--el-color-primary-light-3'),
            },
            {
                label: categoriesChecked.value[categoryIds.value[1]].name,
                data: sumsRanged.value.map(({ sum_b, nu_b }) =>
                    !isRelativeSums.value ? sum_b : nu_b
                ),
                backgroundColor: getCssVar('--el-color-danger'),
                borderColor: getCssVar('--el-color-danger-light-3'),
            },
        ],
    };
});
const optionsLine = computed(() => {
    return {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
            point: {
                radius: 5,
                hoverRadius: 7,
            },
            line: {
                cubicInterpolationMode: 'monotone',
            },
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Месяц',
                },
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: isRelativeSums.value
                        ? 'Доля в сумме месяцев по категории'
                        : 'Сумма по категории',
                },
            },
        },
        plugins: {
            legend: {
                display: true,
                labels: {
                    usePointStyle: true,
                },
            },
        },
    };
});
const dataScatter = computed(() => {
    const coordsList = sums.value.map(({ sum_a, sum_b, nu_a, nu_b }) => ({
        x: !isRelativeSums.value ? sum_a : nu_a,
        y: !isRelativeSums.value ? sum_b : nu_b,
    }));

    // console.log(
    //     'a',
    //     sums.value
    //         .map(({ sum_a }) => sum_a)
    //         .join('\n')
    //         .replaceAll('.', ',')
    // );
    // console.log(
    //     'b',
    //     sums.value
    //         .map(({ sum_b }) => sum_b)
    //         .join('\n')
    //         .replaceAll('.', ',')
    // );
    const datasets = [
        {
            label: 'Корреляционное поле',
            data: coordsList,
            backgroundColor: getCssVar('--el-color-success'),
            borderColor: getCssVar('--el-color-success-light-3'),
            order: 2,
        },
    ];

    if (Math.abs(correlation.value.k) >= 0.7) {
        // const regression = getLinearRegression(coordsList, correlation.value.k);
        const regression = getLinearRegression(coordsList, Math.abs(correlation.value.k));
        const x_min = regression.bounds[0].x * 0.5;
        const x_max = regression.bounds[1].x * 1.2;

        datasets.push({
            label: `Линейная регрессия ${regression.mathString}, R2 = ${regression.r_2.toFixed(
                2
            )}`.replaceAll('.', ','),
            type: 'line',
            data: [
                { x: x_min, y: regression.y(x_min) },
                // { x: 0.5, y: regression.y(0.5) },
                { x: x_max, y: regression.y(x_max) },
            ],
            backgroundColor: getCssVar('--el-color-warning'),
            borderColor: getCssVar('--el-color-warning-light-3'),
            order: 1,
        });
    }

    return {
        datasets,
    };
});
const optionsScatter = computed(() => {
    return {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
            point: {
                radius: 5,
                hoverRadius: 7,
            },
            line: {
                cubicInterpolationMode: 'monotone',
            },
        },
        datasets: {
            line: {
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 0,
                    },
                },
            },
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: `${isRelativeSums.value ? 'Доли по' : 'Суммы'} категории "${
                        categoriesChecked.value[categoryIds.value[0]].name
                    }"`,
                },
                beginAtZero: true,
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: `${isRelativeSums.value ? 'Доли по' : 'Суммы'} категории "${
                        categoriesChecked.value[categoryIds.value[1]].name
                    }"`,
                },
                beginAtZero: true,
            },
        },
        plugins: {
            legend: {
                display: true,
                labels: {
                    usePointStyle: true,
                },
            },
        },
    };
});

const handleCancelStatistic = result => {
    if (result) {
        categoryIds.value = result.categories_ids;
        dates.value = result.dates;
    }
    isOpened.value = false;
};
</script>
<style scoped>
.charts-container {
    margin-top: 8px;
    display: grid;
    grid-template-columns: 1fr 60vh;
    overflow: auto;
}
@media (max-width: 992px) {
    .charts-container {
        grid-template-columns: 1fr;
    }
}
.chart-container {
    height: 60vh;
}
.content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}
.controls {
    display: grid;
}
.controls > :first-child {
    margin-bottom: 8px;
}
.result {
    color: white;
    padding: 8px;
    border-radius: 8px;
}
.koef {
    font-weight: bold;
}
.scrollbar-content {
    height: 10px;
    width: 200vw;
}
</style>
