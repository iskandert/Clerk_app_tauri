<template>
    <div class="container">
        <el-card>
            <div class="title">
                <h4>Планы по месяцам и категориям</h4>
                <div class="button-bar">
                    <template v-if="!isMobileSize">
                        <el-button
                            @click="isShowedDinamic = !isShowedDinamic"
                            :type="isShowedDinamic ? 'primary' : ''"
                            round
                            plain
                        >
                            <!-- :icon="iconLock" -->
                            Динамика
                        </el-button>
                        <!-- <el-button
                            @click="isShowedCorrelation = !isShowedCorrelation"
                            :type="isShowedCorrelation ? 'primary' : ''"
                            round
                            plain
                        >
                            <i style="margin: 0 6px 3px 0">ρ</i>Корреляция
                        </el-button> -->
                    </template>

                    <el-popover
                        v-else
                        :width="200"
                        trigger="click"
                    >
                        <template #reference>
                            <el-button
                                :icon="iconMore"
                                type="info"
                                plain
                                circle
                            ></el-button>
                        </template>
                        <div class="checkbox-bar">
                            <h5>Настройки отображения</h5>
                            <el-checkbox v-model="isShowedDinamic">Динамика</el-checkbox>
                            <!-- <el-checkbox v-model="isShowedCorrelation">Корреляция</el-checkbox> -->
                        </div>
                    </el-popover>
                </div>
            </div>
            <div class="table">
                <p v-if="!isDataReady">Загрузка...</p>
                <el-table
                    v-else
                    class="table-normal"
                    :data="categoriesList"
                    row-key="_id"
                    default-expand-all
                    border
                    max-height="var(--table-height)"
                    @row-click="toggleExpand"
                    ref="plansTable"
                    @keydown.up.prevent
                    @keydown.down.prevent
                    @keydown.left.prevent
                    @keydown.right.prevent
                >
                    <el-table-column
                        :width="isMobileSize ? 130 : 180"
                        fixed
                        class="category-column"
                    >
                        <template #header>
                            <div class="desktop-only">
                                <div class="table-title tips">
                                    <span class="span-wrap-keepall">{{ monthProgress }}% месяца</span>
                                </div>
                                <!-- <div class="table-title tips">
                                    <span class="span-wrap-keepall">{{ plansSmirnovStatistic.gammaN }}</span>
                                </div> -->
                            </div>
                        </template>
                        <template #default="{ row: category }">
                            <span
                                class="category-name"
                                :class="[category.status, category.type, category.children ? 'parent-category' : '']"
                            >
                                <template v-if="category.type === 'default'">
                                    <el-icon
                                        v-if="category.status === 'income'"
                                        class="symbol plus"
                                        :size="14"
                                    >
                                        <Plus v-if="category._isAccounted" />
                                        <Warning v-else />
                                    </el-icon>
                                    <el-icon
                                        v-if="category.status === 'expense'"
                                        class="symbol minus"
                                        :size="14"
                                    >
                                        <Minus v-if="category._isAccounted" />
                                        <Warning v-else />
                                    </el-icon>
                                </template>
                                <template v-if="category.type === 'savings'">
                                    <el-icon
                                        v-if="category.status === 'expense'"
                                        class="symbol lock"
                                        :size="14"
                                    >
                                        <Lock v-if="category._isAccounted" />
                                        <Warning v-else />
                                    </el-icon>
                                    <el-icon
                                        v-if="category.status === 'income'"
                                        class="symbol unlock"
                                        :size="14"
                                    >
                                        <Unlock v-if="category._isAccounted" />
                                        <Warning v-else />
                                    </el-icon>
                                </template>
                                <el-link
                                    v-if="!category.children && category._isEditable"
                                    @click="callEditCategory(category._id)"
                                >
                                    {{ category.name }}
                                </el-link>
                                <span v-else>{{ category.name }}</span>
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column
                        v-if="isShowedDinamic"
                        :width="isMobileSize ? '90' : '130'"
                        fixed
                    >
                        <template #header>
                            <span class="span-wrap-keepall">Выполнение планов</span>
                        </template>
                        <template #default="{ row: category }">
                            <!-- {{ console.log(category.name, category._id) }}
                            {{ console.log(plansProgress[category._id]) }} -->
                            <PlansPercent
                                :current-sum="plansProgress[category._id].sum"
                                :percentage="plansProgress[category._id].percentage"
                                :show-percentage="plansProgress[category._id].percentage !== null"
                                :status="category.status"
                            />
                        </template>
                    </el-table-column>
                    <!-- <el-table-column
                        v-if="isShowedCorrelation"
                        width="45'"
                        fixed
                    >
                        <template #header>
                            <span>
                                <el-icon :size="20">
                                    <Filter />
                                </el-icon>
                                <i style="font-size: 16px; margin-left: -4px">ρ</i>
                            </span>
                        </template>
                        <template #default="{ row: category }">
                            <div
                                class="correlation-check"
                                v-if="!category.children"
                            >
                                <el-icon
                                    v-if="categoriesForCorrelation.includes(category._id)"
                                    color="var(--el-color-success)"
                                    :size="20"
                                >
                                    <CircleCheckFilled />
                                </el-icon>
                                <el-icon
                                    v-else
                                    color="var(--el-color-danger)"
                                    :size="20"
                                >
                                    <CircleCloseFilled />
                                </el-icon>
                            </div>
                        </template>
                    </el-table-column> -->
                    <el-table-column
                        v-for="date in datesList"
                        :key="date"
                        width="120"
                    >
                        <template #header>
                            <div
                                class="table-title dates"
                                :class="{ yearStart: isYearStart(date) }"
                            >
                                <span class="desktop-only">{{ dayjs(date).format('MMMM YY') }}</span>
                                <span class="mobile-only">{{ dayjs(date).format('MM.YYYY') }}</span>
                                <template v-if="datesRange.includes(date)">
                                    <PlansBalance
                                        v-if="isShowedDinamic"
                                        :sum="balancesByDates[date]?.default"
                                        :dinamic="balancesByDates[date]?.defaultDiff"
                                        type="default"
                                        :is-show-dinamic="isShowedDinamic"
                                    />
                                    <PlansBalance
                                        v-if="isShowedDinamic"
                                        :sum="balancesByDates[date]?.savings"
                                        :dinamic="balancesByDates[date]?.savingsDiff"
                                        type="savings"
                                        :is-show-dinamic="isShowedDinamic"
                                        style="margin: 4px 0 4px"
                                    />
                                </template>
                                <template v-else>
                                    <PlansBalance
                                        v-if="isShowedDinamic"
                                        :sum="balancesByDates[datesRange.at(-1)]?.default"
                                        :dinamic="0"
                                        type="default"
                                        :is-show-dinamic="isShowedDinamic"
                                    />
                                    <PlansBalance
                                        v-if="isShowedDinamic"
                                        :sum="balancesByDates[datesRange.at(-1)]?.savings"
                                        :dinamic="0"
                                        type="savings"
                                        :is-show-dinamic="isShowedDinamic"
                                        style="margin: 4px 0 4px"
                                    />
                                </template>
                                <!-- <PlansCorrelation
                                    v-if="isShowedCorrelation && correlationsByDates[date]"
                                    :factor="correlationsByDates[date].k"
                                    :positive="correlationsByDates[date].isPositive"
                                    :negative="correlationsByDates[date].isNegative"
                                /> -->
                            </div>
                        </template>
                        <template #default="{ row: category }">
                            <template v-if="!category.children">
                                <div
                                    class="plan-item"
                                    :class="{ yearStart: isYearStart(date) }"
                                >
                                    <PlansItem
                                        @call-to-edit="
                                            callEditPlan(
                                                plansMatrix[date]?.byCategoryId[category._id] || {
                                                    date,
                                                    category_id: category._id,
                                                }
                                            )
                                        "
                                        :sum="
                                            plansMatrix[date]?.byCategoryId[category._id]?.sum ??
                                            (!category._isEditable ? 0 : undefined)
                                        "
                                        :status="category.status"
                                        :date="date"
                                        :disable-edit="!category._isEditable"
                                    />
                                    <!-- :deviation="plansSmirnovStatistic.deviations?.[date]?.[category._id]" -->
                                </div>
                            </template>
                            <div
                                class="plans-sum"
                                :class="{ yearStart: isYearStart(date) }"
                                v-else
                            >
                                <PlansItem
                                    :sum="plansMatrix[date]?.[category.status] || 0"
                                    type="all"
                                    :status="category.status"
                                />
                            </div>
                        </template>
                    </el-table-column>
                    <template #append>
                        <div
                            class="add-category-row"
                            @click="openCategoryDialog"
                        >
                            <el-icon :size="12">
                                <Plus />
                            </el-icon>
                            <div>Добавить категорию</div>
                        </div>
                    </template>
                </el-table>
            </div>
            <div
                v-if="isDataReady"
                class="button-container"
            >
                <!-- <el-badge :is-dot="hasStatisticSettings">
                    <el-button
                        @click="openStatisticDialog"
                        round
                        type="success"
                        :size="isMobileSize ? 'large' : ''"
                        :icon="iconDataAnalysis"
                    >
                        Статистика
                    </el-button>
                </el-badge> -->
                <el-button
                    @click="openDeletingPlanDialog"
                    round
                    type="danger"
                    :size="isMobileSize ? 'large' : ''"
                    :icon="iconRemove"
                >
                    Удалить{{ isMobileSize ? '' : ' некоторые планы' }}
                </el-button>
                <el-button
                    @click="handleRecalcMonth"
                    round
                    type="warning"
                    :size="isMobileSize ? 'large' : ''"
                    :icon="iconRecalc"
                >
                    Пересчитать{{ isMobileSize ? '' : ' месяц' }}
                </el-button>
                <el-button
                    @click="openExtendingPlanDialog"
                    round
                    type="primary"
                    :size="isMobileSize ? 'large' : ''"
                    :icon="iconExtend"
                >
                    Продлить{{ isMobileSize ? '' : ' планы' }}
                </el-button>
                <el-button
                    @click="openPlanDialog"
                    round
                    type="primary"
                    :size="isMobileSize ? 'large' : ''"
                    :icon="iconCPlus"
                >
                    Добавить{{ isMobileSize ? '' : ' план' }}
                </el-button>
            </div>
        </el-card>

        <el-dialog
            width="min(100vw, 500px)"
            v-model="deletingPlanDialog"
            :append-to-body="true"
            :before-close="handleCancelDeletingPlan"
            :destroy-on-close="true"
        >
            <template #header>
                <h4>Удалить планы</h4>
            </template>
            <PlansDeletingForm
                @call-to-end="handleCancelDeletingPlan"
                @update-plan="
                    () => {
                        loadBalanceDynamic();
                        loadPlans();
                    }
                "
                class="dialog"
            />
        </el-dialog>

        <el-dialog
            width="min(100vw, 500px)"
            v-model="extendingPlanDialog"
            :append-to-body="true"
            :before-close="handleCancelExtendingPlan"
            :destroy-on-close="true"
        >
            <template #header>
                <h4>Продлить планы</h4>
            </template>
            <PlansExtendingForm
                @call-to-end="handleCancelExtendingPlan"
                @update-plan="
                    () => {
                        loadBalanceDynamic();
                        loadPlans();
                    }
                "
                class="dialog"
            />
        </el-dialog>

        <el-dialog
            width="min(100vw, 500px)"
            v-model="planDialog"
            :append-to-body="true"
            :before-close="handleCancelPlan"
            :destroy-on-close="true"
        >
            <template #header>
                <h4>{{ isEditMode ? 'Редактировать' : 'Добавить' }} план</h4>
            </template>
            <PlansForm
                @call-to-end="handleCancelPlan"
                @update-plan="
                    async () => {
                        await loadBalanceDynamic();
                        await loadPlans();
                    }
                "
                @update-category="
                    async () => {
                        await loadActionSums();
                        await loadCategories();
                    }
                "
                class="dialog"
            />
        </el-dialog>

        <el-dialog
            width="min(100vw, 500px)"
            v-model="categoryDialog"
            :append-to-body="true"
            :before-close="handleCancelCategory"
            :destroy-on-close="true"
        >
            <template #header>
                <h4>{{ isEditCategory ? 'Редактировать' : 'Добавить' }} категорию</h4>
            </template>
            <CategoriesForm
                @call-to-end="handleCancelCategory"
                @update-category="
                    async () => {
                        await loadActionSums();
                        await loadCategories();
                    }
                "
                class="dialog"
            />
        </el-dialog>

        <!-- <el-dialog
            width="min(100vw, 500px)"
            v-model="statisticDialog"
            :append-to-body="true"
            :before-close="handleCancelStatistic"
            :destroy-on-close="true"
        >
            <template #header>
                <h4>Настроить статистику</h4>
            </template>
            <StatisticForm
                @call-to-end="handleCancelStatistic"
                :categories_ids="filteredCategoryIds"
                :dates="filteredDates"
                class="dialog"
            />
        </el-dialog> -->
    </div>
