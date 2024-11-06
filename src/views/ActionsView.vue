<template>
    <div class="container">
        <div class="left-col">
            <div class="range__container">
                <el-card>
                    <div class="title">
                        <el-date-picker
                            v-model="currentMonth"
                            :disabled-date="time => time.getTime() > Date.now()"
                            :clearable="false"
                            :editable="false"
                            format="MMMM YYYY"
                            type="month"
                        />
                        <div
                            v-loading="isLoadingBalance"
                            class="balance"
                        >
                            <template v-if="balance">
                                <p class="main_balance">
                                    <el-link
                                        type="primary"
                                        @click="openBalanceDialog"
                                    >
                                        Остаток:
                                    </el-link>
                                    {{ formatHelper.getCurrency(balance.default, 0) }}
                                </p>
                                <p class="with-savings_balance">
                                    <el-link
                                        type="primary"
                                        @click="openBalanceDialog"
                                    >
                                        Накопления:
                                    </el-link>
                                    {{ formatHelper.getCurrency(balance.savings, 0) }}
                                </p>
                            </template>
                            <!-- <template v-else>
                                <div class="balance_empty">
                                    <el-icon :size="13">
                                        <Warning />
                                    </el-icon>
                                    <p class="with-savings_balance">Остаток еще не сверялся</p>
                                </div>
                                <el-link
                                    type="primary"
                                    @click="openBalanceDialog"
                                    >Сверить</el-link
                                >
                            </template> -->
                        </div>
                    </div>
                </el-card>
            </div>
            <div class="actions__container">
                <el-card>
                    <el-scrollbar max-height="calc(100vh - var(--header-height) - var(--footer-height) - 136px)">
                        <div
                            v-if="isDataReady"
                            v-loading="isLoadingActions"
                            class="actions"
                        >
                            <template
                                v-for="{ date, actions } in actions"
                                :key="date"
                            >
                                <h6>{{ getFormattedDate(date) }}</h6>
                                <div
                                    class="action"
                                    v-for="action in actions"
                                    :key="action._id"
                                >
                                    <div class="icon"></div>
                                    <div class="text">
                                        <template v-if="categoriesById[action.category_id]._isEditable">
                                            <div
                                                class="category desktop-only el-link el-link--default is-underline"
                                                @click="callEditAction(action)"
                                            >
                                                {{ categoriesById[action.category_id].name }}
                                            </div>
                                            <div
                                                class="category mobile-only el-link el-link--default is-underline"
                                                @click="callEditAction(action, true)"
                                            >
                                                {{ categoriesById[action.category_id].name }}
                                            </div>
                                        </template>
                                        <div
                                            v-else
                                            class="category not-editable el-link"
                                        >
                                            {{ categoriesById[action.category_id].name }}
                                        </div>
                                        <span class="comment">
                                            {{ action.comment || 'Без комментария' }}
                                        </span>
                                    </div>
                                    <div
                                        class="sum"
                                        :class="getActionClass(action.category_id)"
                                    >
                                        <el-icon
                                            class="symbol plus"
                                            :size="10"
                                        >
                                            <Plus />
                                        </el-icon>
                                        <el-icon
                                            class="symbol minus"
                                            :size="10"
                                        >
                                            <Minus />
                                        </el-icon>
                                        <el-icon
                                            class="symbol lock"
                                            :size="14"
                                        >
                                            <Lock />
                                        </el-icon>
                                        <el-icon
                                            class="symbol unlock"
                                            :size="14"
                                        >
                                            <Unlock />
                                        </el-icon>
                                        <span class="count">
                                            {{ formatHelper.getCurrency(action.sum) }}
                                        </span>
                                    </div>
                                </div>
                            </template>
                            <el-empty
                                v-if="!actions.length"
                                description="Сохраненных операций пока нет"
                                :image-size="163"
                            ></el-empty>
                        </div>
                    </el-scrollbar>
                </el-card>
            </div>
        </div>
        <div class="right-col">
            <!-- <div class="plans__container">
                <el-card>Планы</el-card>
            </div> -->
            <div class="form_desktop__container">
                <ActionsForm
                    class="light primary-shadow"
                    mode="full"
                    @call-to-end="handleCancelAction"
                    @update-action="
                        () => {
                            loadActions();
                            loadBalance();
                        }
                    "
                    @update-category="loadCategories"
                />
            </div>
        </div>
        <div class="adding-button">
            <el-button
                @click="openActionDialog"
                class="primary-shadow"
                type="primary"
                size="large"
                round
                :icon="iconPlus"
                >Добавить операцию</el-button
            >
        </div>

        <el-dialog
            width="100vw"
            v-model="actionDialog"
            :append-to-body="true"
            :before-close="handleCancelAction"
        >
            <template #header>
                <h4>{{ isEditMode ? 'Редактировать' : 'Добавить' }} операцию</h4>
            </template>
            <ActionsForm
                class="dialog"
                mode="full"
                @call-to-end="handleCancelAction"
                @update-action="init"
                @update-category="loadCategories"
            />
        </el-dialog>

        <el-dialog
            width="min(100vw, 500px)"
            v-model="balanceDialog"
            :append-to-body="true"
            :before-close="handleCancelBalance"
        >
            <template #header>
                <h4>Сверить баланс</h4>
            </template>
            <BalanceForm @call-to-end="handleCancelBalance" />
        </el-dialog>
    </div>
