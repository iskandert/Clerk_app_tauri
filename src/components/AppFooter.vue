<template>
    <div class="container">
        <nav>
            <el-menu
                :default-active="'/' + $route.path.split('/')[1]"
                mode="horizontal"
                class="menu"
                :router="true"
                :ellipsis="false"
                background-color="#00000000"
                active-text-color="var(--el-color-primary)"
                text-color="var(--el-text-color-secondary)"
            >
                <el-menu-item index="/main">
                    <div class="menu-item-text">
                        <el-icon :size="24">
                            <House />
                        </el-icon>
                        <span>Главная</span>
                    </div>
                </el-menu-item>
                <el-menu-item index="/actions">
                    <div class="menu-item-text">
                        <el-icon :size="24">
                            <Clock />
                        </el-icon>
                        <span>Операции</span>
                    </div>
                </el-menu-item>
                <el-menu-item index="/analitic">
                    <div class="menu-item-text">
                        <el-icon :size="24">
                            <DataAnalysis />
                        </el-icon>
                        <span>Аналитика</span>
                    </div>
                </el-menu-item>
                <el-menu-item index="/plans">
                    <div class="menu-item-text">
                        <el-icon :size="24">
                            <Calendar />
                        </el-icon>
                        <span>Планы</span>
                    </div>
                </el-menu-item>
            </el-menu>
        </nav>
        <div class="footer-bar">
            <span class="left_part">
                Made by
                <el-link
                    target="_blank"
                    href="https://github.com/iskandert"
                    >@iskandert</el-link
                >
            </span>
        </div>
    </div>
</template>
<script>
import { shallowRef } from 'vue';
import { House, Clock, Calendar, DataAnalysis } from '@element-plus/icons-vue';

export default {
    components: {
        House,
        Clock,
        Calendar,
        DataAnalysis,
    },
    setup() {
        return {
            // iconSetting: shallowRef(Tools),
        };
    },
    computed: {},
    methods: {},
};
</script>
<style scoped>
.container {
    height: 100%;
    flex-grow: 1;
}

.menu.el-menu {
    --el-menu-item-height: calc(var(--footer-height-mobile) - 6.5px);
    border-bottom: none;
    width: 100%;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    padding-bottom: 4px;
}

.menu.el-menu .el-menu-item {
    padding: 0;
}

.menu.el-menu .el-menu-item:hover,
.menu.el-menu .el-menu-item:focus {
    background-color: var(--el-color-primary-light-9);
}

.menu-item-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0 4px;
    width: 100%;
    height: calc(var(--footer-height-mobile) - 6.5px);
}

.menu-item-text > span {
    font-size: 12px;
    line-height: 1;
}

.footer-bar {
    display: none;
}

@media (min-width: 768px) {
    nav {
        display: none;
    }

    .footer-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: var(--footer-height);
    }

    .footer-bar > .left_part,
    .footer-bar > .left_part :deep(span) {
        font-size: 12px;
        line-height: 1;
    }

    .footer-bar > .left_part,
    .footer-bar > .left_part :deep(span.el-link__inner:not(:hover)) {
        color: var(--el-color-gray-light-5);
    }
}
</style>
