import { computed, ref, watch } from 'vue';
import store from '../store';
import { ElMessage, ElMessageBox } from 'element-plus';
import router from '../router';
import {
    setBalancesByDates,
    setPlansMatrix,
    setProgressByCategories,
} from '../services/calculatings';
const { alert: elAlert, confirm: elConfirm, prompt: elPrompt } = ElMessageBox;

function watchTokenExpiring() {
    // console.log('in composable');
    const isTokenExpired = computed(() => {
        return store.getters.getList('isExpired');
    });

    watch(
        isTokenExpired,
        async (nv, ov) => {
            // console.log('in composable watcher:', nv);
            if (!nv) return;
            try {
                await elAlert(
                    //
                    `Истек срок действия ключа доступа для Google диска. 
      Чтобы продолжать безопасную работу, нужно пройти авторизацию снова`,
                    'Требуется авторизация'
                )
                    .then(() => {
                        store.dispatch('logout');
                        ElMessage({
                            type: 'success',
                            message: 'Вышли',
                        });
                    })
                    .then(() => router.push({ path: '/login' }));
            } catch (e) {
            } finally {
                // console.log('yesss');
                store.dispatch('logout');
            }
        },
        { immediate: true }
    );
}

function watchDataChanging() {
    const categories = computed(() => {
        return store.getters.getData('categories');
    });
    const plans = computed(() => {
        return store.getters.getData('plans');
    });
    const actions = computed(() => {
        return store.getters.getData('actions');
    });
    const config = computed(() => {
        return store.getters.getData('config');
    });
    const isFirstCalculate = computed(() => {
        return store.getters.getCalcs('isFirstCalculate');
    });

    // console.log(plans.value)

    return [
        watch(
            categories,
            async nv => {
                // console.log('categories', nv);
                if (!nv || isFirstCalculate.value) return;
                // console.log('watch categ');
                // console.log(nv)
                const setAllCalcs = () => {
                    setBalancesByDates({
                        categories: nv,
                        plans: plans?.value,
                        config: config?.value,
                    });
                    setProgressByCategories({
                        categories: nv,
                        plans: plans?.value,
                        actions: actions?.value,
                    });
                };
                return new Promise((resolve, reject) => {
                    try {
                        resolve(setAllCalcs());
                        // console.log('categories resolve');
                    } catch (err) {
                        reject(err);
                    }
                });
            },
            { deep: true }
        ),
        watch(
            plans,
            async nv => {
                // console.log('plans', nv);
                if (!nv) return;
                // console.log('watch plans');
                // console.log(nv)
                const setAllCalcs = () => {
                    setPlansMatrix({ plans: nv });
                    setBalancesByDates({
                        categories: categories?.value,
                        plans: nv,
                        config: config?.value,
                    });
                    setProgressByCategories({
                        categories: categories?.value,
                        plans: nv,
                        actions: actions?.value,
                    });

                    store.commit('SET_CALC_DATA', {
                        f: 'isFirstCalculate',
                        data: false,
                    });
                };
                return new Promise((resolve, reject) => {
                    try {
                        resolve(setAllCalcs());
                        // console.log('plans resolve');
                    } catch (err) {
                        reject(err);
                    }
                });
                return;
            },
            { deep: true, immediate: true }
        ),
        watch(
            actions,
            async nv => {
                // console.log('actions', nv);
                if (!nv || isFirstCalculate.value) return;
                // console.log('watch actions');
                // console.log(nv)
                return new Promise((resolve, reject) => {
                    try {
                        resolve(
                            setProgressByCategories({
                                categories: categories?.value,
                                plans: plans?.value,
                                actions: nv,
                            })
                        );
                        // console.log('actions resolve');
                    } catch (err) {
                        reject(err);
                    }
                });
            },
            { deep: true }
        ),
        watch(
            config,
            async nv => {
                // console.log('config', nv);
                if (!nv || isFirstCalculate.value) return;
                // console.log('watch config');
                return new Promise((resolve, reject) => {
                    try {
                        resolve(
                            setBalancesByDates({
                                categories: categories?.value,
                                plans: plans?.value,
                                config: nv,
                            })
                        );
                        // console.log('config resolve');
                    } catch (err) {
                        reject(err);
                    }
                });
            },
            { deep: true }
        ),
    ];
}

export { watchTokenExpiring, watchDataChanging };
