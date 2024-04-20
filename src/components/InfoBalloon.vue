<template>
    <el-popover
        class="container"
        trigger="hover"
        placement="top"
        :popper-class="popClass"
        :popper-style="`word-break:keep-all; width: max-content; max-width: 200px; ${popStyle}`"
        :width="width"
    >
        <template #reference>
            <slot name="trigger">
                <span
                    class="trigger"
                    :style="$attrs.style"
                    :class="$attrs.class"
                    >{{ triggerText || '?' }}</span
                >
            </slot>
        </template>
        <slot>
            <div
                v-for="(message, idx) in messages.filter(m => !!m)"
                :key="idx"
                class="popover__content span-wrap-keepall"
                style="text-align: left"
            >
                {{ message }}
            </div>
        </slot>
    </el-popover>
</template>
<script>
export default {
    props: [
        //
        'data',
        'triggerText',
        'index',
        // 'size',
        'popClass',
        'popStyle',
        'width',
    ],
    data() {
        return {
            // fontSize: (this.size ? this.size * 0.83 : 10) + 'px',
            // blockSize: (this.size || 12) + 'px',
            fontSize: '10px',
            blockSize: '14px',
        };
    },
    computed: {
        messages() {
            if (this.index !== undefined) return [this.data[+this.index]];
            return Array.isArray(this.data) ? this.data : [this.data];
        },
    },
};
</script>
<style>
.trigger {
    display: inline-block;
    font-size: v-bind(fontSize);
    line-height: 1.1;
    width: v-bind(blockSize);
    height: v-bind(blockSize);
    border: 2px solid var(--el-text-color-disabled);
    border-radius: 50%;
    font-weight: bold;
    text-align: center;
    cursor: default;
    color: inherit;
    border-color: currentColor;
}
</style>
