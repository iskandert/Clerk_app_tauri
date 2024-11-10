<template>
    <el-card>
        <h4>Динамика остатка по месяцам</h4>
        <p v-if="!balances">Загрузка...</p>
        <div
            v-else
            class="chart-container"
        >
            <Line
                :data="data"
                :options="options"
            />
        </div>
    </el-card>
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
import { Line } from 'vue-chartjs';
import { getCssVar, getFormattedCount } from '../services/utils';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import dbController from '../services/db/controller';
import dayjs from 'dayjs';
import emitHelper from '../services/helpers/emitHelper';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const balances = ref(null);

const data = computed(() => {
    return {
        labels: balances.value.map(({ date }) => date),
        datasets: [
            {
                label: 'Остаток',
                data: balances.value.map(balance => balance.default),
                backgroundColor: getCssVar('--el-color-gray-light-5'),
                borderColor: getCssVar('--el-color-gray-light-3'),
                fill: {
                    target: true,
                    above: getCssVar('--el-color-gray-light-5') + '40',
                    below: getCssVar('--el-color-danger') + '40',
                },
                tooltip: {
                    callbacks: {
                        label: context => {
                            return ' ' + getFormattedCount(context.raw, { accuracy: 0 }) + ' - остаток';
                        },
                    },
                },
            },
            {
                label: 'C накоплениями',
                data: balances.value.map(({ total }) => total),
                backgroundColor: getCssVar('--el-color-primary'),
                borderColor: getCssVar('--el-color-primary-light-3'),
                fill: {
                    target: 0,
                    above: getCssVar('--el-color-primary') + '40',
                    below: getCssVar('--el-color-gray-light-5') + '40',
                },
                tooltip: {
                    callbacks: {
                        label: context => {
                            return (
                                ' ' +
                                getFormattedCount(balances.value[context.dataIndex].savings || 0, { accuracy: 0 }) +
                                ' - накопления'
                            );
                        },
                        beforeLabel: context => {
                            return ' ' + getFormattedCount(context.raw, { accuracy: 0 }) + ' - с остатком';
                        },
                    },
                },
            },
        ],
    };
});
const options = computed(() => {
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
            y: {
                min: Math.min(0, ...balances.value.map(balance => balance.default)) && undefined,
                max: Math.max(0, ...balances.value.map(({ total }) => total)) && undefined,
            },
        },
        plugins: {
            legend: {
                display: true,
                labels: {
                    usePointStyle: true,
                },
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return getFormattedCount(context.raw || 0, { accuracy: 0 });
                    },
                },
            },
        },
    };
});

const loadBalanceDynamic = async () => {
    try {
        const resp = await dbController.getBalanceDynamic();
        balances.value = resp.slice(1).map(balance => {
            return {
                ...balance,
                date: dayjs(balance.date).format('YYYY MMMM'),
                total: balance.default + balance.savings,
            };
        });
    } catch (error) {
        console.log(error);
    }
};

onMounted(() => {
    emitHelper.on('update-all', loadBalanceDynamic);
    loadBalanceDynamic();
});
onBeforeUnmount(() => {
    emitHelper.off('update-all', loadBalanceDynamic);
});
</script>
<style scoped>
.chart-container {
    height: 70vh;
}

.scrollbar-content {
    height: 10px;
    width: 200vw;
}
</style>
