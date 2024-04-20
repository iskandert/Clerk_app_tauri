<template>
    <el-card :class="[$attrs.class, isEditMode ? 'isEditMode' : '']">
        <div class="form-container">
            <h5>
                {{
                    mode === 'mini'
                        ? 'Быстрое добавление'
                        : isEditMode
                        ? 'Редактировать операцию'
                        : 'Добавить операцию'
                }}
            </h5>
            <el-form
                :model="newAction"
                :rules="actionRules"
                label-position="top"
                ref="actionForm"
            >
                <div class="form-items">
                    <el-form-item
                        label="Сумма операции"
                        prop="sum"
                    >
                        <el-input-number
                            v-model="newAction.sum"
                            :min="1"
                            :step="100"
                            @change="sumPartsAll = []"
                            ref="input_sum"
                            @keyup.enter="nextFocus('input_category')"
                        />
                    </el-form-item>
                    <el-form-item
                        label="Категория операции"
                        prop="category_id"
                    >
                        <el-select
                            v-model="newAction.category_id"
                            filterable
                            default-first-option
                            ref="input_category"
                            @keyup.enter="nextFocus('input_date')"
                        >
                            <li class="button_add-category">
                                <el-button
                                    type="primary"
                                    round
                                    :icon="iconPlus"
                                    @click="openCategoryDialog"
                                >
                                    Создать новую
                                </el-button>
                            </li>
                            <el-option-group label="Расходы">
                                <el-option
                                    v-for="({ name, _id }, index) in categories?.expense"
                                    :key="index"
                                    :value="_id"
                                    :label="name"
                                ></el-option>
                            </el-option-group>
                            <el-option-group label="Доходы">
                                <el-option
                                    v-for="({ name, _id }, index) in categories?.income"
                                    :key="index"
                                    :value="_id"
                                    :label="name"
                                ></el-option>
                            </el-option-group>
                            <el-option-group label="Накопления">
                                <el-option
                                    v-for="({ name, _id }, index) in categories?.savings"
                                    :key="index"
                                    :value="_id"
                                    :label="name"
                                ></el-option>
                            </el-option-group>
                        </el-select>
                    </el-form-item>
                </div>
                <template v-if="mode === 'full'">
                    <h6>Дополнительно</h6>
                    <div class="form-items">
                        <el-form-item
                            label="Дата операции"
                            prop="date"
                        >
                            <el-date-picker
                                v-model="newAction.date"
                                :disabled-date="time => time.getTime() > Date.now()"
                                type="date"
                                placeholder="Выберите дату"
                                format="DD.MM.YYYY"
                                ref="input_date"
                                @visible-change="
                                    isVisible =>
                                        !isVisible
                                            ? nextFocus(isEditMode ? 'button_change' : 'button_add')
                                            : undefined
                                "
                            />
                        </el-form-item>
                        <el-form-item
                            label="Составная сумма"
                            class="multipleSum"
                        >
                            <template #label>
                                Составная сумма
                                <InfoBalloon
                                    :data="[
                                        'Вводите суммы через `Enter`, для вычитания из результата добавьте `-` перед суммой.',
                                        'Десятичный разделитель - `.` (точка).',
                                    ]"
                                />
                            </template>
                            <el-input
                                v-model="sumPart"
                                placeholder="Введите сумму по частям"
                                :formatter="replaceSumPartValue"
                                :parser="replaceSumPartValue"
                                @keyup.enter="addSumPart"
                                @blur="addSumPart"
                                ref="input_sumPart"
                            ></el-input>
                            <div class="sum_parts">
                                <el-tag
                                    v-for="(part, idx) in sumPartsAll"
                                    :key="idx"
                                    closable
                                    @close="deleteSumPart(idx)"
                                >
                                    {{ `${Math.round(+part * 100) / 100}`.replace(/\./g, ',') }}
                                </el-tag>
                            </div>
                        </el-form-item>
                        <el-form-item
                            class="comment"
                            label="Комментарий"
                        >
                            <el-input
                                v-model="newAction.comment"
                                :rows="2"
                                type="textarea"
                                placeholder="Подробности операции"
                                ref="input_comment"
                                @keyup.enter="
                                    nextFocus(isEditMode ? 'button_change' : 'button_add')
                                "
                            ></el-input>
                        </el-form-item>
                    </div>
                </template>
            </el-form>
            <div
                class="link"
                v-if="mode === 'mini'"
            >
                <el-link
                    :class="{ 'el-link--primary': !isLightTheme }"
                    @click="openFullForm"
                >
                    Дополнительные настройки
                </el-link>
            </div>
            <div class="form-buttons">
                <el-button
                    v-if="isEditMode"
                    @click="processAction('delete')"
                    type="danger"
                    :icon="iconDelete"
                    round
                >
                    Удалить
                </el-button>
                <el-button
                    v-if="isEditMode"
                    @click="cancelAdding"
                    :icon="iconCancel"
                    round
                >
                    Отменить
                </el-button>
                <el-button
                    v-if="isEditMode"
                    type="success"
                    @click="processAction('change')"
                    :icon="iconCheck"
                    round
                    ref="button_change"
                    id="button_change"
                    @keyup.enter="nextFocus('input_sum')"
                >
                    Сохранить
                </el-button>
                <el-button
                    v-else
                    :class="{ 'el-button--primary': !isLightTheme }"
                    @click="processAction('add')"
                    :icon="iconCheck"
                    round
                    ref="button_add"
                    id="button_add"
                    @keyup.enter="nextFocus('input_sum')"
                >
                    Сохранить
                </el-button>
            </div>
        </div>

        <el-dialog
            width="min(100vw, 500px)"
            v-model="categoryDialog"
            :append-to-body="true"
            :before-close="handleCancelCategory"
            :destroy-on-close="true"
        >
            <template #header>
                <h4>Добавить категорию</h4>
            </template>
            <CategoriesForm
                @call-to-end="handleCancelCategory"
                class="dialog"
            />
        </el-dialog>
    </el-card>
