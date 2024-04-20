<template>
    <div class="container">
        <el-card>
            <div class="title">
                <h4>Планы по месяцам и категориям</h4>
                <div class="button-bar">
                    <template v-if="!isMobileSize">
                        <el-button
                            @click="isShowedBalance = !isShowedBalance"
                            :type="isShowedBalance ? 'primary' : ''"
                            round
                            plain
                            :icon="iconLock"
                        >
                            Баланс
                        </el-button>
                        <!-- <el-button @click="isShowedSavings = !isShowedSavings" :type="isShowedSavings ? 'primary' : ''" round plain
              :icon="iconCoin">
              Накопления
            </el-button>
            <el-button @click="isShowedDinamic = !isShowedDinamic" :type="isShowedDinamic ? 'primary' : ''" round plain
              :icon="iconDinamic">
              Изменения
            </el-button>
            <el-button @click="isShowedPercentage = !isShowedPercentage" :type="isShowedPercentage ? 'primary' : ''" round
              plain>
              % Процентаж
            </el-button> -->
                        <el-button
                            @click="isShowedCorrelation = !isShowedCorrelation"
                            :type="isShowedCorrelation ? 'primary' : ''"
                            round
                            plain
                        >
                            <i style="margin: 0 6px 3px 0">ρ</i>Корреляция
                        </el-button>
                        <!-- <el-button @click="isReversedLayout = !isReversedLayout" :type="isReversedLayout ? 'primary' : ''" round plain
              :icon="iconFlip">
              Перевернуть
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
                            <el-checkbox v-model="isShowedBalance">Баланс</el-checkbox>
                            <!-- <el-checkbox v-model="isShowedSavings">Накопления</el-checkbox>
              <el-checkbox v-model="isShowedDinamic">Изменения</el-checkbox>
              <el-checkbox v-model="isShowedPercentage">Процентаж</el-checkbox> -->
                            <el-checkbox v-model="isShowedCorrelation">Корреляция</el-checkbox>
                            <!-- <el-checkbox v-model="isReversedLayout">Перевернуть</el-checkbox> -->
                            <el-checkbox v-model="isShowedS">Корреляция</el-checkbox>
                        </div>
                    </el-popover>
                </div>
            </div>
            <div class="table">
                <el-table
                    class="table-normal"
                    :data="categoriesList"
                    row-key="_id"
                    default-expand-all
                    border
                    max-height="var(--table-height)"
                    @row-click="toggleExpand"
                    ref="plansTable"
                    v-if="!isReversedLayout"
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
                                    <span class="span-wrap-keepall"
                                        >{{ monthProgress }}% месяца</span
                                    >
                                </div>
                                <div class="table-title tips">
                                    <span class="span-wrap-keepall">{{
                                        plansSmirnovStatistic.gammaN
                                    }}</span>
                                </div>
                            </div>
                        </template>
                        <template #default="{ row: category }">
                            <span
                                class="category-name"
                                @click="
                                    () =>
                                        !category.children
                                            ? callEditCategory(category._id)
                                            : undefined
                                "
                                :class="[
                                    category.status,
                                    category.type,
                                    category.children ? 'parent-category' : '',
                                ]"
                            >
                                <template v-if="category.type === 'default'">
                                    <el-icon
                                        v-if="category.status === 'income'"
                                        class="symbol plus"
                                        :size="10"
                                    >
                                        <Plus />
                                    </el-icon>
                                    <el-icon
                                        v-if="category.status === 'expense'"
                                        class="symbol minus"
                                        :size="10"
                                    >
                                        <Minus />
                                    </el-icon>
                                </template>
                                <template v-if="category.type === 'savings'">
                                    <el-icon
                                        v-if="category.status === 'expense'"
                                        class="symbol lock"
                                        :size="14"
                                    >
                                        <Lock />
                                    </el-icon>
                                    <el-icon
                                        v-if="category.status === 'income'"
                                        class="symbol unlock"
                                        :size="14"
                                    >
                                        <Unlock />
                                    </el-icon>
                                </template>
                                <el-link
                                    v-if="!category.children"
                                    @click="callEditCategory(category._id)"
                                >
                                    {{ category.name }}
                                </el-link>
                                <span v-else>{{ category.name }}</span>
                            </span>
                        </template>
                    </el-table-column>
                    <el-table-column
                        v-if="isShowedBalance"
                        :width="isMobileSize ? '90' : '130'"
                        fixed
                    >
                        <template #header>
                            <span class="span-wrap-keepall">Выполнение планов</span>
                        </template>
                        <template #default="{ row: category }">
                            <PlansPercent
                                :current-sum="progressByCategoriesIds[category._id]?.sum"
                                :percentage="progressByCategoriesIds[category._id]?.percentage"
                                :show-percentage="
                                    progressByCategoriesIds[category._id]?.percentage !== undefined
                                "
                                :status="category.status"
                            />
                        </template>
                    </el-table-column>
                    <el-table-column
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
                    </el-table-column>
                    <el-table-column
                        v-for="(date, index) in datesList"
                        :key="index"
                        width="120"
                    >
                        <template #header>
                            <div
                                class="table-title dates"
                                :class="{ yearStart: isYearStart(date) }"
                            >
                                <span class="desktop-only">{{
                                    $dayjs(date).format('MMMM YY')
                                }}</span>
                                <span class="mobile-only">{{
                                    $dayjs(date).format('MM.YYYY')
                                }}</span>
                                <template v-if="!(datesRange?.at(-1) < date)">
                                    <PlansBalance
                                        v-if="isShowedBalance"
                                        :sum="balancesByDates[date]?.balance"
                                        :dinamic="balancesByDates[date]?.balanceDiff"
                                        type="default"
                                        :is-show-dinamic="isShowedBalance"
                                    />
                                    <PlansBalance
                                        v-if="isShowedBalance"
                                        :sum="balancesByDates[date]?.savings"
                                        :dinamic="balancesByDates[date]?.savingsDiff"
                                        type="savings"
                                        :is-show-dinamic="isShowedBalance"
                                        style="margin: 4px 0 4px"
                                    />
                                </template>
                                <template v-else>
                                    <PlansBalance
                                        v-if="isShowedBalance"
                                        :sum="balancesByDates[datesRange?.at(-1)]?.balance"
                                        :dinamic="0"
                                        type="default"
                                        :is-show-dinamic="isShowedBalance"
                                    />
                                    <PlansBalance
                                        v-if="isShowedBalance"
                                        :sum="balancesByDates[datesRange?.at(-1)]?.savings"
                                        :dinamic="0"
                                        type="savings"
                                        :is-show-dinamic="isShowedBalance"
                                        style="margin: 4px 0 4px"
                                    />
                                </template>
                                <PlansCorrelation
                                    v-if="isShowedCorrelation && correlationsByDates[date]"
                                    :factor="correlationsByDates[date].k"
                                    :positive="correlationsByDates[date].isPositive"
                                    :negative="correlationsByDates[date].isNegative"
                                />
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
                                                plansMatrix?.[date]?.[category._id] || {
                                                    date,
                                                    category_id: category._id,
                                                }
                                            )
                                        "
                                        :sum="plansMatrix?.[date]?.[category._id]?.sum"
                                        :status="category.status"
                                        :date="date"
                                        :deviation="
                                            plansSmirnovStatistic.deviations?.[date]?.[category._id]
                                        "
                                    />
                                </div>
                            </template>
                            <div
                                class="plans-sum"
                                :class="{ yearStart: isYearStart(date) }"
                                v-else
                            >
                                <PlansItem
                                    :sum="plansSumsByDates?.[date]?.[category.status]?.balance || 0"
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

                <!-- <el-table class="table-reversed" v-else :data="datesList" border ref="plansTable2"
          max-height="var(--table-height)">
          <el-table-column :width="isMobileSize ? 80 : 120" fixed class="dates-column">
            <template #header>
              <div class="desktop-only">
                <div class="table-title tips" :class="{ gaped: isReversedLayout }">
                  <span class="span-wrap-keepall">{{ monthProgress }}% месяца</span>
                </div>
              </div>
            </template>
            <template #default="{ row: date }">
              <span class="date" :class="{ yearStart: isYearStart(date) }">
                {{ $dayjs(date).format(isMobileSize ? 'MM.YYYY' : 'YYYY MMMM') }}
              </span>
            </template>
          </el-table-column>
          <el-table-column v-if="isShowedBalance" width="110" fixed>
            <template #header>
              <span>Баланс</span>
            </template>
            <template #default="{ row: date }">
              <PlansBalance :sum="balancesByDates[date]?.balance" :dinamic="balancesByDates[date]?.balanceDiff"
                type="default" :is-show-dinamic="isShowedDinamic" :class="{ yearStart: isYearStart(date) }" />
            </template>
          </el-table-column>
          <el-table-column v-if="isShowedSavings" width="110" fixed>
            <template #header>
              <span>Накопления</span>
            </template>
            <template #default="{ row: date }">
              <PlansBalance :sum="balancesByDates[date]?.savings" :dinamic="balancesByDates[date]?.savingsDiff"
                type="savings" :is-show-dinamic="isShowedDinamic" :class="{ yearStart: isYearStart(date) }" />
            </template>
          </el-table-column>
          <el-table-column v-for="(categGroup, index) in plansByCategories" :key="index" :label="categGroup.name">
            <template #header>
              <div class="table-title category-header" :class="[categGroup.status, categGroup.type]">
                <div>{{ categGroup.name }}</div>
              </div>
            </template>
            <el-table-column width="120" v-for="(category, index) in [categGroup, ...categGroup.children]" :key="index"
              :label="category.name">
              <template #header>
                <div class="table-title category-header" :class="[category.status, category.type]">
                  <PlansPercent v-if="isShowedPercentage" :current-sum="progressByCategoriesIds[category._id]?.sum"
                    :percentage="progressByCategoriesIds[category._id]?.percentage"
                    :show-percentage="progressByCategoriesIds[category._id]?.percentage !== undefined"
                    :status="category.status" style="margin-bottom:4px" />
                  <el-link v-if="category.type" @click="callEditCategory(category._id)">
                    {{ category.name }}
                  </el-link>
                  <div v-else>Всего</div>
                </div>
              </template>
              <template #default="{ row: date }">
                <template v-if="category.type">
                  <div class="plan-item" :class="{ yearStart: isYearStart(date) }">
                    <PlansItem @call-to-edit="callEditPlan(category.plans[date] || { date, category_id: category._id })"
                      :sum="category.plans[date]?.sum" :status="category.status" :date="date" />
                  </div>
                </template>
                <div class="plans-sum" :class="{ yearStart: isYearStart(date) }" v-else>
                  <PlansItem :sum="plansByDatesObj[date]?.sums?.[category.status] || 0" type="all"
                    :status="category.status" />
                </div>
              </template>
            </el-table-column>
          </el-table-column>
        </el-table> -->
            </div>
            <div class="button-container">
                <el-badge :is-dot="hasStatisticSettings">
                    <el-button
                        @click="openStatisticDialog"
                        round
                        type="success"
                        :size="isMobileSize ? 'large' : ''"
                        :icon="iconDataAnalysis"
                    >
                        Статистика
                    </el-button>
                </el-badge>
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
                class="dialog"
            />
        </el-dialog>

        <el-dialog
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
        </el-dialog>
    </div>