</template>
<script setup>
import { onBeforeUnmount, onMounted, shallowRef } from 'vue';
import ActionsBar from '../components/ActionsBar.vue';
import PlansBalance from '../components/PlansBalance.vue';
import PlansItem from '../components/PlansItem.vue';
import PlansForm from '../components/PlansForm.vue';
import { mapObject, getEntityField, getObjectFromArray, getFormattedCount, cloneByJSON } from '../services/utils';
import {
    Lock,
    Unlock,
    Plus,
    CirclePlusFilled,
    Minus,
    Coin,
    Refresh,
    Sort,
    MoreFilled,
    CopyDocument,
    RemoveFilled,
    RefreshLeft,
    DArrowRight,
    DataAnalysis,
    Filter,
    CircleCheckFilled,
    CircleCloseFilled,
    Warning,
} from '@element-plus/icons-vue';
import PlansPercent from '../components/PlansPercent.vue';
import CategoriesForm from '../components/CategoriesForm.vue';
import PlansDeletingForm from '../components/PlansDeletingForm.vue';
import PlansExtendingForm from '../components/PlansExtendingForm.vue';
import { Plans } from '../services/changings';
import {
    getIdsInNormalDistribution,
    getPearsonCorrelation,
    getStandardDeviation,
    getSmirnovStatistic,
} from '../services/analize';
import PlansCorrelation from '../components/PlansCorrelation.vue';
import StatisticForm from '../components/StatisticForm.vue';
import { ref } from 'vue';
import { computed } from 'vue';
import dbController from '../services/db/controller';
import { categoryStatusEnum, categoryTypeEnum } from '../services/constants';
import formatHelper from '../services/helpers/formatHelper';
import dayjs from 'dayjs';
import store from '../store';
import router from '../router';
import { ElMessage, ElMessageBox } from 'element-plus';
import emitHelper from '../services/helpers/emitHelper';

