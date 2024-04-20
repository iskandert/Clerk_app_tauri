<template>
    <el-card>
        <h4>Динамика остатка по месяцам</h4>
        <div class="chart-container">
            <Line
                :data="data"
                :options="options"
            />
        </div>
    </el-card>
</template>
<script>
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

export default {
    components: { Line },
    props: {},
    data() {
        return {};
    },
    computed: {
        balances() {
            const balancesByDates = this.$store.getters.getCalcs('balancesByDates') || {};
            const balancesByDatesArrayed = Object.entries(balancesByDates)
                .map(([date, balanceData]) => {
                    return {
                        date,
                        balance: balanceData.balance,
                        savings: balanceData.savings,
                        total: balanceData.balance + balanceData.savings,
                    };
                })
                .sort(({ date: date1 }, { date: date2 }) => {
                    if (date1 < date2) return -1;
                    if (date1 > date2) return 1;
                    return 0;
                })
                .map(balanceData => {
                    return {
                        ...balanceData,
                        date: this.$dayjs(balanceData.date).format('YYYY MMMM'),
                    };
                });
            return balancesByDatesArrayed;
        },
        data() {
            return {
                labels: this.balances.map(({ date }) => date),
                datasets: [
                    {
                        label: 'Остаток',
                        data: this.balances.map(({ balance }) => balance),
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
                                    return (
                                        ' ' +
                                        getFormattedCount(context.raw, { accuracy: 0 }) +
                                        ' - остаток'
                                    );
                                },
                            },
                        },
                    },
                    {
                        label: 'C накоплениями',
                        data: this.balances.map(({ total }) => total),
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
                                        getFormattedCount(
                                            this.balances[context.dataIndex].savings || 0,
                                            { accuracy: 0 }
                                        ) +
                                        ' - накопления'
                                    );
                                },
                                beforeLabel: context => {
                                    return (
                                        ' ' +
                                        getFormattedCount(context.raw, { accuracy: 0 }) +
                                        ' - с остатком'
                                    );
                                },
                            },
                        },
                    },
                ],
            };
        },
        options() {
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
                        min:
                            Math.min(0, ...this.balances.map(({ balance }) => balance)) &&
                            undefined,
                        max: Math.max(0, ...this.balances.map(({ total }) => total)) && undefined,
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
        },
    },
};
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