</template>
<script setup>
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import ActionsForm from '../components/ActionsForm.vue';
import BalanceForm from '../components/BalanceForm.vue';
import { dayjs, getEntityField, getFormattedCount } from '../services/utils';
import { Lock, Unlock, Plus, Minus, CirclePlusFilled, Warning } from '@element-plus/icons-vue';
import { Config } from '../services/changings';
import store from '../store';
import router from '../router';
import { useRoute } from 'vue-router';
import dbController from '../services/db/controller';
import formatHelper from '../services/helpers/formatHelper';

const route = useRoute();

const iconPlus = shallowRef(CirclePlusFilled);
const actionDialog = ref(false);
const isEditMode = ref(false);
const balanceDialog = ref(false);
const currentMonth = ref(new Date(formatHelper.getISODateString()));

const isLoadingActions = ref(false);
const isLoadingBalance = ref(false);

const actions = ref(null);
const categories = ref(null);
const balance = ref(null);

const categoriesById = computed(() =>
    categories.value.reduce((acc, category) => {
        acc[category._id] = category;
        return acc;
    }, {})
);

const isDataReady = computed(() => categories.value && actions.value);

const currentMonthFormatted = computed(() => {
    return formatHelper.getISOYearMonthString(currentMonth.value);
});

const getFormattedDate = date => {
    let result = '';

    const relative = formatHelper.getRelativeDay(date, true);
    if (relative) result += `${relative}, `;

    result += formatHelper.getEuropeanDateNecessary(date);
    result += `, ${formatHelper.getWeekDayShort(date)}`;

    return result;
};

const getActionClass = category_id => {
    const { status, type } = categoriesById.value[category_id];
    return status + ' ' + type;
};

const openActionDialog = () => {
    actionDialog.value = true;
};

const callEditAction = (action, isMobile = false) => {
    router.push({
        path: '/actions',
        query: {
            ...action,
            isEdit: true,
        },
        replace: true,
    });
    isEditMode.value = true;
    if (isMobile) actionDialog.value = true;
};

const handleCancelAction = () => {
    actionDialog.value = false;
    isEditMode.value = false;
    router.push({
        path: '/actions',
        query: {
            isEdit: false,
        },
        replace: true,
    });
};

const openBalanceDialog = () => {
    balanceDialog.value = true;
};

const handleCancelBalance = () => {
    balanceDialog.value = false;
};

const loadActions = async () => {
    try {
        isLoadingActions.value = true;
        actions.value = await dbController.getActionsListByMonth(currentMonthFormatted.value);
    } catch (error) {
        console.log(error);
    } finally {
        isLoadingActions.value = false;
    }
};

const loadCategories = async () => {
    try {
        categories.value = await dbController.getCategoriesList();
    } catch (error) {
        console.log(error);
    }
};