const iconLock = shallowRef(Lock);
const iconCoin = shallowRef(Coin);
const iconDinamic = shallowRef(Sort);
const iconFlip = shallowRef(Refresh);
const iconMore = shallowRef(MoreFilled);
const iconCPlus = shallowRef(CirclePlusFilled);
const iconRemove = shallowRef(RemoveFilled);
const iconRecalc = shallowRef(RefreshLeft);
const iconExtend = shallowRef(DArrowRight);
const iconDataAnalysis = shallowRef(DataAnalysis);

const plansTable = ref(null);
const isDataReady = ref(false);
// table settings
const isShowedDinamic = ref(true);
const isShowedCorrelation = ref(false);
//
const deletingPlanDialog = ref(false);
//
const extendingPlanDialog = ref(false);
//
const planDialog = ref(false);
const isEditMode = ref(false);
//
const categoryDialog = ref(false);
const isEditCategory = ref(false);
//
const filteredCategoryIds = ref([]);
const filteredDates = ref([]);
const statisticDialog = ref(false);
const isShowFilteredOnly = ref(false);

const categories = ref(null);
const plansMatrix = ref(null);
const balances = ref(null);
const actionSumsByCategoryIds = ref(null);

// const hasStatisticSettings = computed(() => {
//     return !!(this.filteredCategoryIds?.length && this.filteredDates?.length);
// });
const plansProgress = computed(() => {
    const result = {};

    for (const id in actionSumsByCategoryIds.value) {
        const planSum = plansMatrix.value[formatHelper.getISOYearMonthString()]?.byCategoryId[id]?.sum ?? 0;
        const actionsSum = actionSumsByCategoryIds.value[id];

        result[id] = {
            sum: actionsSum,
            percentage: null,
        };

        if (planSum) {
            result[id].percentage = Math.round((actionsSum / planSum) * 100);
        }
    }
    for (const status of [categoryStatusEnum.INCOME, categoryStatusEnum.EXPENSE]) {
        const planSum = plansMatrix.value[formatHelper.getISOYearMonthString()]?.[status] ?? 0;
        const actionsSum = categoriesList.value
            .find(({ _id }) => _id === status)
            .children.map(({ _id }) => actionSumsByCategoryIds.value[_id])
            .reduce((acc, sum) => acc + sum, 0);

        result[status] = {
            sum: actionsSum,
            percentage: null,
        };

        if (planSum) {
            result[status].percentage = Math.round((actionsSum / planSum) * 100);
        }
    }

    return result;
});

