<template>
    <div class="container">
        <div class="left-col">
            <div class="range__container">
                <el-card>
                    <div class="title">
                        <h4>Сегоднябрь</h4>
                        <div class="balance">
                            <template v-if="isCheckedBalance">
                                <p class="main_balance">
                                    <el-link
                                        type="primary"
                                        @click="openBalanceDialog"
                                    >
                                        Остаток:
                                    </el-link>
                                    {{
                                        getFormattedCount(currentBalance.balance, {
                                            mode: 'currency',
                                            accuracy: 0,
                                        })
                                    }}
                                </p>
                                <p class="with-savings_balance">
                                    <el-link
                                        type="primary"
                                        @click="openBalanceDialog"
                                    >
                                        Накопления:
                                    </el-link>
                                    {{
                                        getFormattedCount(currentBalance.savings, {
                                            mode: 'currency',
                                            accuracy: 0,
                                        })
                                    }}
                                </p>
                            </template>
                            <template v-else>
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
                            </template>
                        </div>
                    </div>
                </el-card>
            </div>
            <div class="plans__container">
                <el-card>Планы</el-card>
            </div>
            <div class="actions__container">
                <el-card>
                    <el-scrollbar
                        max-height="calc(100vh - var(--header-height) - var(--footer-height) - 136px)"
                    >
                        <div class="actions">
                            <template
                                v-for="({ day, actions }, idx) in actionsByDays"
                                :key="idx"
                            >
                                <h6>{{ day }}</h6>
                                <div
                                    class="action"
                                    v-for="(action, i) in actions"
                                    :key="i"
                                >
                                    <div class="icon"></div>
                                    <div class="text">
                                        <div
                                            class="category desktop-only el-link el-link--default is-underline"
                                            @click="callEditAction(action)"
                                        >
                                            {{
                                                getEntityField(categoriesStored, action.category_id)
                                            }}
                                        </div>
                                        <div
                                            class="category mobile-only el-link el-link--default is-underline"
                                            @click="callEditAction(action, true)"
                                        >
                                            {{
                                                getEntityField(categoriesStored, action.category_id)
                                            }}
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
                                        <span class="count">{{
                                            getFormattedCount(action.sum, { mode: 'currency' })
                                        }}</span>
                                    </div>
                                </div>
                            </template>
                            <el-empty
                                v-if="!actionsByDays?.length"
                                description="Сохраненных операций пока нет"
                                :image-size="163"
                            ></el-empty>
                        </div>
                    </el-scrollbar>
                </el-card>
            </div>
        </div>
        <div class="right-col">
            <div class="plans__container">
                <el-card>Планы</el-card>
            </div>
            <div class="form_desktop__container">
                <ActionsForm
                    class="light primary-shadow"
                    mode="full"
                    @call-to-end="handleCancelAction"
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
<script>
import { shallowRef } from 'vue';
import ActionsForm from '../components/ActionsForm.vue';
import BalanceForm from '../components/BalanceForm.vue';
import { getEntityField, getFormattedCount } from '../services/utils';
import { Lock, Unlock, Plus, Minus, CirclePlusFilled, Warning } from '@element-plus/icons-vue';
import { Config } from '../services/changings';

export default {
    components: { Lock, Unlock, Plus, Minus, ActionsForm, Warning, BalanceForm },
    setup() {
        return {
            // iconPlus: shallowRef(Plus),
            iconPlus: shallowRef(CirclePlusFilled),
        };
    },
    data() {
        return {
            actionDialog: false,
            isEditMode: false,
            balanceDialog: false,
            //
            getEntityField,
            getFormattedCount,
        };
    },
    computed: {
        categoriesStored() {
            return this.$store.getters.getData('categories');
        },
        actionsStored() {
            return this.$store.getters.getData('actions');
        },
        actionsByDays() {
            const days = new Set(this.actionsStored?.map(({ date }) => date.split('T')[0]));
            const today = this.$dayjs(this.$dayjs().format('YYYY-MM-DD'));

            return Array.from(days)
                .sort((a, b) => new Date(b) - new Date(a))
                .map(dateStr => {
                    const date = this.$dayjs(dateStr);
                    let displayedDate = date.format('D MMMM');

                    if (date.year() < today.year())
                        displayedDate = this.$dayjs(dateStr).format('D MMMM YYYY[ г.]');
                    if (!today.diff(date)) displayedDate = 'Сегодня';
                    if (today.diff(date, 'day') === 1) displayedDate = 'Вчера';

                    return {
                        day: displayedDate,
                        actions: this.actionsStored
                            .filter(({ date }) => date.split('T')[0] === dateStr)
                            .sort((a, b) => new Date(b._createdAt) - new Date(a._createdAt)),
                    };
                });
        },
        isCheckedBalance() {
            return this.$store.getters.getData('config')?.checking_date;
        },
        currentBalance() {
            const config = new Config();
            return config.getCurrent();
        },
    },
    methods: {
        getActionClass(category_id) {
            let status = getEntityField(this.categoriesStored, category_id, 'status');
            let type = getEntityField(this.categoriesStored, category_id, 'type');
            return status + ' ' + type;
        },
        openActionDialog() {
            this.actionDialog = true;
        },
        callEditAction(action, isMobile = false) {
            this.$router.push({
                path: '/actions',
                query: {
                    ...action,
                    isEdit: true,
                },
                replace: true,
            });
            this.isEditMode = true;
            if (isMobile) this.actionDialog = true;
        },
        handleCancelAction() {
            this.actionDialog = false;
            this.isEditMode = false;
            this.$router.push({
                path: '/actions',
                query: {
                    isEdit: false,
                },
                replace: true,
            });
        },
        openBalanceDialog() {
            this.balanceDialog = true;
        },
        handleCancelBalance() {
            this.balanceDialog = false;
        },
    },
    mounted() {
        if (JSON.parse(this.$route?.query?.mobile || 'false')) this.actionDialog = true;
    },
    // updated() {
    //   console.log('updated')
    //   if (JSON.parse(this.$route.query.mobile)) this.actionDialog = true
    // },
};
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
.plans__container {
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

    .left-col > .plans__container {
        display: none;
    }

    /* normal .range__container on desktop */
    /* START */
    .plans__container {
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