</template>
<script>
import { shallowRef } from 'vue';
import ActionsBar from '../components/ActionsBar.vue';
import PlansBalance from '../components/PlansBalance.vue';
import PlansItem from '../components/PlansItem.vue';
import PlansForm from '../components/PlansForm.vue';
import {
    mapObject,
    getEntityField,
    getObjectFromArray,
    getFormattedCount,
    cloneByJSON,
} from '../services/utils';
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

export default {
    components: {
        ActionsBar,
        PlansItem,
        Lock,
        Unlock,
        Plus,
        Minus,
        PlansBalance,
        PlansPercent,
        PlansForm,
        CategoriesForm,
        CopyDocument,
        PlansDeletingForm,
        PlansExtendingForm,
        Filter,
        CircleCheckFilled,
        CircleCloseFilled,
        PlansCorrelation,
        StatisticForm,
    },
    setup() {
        return {
            iconLock: shallowRef(Lock),
            iconCoin: shallowRef(Coin),
            iconDinamic: shallowRef(Sort),
            iconFlip: shallowRef(Refresh),
            iconMore: shallowRef(MoreFilled),
            iconCPlus: shallowRef(CirclePlusFilled),
            iconRemove: shallowRef(RemoveFilled),
            iconRecalc: shallowRef(RefreshLeft),
            iconExtend: shallowRef(DArrowRight),
            iconDataAnalysis: shallowRef(DataAnalysis),
        };
    },
    data() {
        return {
            // table settings
            isReversedLayout: false,
            isShowedBalance: true,
            // isShowedSavings: true,
            // isShowedDinamic: true,
            // isShowedPercentage: true,
            isShowedCorrelation: false,
            //
            deletingPlanDialog: false,
            //
            extendingPlanDialog: false,
            //
            planDialog: false,
            isEditMode: false,
            //
            categoryDialog: false,
            isEditCategory: false,
            //
            filteredCategoryIds: [],
            filteredDates: [],
            statisticDialog: false,
            isShowFilteredOnly: false,
            getFormattedCount,
        };
    },
    computed: {
        hasStatisticSettings() {
            return this.filteredCategoryIds?.length && this.filteredDates?.length;
        },
        categoriesStored() {
            return this.$store.getters.getData('categories') || [];
        },
        categoriesCalc() {
            return this.$store.getters.getCalcs('categoriesIds') || {};
        },
        categoriesIndexes() {
            return this.$store.getters.getCalcs('categoriesIndexesByIds') || {};
        },
        plansStored() {
            return this.$store.getters.getData('plans') || [];
        },
        plansCalc() {
            return this.$store.getters.getCalcs('plansIdsByDatesByCategoriesIds') || {};
        },
        plansIndexes() {
            return this.$store.getters.getCalcs('plansIndexesByIds') || {};
        },
        plansMatrix() {
            const matrix = {};
            for (const date in this.plansCalc) {
                matrix[date] = {};
                for (const category_id in this.plansCalc[date]) {
                    matrix[date][category_id] =
                        this.plansStored?.[
                            this.plansIndexes?.[this.plansCalc?.[date]?.[category_id]]
                        ];
                }
            }
            // console.log('matrix', matrix);
            return matrix;
        },
        plansSumsByDates() {
            return this.$store.getters.getCalcs('sumsByDatesByCategoriesStatuses') || {};
        },
        progressByCategoriesIds() {
            return this.$store.getters.getCalcs('progressByCategoriesIds') || {};
        },
        balancesByDates() {
            return this.$store.getters.getCalcs('balancesByDates') || {};
        },
        categoriesObj() {
            return getObjectFromArray(this.categoriesStored);
        },
        categoriesDeviations() {
            const stdDevs = {};
            for (const category_id in this.plansByCategoriesFlatten) {
                const plansSums = this.plansByCategoriesFlatten[category_id].map(({ sum }) => sum);
                stdDevs[category_id] = getStandardDeviation(plansSums);
            }
            return stdDevs;
        },
        categoriesForCorrelation() {
            const data = Object.entries(this.categoriesDeviations).map(([_id, stdDev]) => ({
                _id,
                value: stdDev,
            }));
            return getIdsInNormalDistribution(data);
        },
        categoriesList() {
            let categories = [
                {
                    _id: 'income',
                    status: 'income',
                    name: 'Доходы',
                    children: [],
                },
                {
                    _id: 'expense',
                    status: 'expense',
                    name: 'Расходы',
                    children: [],
                },
            ];
            categories.forEach(categs => {
                categs.children = ['default', 'savings']
                    .map(categType => {
                        return this.categoriesCalc[categs.status]?.[categType]
                            .filter(id => {
                                return this.isShowFilteredOnly
                                    ? this.filteredCategoryIds.includes(id)
                                    : true;
                            })
                            .map(id => {
                                return cloneByJSON(
                                    this.categoriesStored[this.categoriesIndexes[id]]
                                );
                            })
                            .sort((a, b) => {
                                const [nameA, nameB] = [a.name, b.name];
                                if (nameA < nameB) return -1;
                                if (nameA > nameB) return 1;
                                return 0;
                            });
                    })
                    .reduce((result, curr) => result?.concat(curr));
                // console.log(categs.children);
            });
            return categories;
        },
        plansDates() {
            const dates = new Set(
                this.plansStored.map(({ date }) => this.$dayjs(date).format('YYYY-MM'))
            );
            return Array.from(dates).sort((a, b) => new Date(b) - new Date(a));
        },
        datesRange() {
            return this.$store.getters.getCalcs('datesRange') || [];
        },
        datesList() {
            const dates = cloneByJSON(this.datesRange);
            let lastDate = dates.at(-1);
            for (let monthsCount = 1; monthsCount <= 12; monthsCount++) {
                dates.push(this.$dayjs(lastDate).add(monthsCount, 'month').format('YYYY-MM'));
            }
            return dates.filter(date => {
                return this.isShowFilteredOnly ? this.filteredDates.includes(date) : true;
            });
        },
        correlationsByDates() {
            const correlations = {};

            this.datesRange.forEach((date, idx, dates) => {
                const correlationDataCurr = [];
                const correlationDataPrev = [];
                if (idx) {
                    this.categoriesForCorrelation.forEach(category_id => {
                        correlationDataCurr.push(this.plansMatrix[date][category_id]?.sum || 0);
                        correlationDataPrev.push(
                            this.plansMatrix[dates[idx - 1]][category_id]?.sum || 0
                        );
                    });

                    const corr = getPearsonCorrelation(
                        correlationDataCurr,
                        correlationDataPrev
                    );
                    correlations[date] = {
                        ...corr,
                        k: +corr.k.toFixed(2),
                    }
                }
            });

            return correlations;
        },
        plansByCategoriesFlatten() {
            let plans = Object.fromEntries(this.categoriesStored.map(({ _id }) => [_id, []]));
            this.plansStored.forEach(plan => {
                plans[plan.category_id].push(cloneByJSON(plan));
            });
            return plans;
        },
        plansByCategories() {
            return this.categoriesList.map(categsGroups => ({
                ...categsGroups,
                children: categsGroups.children.map(categ => {
                    categ.plans = mapObject(
                        getObjectFromArray(this.plansByCategoriesFlatten[categ._id], 'date'),
                        (k, v) => {
                            return [this.$dayjs(k).format('YYYY-MM'), v];
                        },
                        true
                    );
                    return categ;
                }),
            }));
        },
        plansByDates() {
            let plans = Object.fromEntries(this.plansDates.map(date => [date, []]));
            let sums = mapObject(plans, () => ({
                income: 0,
                expense: 0,
            }));
            this.plansStored.forEach(plan => {
                const date = this.$dayjs(plan.date).format('YYYY-MM');
                const status = this.categoriesObj[plan.category_id].status;
                plans[date].push(cloneByJSON(plan));
                sums[date][status] = Math.round((sums[date][status] + plan.sum) * 100) / 100;
            });
            return this.plansDates.map(date => {
                return {
                    date,
                    sums: sums[date],
                    plans: plans[date],
                };
            });
        },
        plansByDatesObj() {
            return getObjectFromArray(this.plansByDates, 'date');
        },
        plansSmirnovStatistic() {
            const matrix = {};

            if (this.filteredDates.length < 2 || this.filteredCategoryIds.length < 2) {
                return {};
            }
            for (const date of this.filteredDates) {
                // if (!this.filteredDates.includes(date)) continue;
                if (!matrix[date]) {
                    matrix[date] = {};
                }

                for (const category_id of this.filteredCategoryIds) {
                    // if (!this.filteredCategoryIds.includes(category_id)) continue;
                    if (matrix[date][category_id] === undefined) {
                        matrix[date][category_id] = this.plansMatrix[date][category_id]?.sum || 0;
                    }
                }
            }

            for (const date in this.datesRange) {
                if (!Object.values(matrix[date] || {}).reduce((sum, curr) => sum + curr, 0)) {
                    delete matrix[date];
                }
            }

            for (const category_id in matrix[Object.keys(matrix)[0]]) {
                if (!Object.values(matrix).reduce((sum, curr) => sum + curr[category_id], 0)) {
                    Object.values(matrix).forEach(
                        statisticAtDate => delete statisticAtDate[category_id]
                    );
                }
            }

            console.log(matrix);
            if (
                Object.keys(matrix).length < 2 ||
                Object.keys(matrix[Object.keys(matrix)[0]]).length < 2
            ) {
                return {};
            }
            return getSmirnovStatistic(matrix);
        },
        isMobileSize() {
            return this.$store.getters['getWindowSizeState'];
        },
        monthProgress() {
            return Math.round((this.$dayjs().date() / this.$dayjs().daysInMonth()) * 100);
        },
    },
    methods: {
        toggleExpand(row, col) {
            if (col?.no !== 0) return;
            this.$refs.plansTable.toggleRowExpansion(row);
        },
        isCurrentMonth(date) {
            return this.$dayjs(date).isSame(this.$dayjs(), 'month');
        },
        isYearStart(date) {
            return this.$dayjs(date).month() === 0;
        },
        openPlanDialog() {
            this.planDialog = true;
        },
        handleCancelPlan() {
            this.planDialog = false;
            this.isEditMode = false;
            this.$router.push({
                path: '/plans',
                replace: true,
            });
        },
        async callEditPlan(plan) {
            if (plan?._id) this.isEditMode = true;
            if (plan) {
                await this.$router.push({
                    path: '/plans',
                    query: {
                        ...plan,
                        isEdit: !!plan?._id,
                    },
                    replace: true,
                });
            }
            this.openPlanDialog();
        },
        //
        openDeletingPlanDialog() {
            this.deletingPlanDialog = true;
        },
        handleCancelDeletingPlan() {
            this.deletingPlanDialog = false;
        },
        //
        openExtendingPlanDialog() {
            this.extendingPlanDialog = true;
        },
        handleCancelExtendingPlan() {
            this.extendingPlanDialog = false;
        },
        //
        handleCancelCategory() {
            this.categoryDialog = false;
            this.isEditCategory = false;
            this.$router.push({
                path: '/plans',
                replace: true,
            });
        },
        async callEditCategory(category_id) {
            let editedCateg;
            if (category_id) {
                editedCateg = this.categoriesStored.find(({ _id }) => _id === category_id);
            }
            if (editedCateg) {
                this.isEditCategory = true;
                await this.$router.push({
                    path: '/plans',
                    query: {
                        ...editedCateg,
                        isEdit: true,
                    },
                    replace: true,
                });
            }
            this.openCategoryDialog();
        },
        openCategoryDialog() {
            this.categoryDialog = true;
        },
        //
        async handleRecalcMonth() {
            try {
                await this.$confirm(
                    'Восстановить прошлое значение планов будет нельзя',
                    `Пересчитать планы на ${this.$dayjs().format('MMMM')}?`,
                    {
                        confirmButtonText: 'Пересчитать',
                        confirmButtonClass: 'el-button--warning',
                    }
                );

                const plans = new Plans();
                let changes = plans.recalcCurrentPlans();

                await this.$store.dispatch('saveDataChanges', changes);
                this.$message({
                    type: 'success',
                    message: 'Сохранено',
                });
            } catch (err) {
                if (err === 'cancel') return;
                notifyWrap(err);
            }
        },
        //
        openStatisticDialog() {
            console.log('openStatisticDialog');
            this.statisticDialog = true;
        },
        handleCancelStatistic(result) {
            console.log('handleCancelStatistic', result);
            if (result) {
                this.filteredCategoryIds = result.categories_ids;
                this.filteredDates = result.dates;
                this.isShowFilteredOnly = result.isShowFilteredOnly;
            }
            this.statisticDialog = false;
        },
    },
};
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
    --table-height: calc(100dvh - var(--header-height) - var(--footer-height-mobile) - 188px);
    --table-height: calc(100vh - var(--header-height) - var(--footer-height-mobile) - 188px);
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
        --table-height: calc(100dvh - var(--header-height) - var(--footer-height) - 152px);
        --table-height: calc(100vh - var(--header-height) - var(--footer-height) - 152px);
    }
}
</style>