const balancesByDates = computed(() => {
    const result = {};
    datesRange.value.forEach(date => {
        const index = balances.value.findIndex(balance => balance.date === date);

        const balance = balances.value[index];
        const prevBalance = balances.value[index - 1];

        result[date] = {
            ...balance,
            date,
            defaultDiff: balance.default - prevBalance.default,
            savingsDiff: balance.savings - prevBalance.savings,
        };
    });

    return result;
});
// const categoriesDeviations = computed(() => {
//     const stdDevs = {};
//     for (const category_id in this.plansByCategoriesFlatten) {
//         const plansSums = this.plansByCategoriesFlatten[category_id].map(({ sum }) => sum);
//         stdDevs[category_id] = getStandardDeviation(plansSums);
//     }
//     return stdDevs;
// });
// const categoriesForCorrelation = computed(() => {
//     const data = Object.entries(this.categoriesDeviations).map(([_id, stdDev]) => ({
//         _id,
//         value: stdDev,
//     }));
//     return getIdsInNormalDistribution(data);
// });
const categoriesList = computed(() => {
    let result = [
        {
            _id: 'income',
            status: categoryStatusEnum.INCOME,
            name: 'Доходы',
            children: [],
        },
        {
            _id: 'expense',
            status: categoryStatusEnum.EXPENSE,
            name: 'Расходы',
            children: [],
        },
    ];
    result.forEach(block => {
        block.children = [categoryTypeEnum.DEFAULT, categoryTypeEnum.SAVINGS]
            .map(type => {
                return categories.value[block.status][type].filter(({ _id }) => {
                    return isShowFilteredOnly.value ? filteredCategoryIds.value.includes(_id) : true;
                });
            })
            .reduce((result, curr) => result?.concat(curr));
    });
    return result;
});
const plansDates = computed(() => {
    return Object.keys(plansMatrix.value).sort();
});
const datesRange = computed(() => {
    const firstDate = plansDates.value[0];
    const lastDate = plansDates.value.at(-1);
    const dates = [];

    let currentDate = firstDate;
    while (currentDate <= lastDate) {
        dates.push(currentDate);
        currentDate = formatHelper.getISOYearMonthString(
            dayjs(currentDate).date(dayjs(currentDate).daysInMonth()).add(1, 'day')
        );
    }
    return dates;
});
const datesList = computed(() => {
    const dates = [...datesRange.value];

    for (let monthsNumber = 1; monthsNumber <= 12; monthsNumber++) {
        dates.push(formatHelper.getISOYearMonthString(dayjs(dates.at(-1)).add(monthsNumber, 'month')));
    }

    return isShowFilteredOnly.value ? dates.filter(date => filteredDates.value.includes(date)) : dates;
});
// const correlationsByDates = computed(() => {
//     const correlations = {};