</template>
<script>
import { CirclePlusFilled, Select, Delete, CloseBold } from '@element-plus/icons-vue';
import { shallowRef } from 'vue';
import { cloneByJSON, filterObject, notifyWrap } from '../services/utils';
import { Actions } from '../services/changings';
import InfoBalloon from '../components/InfoBalloon.vue';
import CategoriesForm from './CategoriesForm.vue';

const clearAction = {
    _id: undefined,
    category_id: undefined,
    sum: undefined,
    date: undefined,
    comment: undefined,
};

export default {
    components: {
        InfoBalloon,
        CategoriesForm,
    },
    props: {
        mode: {
            type: String,
            default: 'mini', // mini | full
        },
    },
    emits: ['call-to-end'],
    setup() {
        return {
            iconPlus: shallowRef(CirclePlusFilled),
            iconCheck: shallowRef(Select),
            iconDelete: shallowRef(Delete),
            iconCancel: shallowRef(CloseBold),
        };
    },
    data() {
        return {
            newAction: {},
            actionRules: {
                sum: [{ required: true, message: 'Сумма - обязательное поле', trigger: 'blur' }],
                category_id: [
                    { required: true, message: 'Категория - обязательное поле', trigger: 'blur' },
                ],
                date: [{ required: true, message: 'Дата - обязательное поле', trigger: 'change' }],
            },
            isEditMode: false,
            multipleSum: [],
            sumPart: '',
            sumPartsAll: [],
            categoryDialog: false,
        };
    },
    computed: {
        isLightTheme() {
            return this.$attrs.class?.includes('light');
        },
        categoriesStored() {
            return this.$store.getters.getData('categories');
        },
        categories() {
            const categories = {
                income: [],
                expense: [],
                savings: [],
            };
            this.categoriesStored?.forEach(category => {
                if (category.type === 'savings') return categories.savings.push(category);
                if (category.status === 'income') return categories.income.push(category);
                return categories.expense.push(category);
            });
            return categories;
        },
        routeQuery() {
            return this.$route.query;
        },
    },
    methods: {
        jumpRoute(path) {
            this.$router.push({ path });
        },
        openFullForm() {
            this.$router.push({ path: '/actions', query: this.newAction });
        },
        processAction(mode) {
            const process = async () => {
                try {
                    const actions = new Actions();
                    let changes;
                    if (mode === 'delete') changes = actions.delete(this.newAction._id);
                    if (mode === 'change') changes = actions.change(this.newAction);
                    if (mode === 'add') changes = actions.add(this.newAction);
                    this.cancelAdding();
                    await this.$store.dispatch('saveDataChanges', changes);
                    this.$message({
                        type: 'success',
                        message: 'Сохранено',
                    });
                } catch (err) {
                    notifyWrap(err);
                }
            };
            if (mode === 'delete')
                return this.$confirm('Восстановить операцию будет нельзя', 'Удалить операцию?', {
                    confirmButtonText: 'Удалить',
                    confirmButtonClass: 'el-button--danger',
                })
                    .then(process)
                    .catch(err => err);

            this.$refs.actionForm.validate(async valid => {
                if (!valid) {
                    this.$notify({
                        title: 'Проверьте поля формы',
                        type: 'error',
                    });
                    return false;
                }
                process();
            });
        },
        cancelAdding() {
            const savedValues = filterObject(this.newAction, (k, v) => {
                return !this.isEditMode && ['date', 'category_id'].includes(k) && v;
            });
            this.isEditMode = false;
            this.$emit('call-to-end');
            console.log(savedValues);
            this.newAction = cloneByJSON(clearAction);
            this.newAction.date = new Date();
            this.sumPart = '';
            this.sumPartsAll = [];
            this.newAction = {
                ...this.newAction,
                ...savedValues,
            };
        },
        readFromRouteQuery() {
            if (!JSON.parse(this.$route.query?.isEdit || 'false')) return;
            Object.keys(clearAction).forEach(field => {
                this.newAction[field] = this.$route.query[field];
            });
            if (JSON.parse(this.$route.query?.isEdit || 'false')) this.isEditMode = true;
            else this.isEditMode = false;
            if (!this.newAction.date) this.newAction.date = new Date();
        },
        addSumPart() {
            if (!/-?\d+\.?\d*/.test(this.sumPart)) return;
            this.sumPartsAll.push(this.sumPart);
            this.sumPart = '';
        },
        deleteSumPart(index) {
            this.sumPartsAll.splice(index, 1);
        },
        replaceSumPartValue(value) {
            let result = value.replace(/(?<=^(-\d*)|(\d+))-|(?<=\d+\.\d*)[-\.]|[^-\d\.]|^\./g, '');
            return result;
        },
        handleCancelCategory() {
            this.categoryDialog = false;
        },
        openCategoryDialog() {
            this.categoryDialog = true;
        },
        nextFocus(ref) {
            if (
                ['button_add', 'button_change'].includes(ref) &&
                (!this.newAction.sum || !this.newAction.category_id || !this.newAction.date)
            )
                return;
            this.$refs[ref]?.focus?.() || document.getElementById(ref)?.focus?.();
        },
    },
    watch: {
        routeQuery: {
            handler(nv) {
                // console.log(nv);
                this.readFromRouteQuery();
            },
            deep: true,
        },
        sumPartsAll: {
            handler(nv) {
                if (!nv.length) return;
                this.newAction.sum = nv.reduce((sum, curr) => {
                    let part = Math.round(+curr * 100) / 100;
                    return (sum += part);
                }, 0);
            },
            deep: true,
        },
    },
    mounted() {
        this.readFromRouteQuery();
    },
};
</script>
<style scoped>
.form-container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
}