const loadBalance = async () => {
    try {
        isLoadingBalance.value = true;
        balance.value = await dbController.getCurrentBalance();
    } catch (error) {
        console.log(error);
    } finally {
        isLoadingBalance.value = false;
    }
};

const init = async () => {
    console.log('init actions');

    await loadCategories();
    await loadActions();
    await loadBalance();
};

watch(currentMonthFormatted, () => loadActions());

onMounted(async () => {
    await init();

    if (JSON.parse(route?.query?.mobile || 'false')) actionDialog.value = true;
});
</script>
<style scoped>
.container {
    display: grid;
    gap: 12px;
    align-items: start;
}

.left-col,
.right-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.right-col {
    display: none;
}

.left-col {
    margin-bottom: 56px;
}

/* fixed .range__container on mobile */
/* START */
.actions__container {
    padding-top: 58px;
}

.range__container {
    position: fixed;
    transform: translateY(-16px);
    left: 0;
    right: 0;
    z-index: 1990;
}

/* END */
.range__container .title {
    display: flex;
    justify-content: space-between;
}

.range__container .title > .balance {
    text-align: right;
    /*font-weight: bold;*/
}

.main_balance {
    font-weight: bold;
}

:is(.main_balance, .with-savings_balance) > .el-link {
    font-size: inherit;
    font-weight: inherit;
}

.with-savings_balance {
    font-size: 12px;
}

.balance_empty {
    display: flex;
    align-items: center;
    gap: 4px;
}

.balance_empty,
.balance_empty > .with-savings_balance {
    color: var(--el-color-danger);
}

.el-scrollbar,
:deep(.el-scrollbar__wrap),
:deep(.el-scrollbar__view) {
    display: contents;
}
.actions {
    min-height: 30%;
}
.actions > h6 {
    margin-bottom: 12px;
}

.actions > .action + h6 {
    margin-top: 24px;
}

.action {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
}

.action > .icon {
    width: 36px;
    aspect-ratio: 1;
    border-radius: 50%;
    background-color: var(--el-color-gray);
}

.action > .text {
    flex-grow: 1;
}

.action > .text > .category {
    font-weight: bold;
    display: block;
    width: max-content;
}
.action > .text > .category.not-editable {
    pointer-events: none;
}

.action > .text > .comment {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.action > .sum {
    align-self: flex-start;
    display: flex;
    align-items: center;
    gap: 4px;
    line-height: 1;
}

.action > .sum > .symbol {
    display: none;
}

.action > .sum.income.default > * {
    color: var(--el-color-success);
}

.action > .sum.income.savings > * {
    color: var(--el-color-danger);
}

.action > .sum.expense.savings > * {
    color: var(--el-color-primary);
}

.action > .sum.income.default > .symbol.plus,
.action > .sum.expense.default > .symbol.minus,
.action > .sum.income.savings > .symbol.unlock,
.action > .sum.expense.savings > .symbol.lock {
    display: flex;
}

.adding-button {
    position: fixed;
    top: calc(100vh - var(--footer-height-mobile));
    top: calc(100dvh - var(--footer-height-mobile));
    transform: translateY(calc(-100% - 16px));
    left: 16px;
    right: 16px;
    display: flex;
    justify-content: center;
    pointer-events: none;
}

.adding-button > button {
    pointer-events: all;
}

@media (min-width: 768px) {
    .left-col {
        margin-bottom: 0;
    }

    .el-scrollbar,
    :deep(.el-scrollbar__wrap),
    :deep(.el-scrollbar__view) {
        display: block;
    }

    .el-scrollbar {
        margin-right: -11px;
        padding-right: 11px;
    }

    .container {
        grid-template-columns: repeat(2, 1fr);
    }

    /* normal .range__container on desktop */
    /* START */
    .actions__container {
        padding-top: 0;
    }

    .range__container {
        position: static;
        transform: none;
    }

    /* END */

    .right-col {
        display: flex;
    }

    .adding-button {
        display: none;
    }
}
</style>