//     this.datesRange.forEach((date, idx, dates) => {
//         const correlationDataCurr = [];
//         const correlationDataPrev = [];
//         if (idx) {
//             this.categoriesForCorrelation.forEach(category_id => {
//                 correlationDataCurr.push(this.plansMatrix[date]?.[category_id]?.sum || 0);
//                 correlationDataPrev.push(this.plansMatrix[dates[idx - 1]]?.[category_id]?.sum || 0);
//             });

//             const corr = getPearsonCorrelation(correlationDataCurr, correlationDataPrev);
//             correlations[date] = {
//                 ...corr,
//                 k: +corr.k.toFixed(2),
//             };
//         }
//     });

//     return correlations;
// });
// const plansSmirnovStatistic = computed(() => {
//     const matrix = {};

//     if (this.filteredDates.length < 2 || this.filteredCategoryIds.length < 2) {
//         return {};
//     }
//     for (const date of this.filteredDates) {
//         // if (!this.filteredDates.includes(date)) continue;
//         if (!matrix[date]) {
//             matrix[date] = {};
//         }

//         for (const category_id of this.filteredCategoryIds) {
//             // if (!this.filteredCategoryIds.includes(category_id)) continue;
//             if (matrix[date][category_id] === undefined) {
//                 matrix[date][category_id] = this.plansMatrix[date][category_id]?.sum || 0;
//             }
//         }
//     }

