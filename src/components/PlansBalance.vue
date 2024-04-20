<template>
    <div
        class="balance-container"
        :class="type"
    >
        <div
            class="size"
            :class="{ only: !isShowDinamic }"
        >
            {{ formattedSum }}
        </div>
        <div
            v-if="isShowDinamic"
            class="dinamic"
        >
            <el-icon
                v-if="type === 'default'"
                color="var(--el-text-color-primary)"
            >
                <Coin />
            </el-icon>
            <el-icon
                v-if="type === 'savings'"
                color="var(--el-color-primary-dark-1)"
            >
                <Lock />
            </el-icon>
            <div
                class="dinamic-value"
                :style="backgroundDinamic"
            >
                {{ dinamic > 0 ? '+ ' : dinamic < 0 ? '- ' : '' }} {{ formattedDinamic }}
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
        sum: {
            type: Number,
            default: 0,
        },
        dinamic: {
            type: Number,
            default: 0,
        },
        type: String, // default | savings
        isShowDinamic: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        return {
            //
        };
    },
    computed: {
        formattedSum() {
            return getFormattedCount(this.sum, { accuracy: 0 });
        },
        formattedDinamic() {
            return getFormattedCount(Math.abs(this.dinamic), { accuracy: 0 });
        },
        backgroundDinamic() {
            let prefix = 'background-color:';
            const middleColor = 'var(--el-color-warning-light-3)';
            if (!this.dinamic) return prefix + middleColor;

            const maxValue = 10000;
            const isLess = this.dinamic < 0;
            const dinamicAbs = Math.abs(this.dinamic);
            const percentage = Math.round((dinamicAbs / maxValue) * 100);
            let endColor = 'var(--el-color-success-dark-2)';
            if (isLess) {
                endColor = 'var(--el-color-danger-dark-2)';
            }
            if (percentage > 100) return prefix + endColor;
            return prefix + `color-mix(in srgb, ${middleColor} ${100 - percentage}%, ${endColor})`;
        },
    },
};
</script>
<style scoped>
.balance-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 4px;
    line-height: 1.1;
    border-radius: 8px;
    border: 2px solid;
    background-color: var(--el-color-white);
}

.balance-container.default {
    border-color: var(--el-text-color-primary);
}

.balance-container.savings {
    border-color: var(--el-color-primary-dark-1);
}

.balance-container.default > .size {
    color: var(--el-text-color-primary);
}

.balance-container.savings > .size {
    color: var(--el-color-primary-dark-1);
}

.size {
    font-weight: bold;
}

.size.only {
    display: flex;
    justify-content: center;
}

.dinamic {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    font-weight: normal;
    text-align: right;
    font-size: 12px;
    gap: 4px;
}

.dinamic > i {
    flex-grow: 1;
    justify-content: left;
}

.dinamic-value {
    font-weight: bold;
    color: var(--el-color-white);
    padding: 1px 4px;
    border-radius: 10px;
}
</style>
