<template>
    <div
        class="percent-container"
        :class="status"
    >
        <div class="size">
            <span>
                {{ formattedSum }}
            </span>
        </div>
        <div
            class="percent"
            v-if="showPercentage"
        >
            <div
                class="percent-value"
                :style="backgroundPercent"
            >
                {{ percentageRounded }}%
            </div>
        </div>
    </div>
</template>
<script>
import { getFormattedCount } from '../services/utils';
import { Lock, Coin } from '@element-plus/icons-vue';

export default {
    components: { Lock, Coin },
    props: {
        planSum: {
            type: Number,
            default: 0,
        },
        currentSum: {
            type: Number,
            default: 0,
        },
        percentage: {
            type: [Number],
            default: 0,
        },
        showPercentage: {
            type: [Boolean],
            default: true,
        },
        status: String, // income | expense
    },
    data() {
        return {
            //
        };
    },
    computed: {
        formattedSum() {
            return getFormattedCount(this.currentSum, { accuracy: 0 });
        },
        percentageRounded() {
            return Math.round(this.percentage);
        },
        backgroundPercent() {
            const percent = this.percentage;
            const dayPercent = Math.round(
                (this.$dayjs().date() / this.$dayjs().daysInMonth()) * 100
            );
            const diff = dayPercent - percent;
            let isLess = diff < 0;
            if (this.status === 'income') isLess = !isLess;

            let prefix = 'background-color:';
            const middleColor = 'var(--el-color-warning-light-3)';

            if (!diff) return prefix + middleColor;

            const diffAbs = Math.min(Math.abs(diff) * 5, 100);
            let endColor = 'var(--el-color-success-dark-2)';
            if (isLess) {
                endColor = 'var(--el-color-danger-dark-2)';
            }
            return prefix + `color-mix(in srgb, ${middleColor} ${100 - diffAbs}%, ${endColor})`;
        },
    },
};
</script>
<style scoped>
.percent-container {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 4px;
    line-height: 1.1;
    padding: 4px 4px;
    border-radius: 8px;
    border: 2px solid var(--el-text-color-primary);
    background-color: var(--el-color-white);
}

.percent-container > .size {
    flex-grow: 1;
}

.percent-container > .percent {
    flex-grow: 1;
    text-align: right;
}

.percent-value {
    display: inline;
    padding: 1px 4px;
    border-radius: 10px;
    font-weight: bold;
    color: var(--el-color-white);
    font-size: 12px;
}

.percent-container.income > .size {
    color: var(--el-color-success);
}

.percent-container.expense > .size {
    color: var(--el-text-color-secondary);
}

.size {
    font-weight: bold;
}
</style>