//     for (const date in this.datesRange) {
//         if (!Object.values(matrix[date] || {}).reduce((sum, curr) => sum + curr, 0)) {
//             delete matrix[date];
//         }
//     }

//     for (const category_id in matrix[Object.keys(matrix)[0]]) {
//         if (!Object.values(matrix).reduce((sum, curr) => sum + curr[category_id], 0)) {
//             Object.values(matrix).forEach(statisticAtDate => delete statisticAtDate[category_id]);
//         }
//     }

//     console.log(matrix);
//     if (Object.keys(matrix).length < 2 || Object.keys(matrix[Object.keys(matrix)[0]]).length < 2) {
//         return {};
//     }
//     return getSmirnovStatistic(matrix);
// });
const isMobileSize = computed(() => {
    return store.getters['getWindowSizeState'];
});
const monthProgress = computed(() => {
    return Math.round((dayjs().date() / dayjs().daysInMonth()) * 100);
});

const toggleExpand = (row, col) => {
    if (col?.no !== 0) return;
    plansTable.value.toggleRowExpansion(row);
};
const isCurrentMonth = date => {
    return dayjs(date).isSame(dayjs(), 'month');
};
const isYearStart = date => {
    return dayjs(date).month() === 0;
};
const openPlanDialog = () => {
    planDialog.value = true;
};
const handleCancelPlan = () => {
    planDialog.value = false;
    isEditMode.value = false;
    router.push({
        path: '/plans',
        replace: true,
    });
};
const callEditPlan = async plan => {
    if (plan?._id) {
        isEditMode.value = true;
    }
    await router.push({
        path: '/plans',
        query: {
            ...plan,
            isEdit: !!plan?._id,
        },
        replace: true,
    });
    openPlanDialog();
};
//
const openDeletingPlanDialog = () => {
    deletingPlanDialog.value = true;
};
const handleCancelDeletingPlan = () => {
    deletingPlanDialog.value = false;
};
//
const openExtendingPlanDialog = () => {
    extendingPlanDialog.value = true;
};
const handleCancelExtendingPlan = () => {
    extendingPlanDialog.value = false;
};
//
const handleCancelCategory = () => {
    categoryDialog.value = false;
    isEditCategory.value = false;
    router.push({
        path: '/plans',
        replace: true,
    });
};
const callEditCategory = async category_id => {
    try {
        const editedCateg = await dbController.getCategory(category_id);

        isEditCategory.value = true;
        await router.push({
            path: '/plans',
            query: {
                ...editedCateg,
                isEdit: true,
            },
            replace: true,
        });
        openCategoryDialog();
    } catch {}
};
const openCategoryDialog = () => {
    categoryDialog.value = true;
};
//
const handleRecalcMonth = async () => {
    try {
        await ElMessageBox.confirm(
            'Восстановить прошлое значение планов будет нельзя',
            `Пересчитать планы на ${dayjs().format('MMMM')}?`,
            {
                confirmButtonText: 'Пересчитать',
                confirmButtonClass: 'el-button--warning',
            }
        );

        await dbController.recalcPlansOfCurrentMonth();
        await Promise.all([loadBalanceDynamic(), loadPlans()]);

        ElMessage({
            type: 'success',
            message: 'Сохранено',
        });
    } catch (err) {
        if (err === 'cancel') return;
        notifyWrap(err);
    }
};
//
// const openStatisticDialog = () => {
//     console.log('openStatisticDialog');
//     this.statisticDialog = true;
// };
// const handleCancelStatistic = result => {
//     console.log('handleCancelStatistic', result);
//     if (result) {
//         this.filteredCategoryIds = result.categories_ids;
//         this.filteredDates = result.dates;
//         this.isShowFilteredOnly = result.isShowFilteredOnly;
//     }
//     this.statisticDialog = false;
// };

