<template>
    <div class="app-container">
        <header>
            <div
                class="section-container"
                :class="{ full: false }"
            >
                <AppHeader />
            </div>
        </header>
        <main>
            <div
                class="section-container"
                :class="{ full: isFullMode }"
            >
                <router-view v-slot="{ Component, route }">
                    <transition
                        name="fade"
                        mode="out-in"
                    >
                        <div :key="route.name">
                            <component :is="Component"></component>
                        </div>
                    </transition>
                </router-view>
            </div>
        </main>
        <footer>
            <div
                class="section-container"
                :class="{ full: false }"
            >
                <AppFooter />
            </div>
        </footer>
    </div>
</template>

<script>
import AppHeader from '../components/AppHeader.vue';
import AppFooter from '../components/AppFooter.vue';
import { getInitWidth, notifyWrap } from '../services/utils';
import { layoutSizing } from '../config';
import { Plans } from '../services/changings';
import { watchDataChanging } from '../composables/watchers';

export default {
    components: {
        AppHeader,
        AppFooter,
    },
    setup() {
        // watchDataChanging();
    },
    data() {
        return {};
    },
    methods: {
        async getAllData() {
            try {
                await this.$store.dispatch('getDataList', { col: 'data' });
                const plans = new Plans();
                const changes = plans.checkPlans();
                await this.$store.dispatch('saveDataChanges', changes);
                this.$message({
                    type: 'success',
                    message: 'Сохранено',
                });
            } catch (err) {
                notifyWrap(err);
            }
        },
        onResize() {
            const size = getInitWidth(layoutSizing);
            this.$store.commit('SET_SUP_DATA', {
                f: 'isMobileSize',
                data: size === 'xs',
            });
            this.$store.commit('SET_SUP_DATA', {
                f: 'viewportSize',
                data: size,
            });
        },
    },
    computed: {
        isFullMode() {
            return this.$store.getters.getScreenMode;
        },
    },
    mounted() {
        // this.getAllData();
        this.onResize();
        window.addEventListener('resize', this.onResize);
    },
    beforeUnmount() {
        window.removeEventListener('resize', this.onResize);
    },
};
</script>
<style>
:root {
    --header-height: 40px;
    --footer-height: 40px;
    --footer-height-mobile: 64px;
}
</style>
<style scoped>
.app-container {
    height: 100vh;
    height: 100dvh;
    position: relative;
    overflow-x: hidden;
}

header,
main,
footer {
    width: 100vw;
    overflow: hidden;
}

header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background-color: var(--el-color-primary-dark-2);
    z-index: 2000;
}

main {
    background-color: var(--el-color-gray-dark-2);
}

footer {
    position: fixed;
    top: calc(100vh - var(--footer-height-mobile));
    top: calc(100dvh - var(--footer-height-mobile));
    left: 0;
    right: 0;
    background-color: #fff;
    border-top: 1px solid var(--el-text-color-disabled);
    padding-bottom: var(--footer-height);
}

.section-container {
    width: calc(100% - 32px);
    margin: 0 auto;
    /*overflow: hidden;*/
    display: flex;
    flex-direction: column;
}

header > .section-container {
    min-height: var(--header-height);
}

main > .section-container {
    min-height: 100vh;
    min-height: 100dvh;
    padding-top: calc(var(--header-height) + 16px);
    padding-bottom: calc(var(--footer-height-mobile) + 16px);
}

footer > .section-container {
    min-height: calc(var(--footer-height-mobile) * 2);
}

:global(.desktop-only) {
    display: none !important;
}

:global(.mobile-only) {
    display: block !important;
}

@media (min-width: 768px) {
    :root {
        --footer-height: 64px;
    }

    footer {
        position: static;
        padding-bottom: 0;
        background-color: var(--el-color-gray);
        border: none;
    }

    footer > .section-container {
        min-height: var(--footer-height);
    }

    main > .section-container {
        min-height: calc(100vh - var(--footer-height));
        min-height: calc(100dvh - var(--footer-height));
        padding-bottom: 16px;
    }

    .section-container {
        max-width: 1000px;
    }

    .section-container.full {
        max-width: none;
    }

    :global(.desktop-only) {
        display: block !important;
    }

    :global(.mobile-only) {
        display: none !important;
    }
}

@media (min-width: 1400px) {
    .section-container {
        max-width: 1200px;
    }
}
</style>