.el-card {
    box-shadow: none;
}

.el-form > .form-items {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    column-gap: 12px;
    margin-top: 4px;
}

/* color-theme */
/* START */
.el-card.light {
    background-color: var(--el-color-primary-dark-1);
    border: none;
}

.el-card.light.isEditMode {
    background-color: var(--el-color-warning-dark-2);
    background-color: var(--el-color-gray-light-7);
}

.el-card.light .form-container :is(h5, p) {
    color: var(--el-color-white);
}

.el-card.light .form-container h6 {
    color: var(--el-color-transparent-dark-2);
}

.el-card.light .form-container :deep(label) {
    color: var(--el-color-transparent-dark-2);
}

.el-card.light .form-container .el-link {
    --el-link-text-color: var(--el-color-transparent);
    --el-link-hover-text-color: var(--el-color-white);
}

.el-card.light
    .form-container
    .el-form-item.is-required:not(.is-no-asterisk).asterisk-left
    > :deep(.el-form-item__label:before),
.el-card.light .form-container :deep(.el-form-item__error) {
    color: var(--el-color-danger-light-5);
}

.el-card.light .form-container .el-form-item.is-error :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px var(--el-color-danger-light-5) inset;
}

.el-card.light .form-container :deep(.is-focus.el-input__wrapper),
.el-card.light .form-container :deep(.el-textarea__inner:focus) {
    --el-select-input-focus-border-color: var(--el-color-gray-light-9);
    --el-input-focus-border-color: var(--el-color-gray-light-9);
}

/* END */
.el-card.dialog,
.el-card.dialog > :deep(.el-card__body) {
    display: contents;
}

.el-card.dialog h5:first-of-type {
    display: none;
}

.button_add-category {
    display: flex;
    justify-content: center;
    margin-top: 8px;
}

.el-form-item.multipleSum {
    grid-row: span 2;
}

.sum_parts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
}

.sum_parts > .el-tag {
    max-width: 100%;
}

.sum_parts > .el-tag > :deep(.el-tag__content) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.form-container .link {
    display: block;
    text-align: right;
    margin-top: -4px;
}

.form-container .form-buttons {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
    align-self: flex-end;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
}

@media (min-width: 768px) {
    .form-container .form-buttons {
        flex-direction: initial;
        gap: 0;
    }
}
</style>