const loadCategories = async () => {
    try {
        categories.value = await dbController.getCategoriesByGroups();
    } catch (error) {
        console.log(error);
    }
};

const loadBalanceDynamic = async () => {
    try {
        balances.value = await dbController.getBalanceDynamic();
    } catch (error) {
        console.log(error);
    }
};

const loadPlans = async () => {
    try {
        plansMatrix.value = await dbController.getPlansMatrix();
    } catch (error) {
        console.log(error);
    }
};

const loadActionSums = async () => {
    try {
        actionSumsByCategoryIds.value = await dbController.getActionSumsByCategoryIds();
    } catch (error) {
        console.log(error);
    }
};

const init = async () => {
    isDataReady.value = false;
    console.log('init plans');

    await Promise.all([loadCategories(), loadBalanceDynamic(), loadPlans(), loadActionSums()]);
    isDataReady.value = true;
};

onMounted(() => {
    emitHelper.on('update-all', init);

    init();
});
onBeforeUnmount(() => {
    emitHelper.off('update-all', init);
});
</script>
<style scoped>
.container {
    display: grid;
    gap: 12px;
}

.title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.title > h4 {
    margin: 0;
}

.title > .button-bar {
    align-self: flex-end;
}

.button-bar {
    display: flex;
    align-items: center;
    gap: 12px;
}

.button-bar > button {
    margin: 0;
}

.checkbox-bar {
    display: flex;
    flex-direction: column;
}

.el-table {
    border-radius: 8px;
    border: 1px solid var(--el-color-gray-light-3);
    --table-height: calc(100vh - var(--header-height) - var(--footer-height-mobile) - 188px);
    --table-height: calc(100dvh - var(--header-height) - var(--footer-height-mobile) - 188px);
}

:deep(.el-table__header-wrapper) {
    box-shadow: var(--el-box-shadow-light);
    position: relative;
    z-index: 10;
}

:deep(.el-table__body-wrapper) {
    z-index: 5;
}

:deep(.el-table__header th.el-table__cell) {
    vertical-align: top;
}

.table-normal :deep(.el-table__header th.el-table__cell),
.table-reversed :deep(.el-table__header th.el-table__cell:not(:has(.category-header))),
.table-reversed :deep(td.el-table__cell:has(.date)) {
    background-color: var(--el-color-gray);
}

:deep(.el-table__inner-wrapper) {
    border: none;
}

.el-table :deep(.el-table__cell) {
    padding: 4px 0;
}

:deep(.cell) {
    padding: 0 8px;
    height: 100%;
}

.category-column :deep(.cell) {
    display: flex;
    align-items: baseline;
}

.el-table :deep(.cell) {
    text-overflow: initial;
    overflow: unset;
}

:deep(.el-table__placeholder) {
    display: none;
}

