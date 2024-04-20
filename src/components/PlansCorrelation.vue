<template>
    <div
        class="correlation-container"
        :class="{ positive, negative }"
    >
        <div class="ro"><i>ρ</i></div>
        <div class="factor">
            {{ factor }}
        </div>
        <div class="correlation-icon">
            <div
                v-if="positive || negative"
                class="triangle"
            ></div>
            <el-icon
                v-else
                color="var(--el-color-gray-light-7)"
            >
                <CloseBold />
            </el-icon>
        </div>
    </div>
</template>
<script>
import { getFormattedCount } from '../services/utils';
import { CloseBold, TopRight, BottomRight, CaretRight } from '@element-plus/icons-vue';

export default {
    components: { CloseBold, TopRight, BottomRight, CaretRight },
    props: {
        factor: {
            type: Number,
            default: 0,
        },
        positive: Boolean,
        negative: Boolean,
    },
};
</script>
<style scoped>
.correlation-container {
    display: flex;
    gap: 6px;
    padding: 0 4px 0 6px;
    line-height: 1.1;
    border-radius: 8px;
    border: 2px solid var(--el-color-gray-light-7);
    background-color: var(--el-color-white);
    font-weight: bold;
    align-items: center;
    color: var(--el-color-gray-light-7);
}
.correlation-container.positive,
.correlation-container.negative {
    border-color: var(--el-color-success-dark-2);
    color: var(--el-color-success-dark-2);
}
.ro {
    font-size: 16px;
    margin-bottom: 3px;
}
.factor {
    flex-grow: 1;
    text-align: center;
    padding: 4px 0;
    background-color: var(--el-color-gray-light-5);
    color: var(--el-color-white);
}
.positive .factor,
.negative .factor {
    background-color: var(--el-color-success);
}
.correlation-icon {
    display: flex;
    align-items: center;
}
.correlation-icon svg {
    stroke-width: 3px;
}
.triangle {
    margin-right: 2px;
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-top: 10px solid var(--el-color-success-dark-2);
}
.positive .triangle {
    translate: 0 25%;
}
.negative .triangle {
    rotate: 90deg;
    translate: -50%;
}
</style>