.category-name {
    word-break: keep-all;
    overflow-wrap: break-word;
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.category-name:not(.parent-category) {
    margin-left: -18px;
}

.category-name .el-link {
    font-weight: inherit;
}

:deep(.el-table__cell):has(.category-name.income) {
    background-color: var(--el-color-success-light-8);
    font-weight: bold;
}

:deep(.el-table__cell):has(.category-name.expense) {
    background-color: var(--el-color-info-light-8);
    font-weight: bold;
}

:deep(.el-table__cell):has(.category-name.parent-category.income) {
    background-color: var(--el-color-success-light-7);
    cursor: pointer;
}

:deep(.el-table__cell):has(.category-name.parent-category.expense) {
    background-color: var(--el-color-info-light-7);
    cursor: pointer;
}

.category-name.income > span {
    color: var(--el-color-success-dark-2);
}

.category-name.expense > span {
    color: var(--el-color-info-dark-2);
}

.symbol {
    display: flex;
    width: 16px;
}

.symbol.plus,
.symbol.plus + span,
.symbol.plus + .el-link:not(:hover, :active) {
    color: var(--el-color-success);
}

.symbol.unlock,
.symbol.unlock + span,
.symbol.unlock + .el-link:not(:hover, :active) {
    color: var(--el-color-danger-dark-2);
}

.symbol.lock,
.symbol.lock + span,
.symbol.lock + .el-link:not(:hover, :active) {
    color: var(--el-color-primary-dark-1);
}

.symbol.minus,
.symbol.minus + span,
.symbol.minus + .el-link:not(:hover, :active) {
    color: var(--el-color-info);
}

.plans-sum {
    font-weight: bold;
}

.table.empty {
    height: 50vh;
}
.table .el-table {
    --el-table-border: 1px solid var(--el-color-gray-light-3);
}

.table .el-table :deep(.is-group .el-table__cell) {
    background-color: var(--el-color-white);
}

.table .el-table :deep(.el-table__cell):has(.category-header.income) {
    background-color: var(--el-color-success-light-8);
}

.table .el-table :deep(.el-table__cell):has(.category-header.expense) {
    background-color: var(--el-color-info-light-8);
}

.category-header {
    word-break: keep-all;
}

.category-header .el-link {
    font-weight: inherit;
}

.category-header.income,
.category-header.income .el-link:not(:hover, :active) {
    color: var(--el-color-success-dark-2);
}

.category-header.income.savings,
.category-header.income.savings .el-link:not(:hover, :active) {
    color: var(--el-color-danger-dark-2);
}

.category-header.expense,
.category-header.expense .el-link:not(:hover, :active) {
    color: var(--el-color-info-dark-2);
}

.category-header.expense.savings,
.category-header.expense.savings .el-link:not(:hover, :active) {
    color: var(--el-color-primary-dark-1);
}

.table .table-normal :deep(.el-table__cell):has(.yearStart),
.table .table-reversed :deep(.el-table__cell):has(.yearStart) {
    position: relative;
}

.table .table-normal :deep(.el-table__cell):has(.yearStart)::before,
.table .table-reversed :deep(.el-table__cell):has(.yearStart)::before {
    content: ' ';
    display: block;
    background-color: var(--el-color-gray-light-5);
    position: absolute;
}

.table .table-normal :deep(.el-table__cell):has(.yearStart)::before {
    width: 3px;
    height: 100%;
    top: 0;
    transform: translateX(-50%);
}

.table .table-reversed :deep(.el-table__cell):has(.yearStart)::before {
    width: 100%;
    height: 3px;
    left: 0;
    top: 0;
    transform: translateY(-50%);
}

.date {
    color: var(--el-text-color-secondary);
    font-weight: bold;
}

.add-category-row {
    padding: 8px 8px 16px;
    display: flex;
    align-items: center;
    color: var(--el-color-primary);
    gap: 6px;
    cursor: pointer;
}

.add-category-row:hover {
    background-color: var(--el-color-primary-light-9);
}

.add-category-row:active {
    background-color: var(--el-color-primary-light-8);
}

.button-container {
    display: flex;
    justify-content: right;
    flex-wrap: wrap-reverse;
    row-gap: 8px;
    column-gap: 12px;
    margin-top: 12px;
}
.button-container > .el-button {
    margin: 0;
}
.el-badge > :deep(sup) {
    top: 4px;
    right: 8px !important;
}
.correlation-check {
    display: flex;
    height: 100%;
    justify-content: center;
    align-items: center;
}

@media (min-width: 768px) {
    .title {
        flex-direction: row;
        align-items: center;
    }

    .title > .button-bar {
        align-self: flex-end;
    }

    .el-table {
        --table-height: calc(100vh - var(--header-height) - var(--footer-height) - 152px);
        --table-height: calc(100dvh - var(--header-height) - var(--footer-height) - 152px);
    }
}
</style>
