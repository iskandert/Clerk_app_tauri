<template>
    <el-card :class="[$attrs.class, isEditMode ? 'isEditMode' : '']">
        <div class="form-container">
            <h5>
                {{
                    mode === 'mini' ? 'Быстрое добавление' : isEditMode ? 'Редактировать операцию' : 'Добавить операцию'
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
                            @keyup.enter="nextFocus('input_category', input_category)"
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
                            @keyup.enter="nextFocus('input_date', input_date)"
                        >
                            <template v-if="categories">
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
                                        v-for="{ name, _id } in categories[categoryStatusEnum.EXPENSE][
                                            categoryTypeEnum.DEFAULT
                                        ]"
                                        :key="_id"
                                        :value="_id"
                                        :label="name"
                                    ></el-option>
                                </el-option-group>
                                <el-option-group label="В накопления">
                                    <el-option
                                        v-for="{ name, _id } in categories[categoryStatusEnum.EXPENSE][
                                            categoryTypeEnum.SAVINGS
                                        ]"
                                        :key="_id"
                                        :value="_id"
                                        :label="name"
                                    ></el-option>
                                </el-option-group>
                                <el-option-group label="Доходы">
                                    <el-option
                                        v-for="{ name, _id } in categories[categoryStatusEnum.INCOME][
                                            categoryTypeEnum.DEFAULT
                                        ]"
                                        :key="_id"
                                        :value="_id"
                                        :label="name"
                                    ></el-option>
                                </el-option-group>
                                <el-option-group label="Из накоплений">
                                    <el-option
                                        v-for="{ name, _id } in categories[categoryStatusEnum.INCOME][
                                            categoryTypeEnum.SAVINGS
                                        ]"
                                        :key="_id"
                                        :value="_id"
                                        :label="name"
                                    ></el-option>
                                </el-option-group>
                            </template>
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
                                            ? nextFocus('sEditMode', sEditMode ? 'button_change' : 'button_add')
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
                                @keyup.enter="nextFocus('sEditMode', sEditMode ? 'button_change' : 'button_add')"
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
                    @keyup.enter="nextFocus('input_sum', input_sum)"
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
                    @keyup.enter="nextFocus('input_sum', input_sum)"
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
                @update-category="
                    () => {
                        emit('update-category');
                        loadCategories();
                    }
                "
            />
        </el-dialog>
    </el-card>
</template>
<script setup>
import { CirclePlusFilled, Select, Delete, CloseBold } from '@element-plus/icons-vue';
import { computed, ref, shallowRef, useAttrs } from 'vue';
import { cloneByJSON, filterObject, notifyWrap } from '../services/utils';
import { Actions } from '../services/changings';
import InfoBalloon from '../components/InfoBalloon.vue';
import CategoriesForm from './CategoriesForm.vue';
import { onMounted } from 'vue';
import { watch } from 'vue';
import router from '../router';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import store from '../store';
import dbController from '../services/db/controller';
import { categoryStatusEnum, categoryTypeEnum } from '../services/constants';
import formatHelper from '../services/helpers/formatHelper';

const clearAction = {
    _id: undefined,
    category_id: undefined,
    sum: undefined,
    date: undefined,
    comment: undefined,
};

const props = defineProps({
    mode: {
        type: String,
        default: 'mini', // mini | full
    },
});
const emit = defineEmits(['call-to-end', 'update-action', 'update-category']);
const attrs = useAttrs();

const iconPlus = shallowRef(CirclePlusFilled);
const iconCheck = shallowRef(Select);
const iconDelete = shallowRef(Delete);
const iconCancel = shallowRef(CloseBold);

const newAction = ref({});

const actionForm = ref(null);
const input_sum = ref(null);
const input_category = ref(null);
const input_date = ref(null);
const input_sumPart = ref(null);
const input_comment = ref(null);
const button_change = ref(null);
const button_add = ref(null);

const actionRules = {
    sum: [{ required: true, message: 'Сумма - обязательное поле', trigger: 'blur' }],
    category_id: [{ required: true, message: 'Категория - обязательное поле', trigger: 'blur' }],
    date: [{ required: true, message: 'Дата - обязательное поле', trigger: 'change' }],
};
const isEditMode = ref(false);
const multipleSum = ref([]);
const sumPart = ref('');
const sumPartsAll = ref([]);
const categoryDialog = ref(false);

const isLightTheme = computed(() => {
    return attrs.class?.includes('light');
});

const categories = ref(null);

const routeQuery = computed(() => {
    return router.currentRoute.value.query;
});

const jumpRoute = path => {
    router.push({ path });
};
const openFullForm = () => {
    router.push({ path: '/actions', query: newAction.value });
};
const processAction = mode => {
    const process = async () => {
        try {
            if (mode === 'delete') {
                await dbController.deleteAction(newAction.value._id);
            } else {
                const params = {};
                params.category_id = newAction.value.category_id;
                params.sum = +newAction.value.sum || 0;
                params.date = formatHelper.getISODateString(newAction.value.date);
                params.comment = newAction.value.comment || null;

                if (mode === 'change') {
                    await dbController.setAction(params, newAction.value._id);
                }
                if (mode === 'add') {
                    await dbController.setAction(params);
                }
            }

            emit('update-action');
            cancelAdding();

            ElMessage({
                type: 'success',
                message: 'Сохранено',
            });
        } catch (err) {
            notifyWrap(err);
        }
    };
    if (mode === 'delete')
        return ElMessageBox.confirm('Восстановить операцию будет нельзя', 'Удалить операцию?', {
            confirmButtonText: 'Удалить',
            confirmButtonClass: 'el-button--danger',
        })
            .then(process)
            .catch(err => err);

    actionForm.value.validate(async valid => {
        if (!valid) {
            ElNotification({
                title: 'Проверьте поля формы',
                type: 'error',
            });
            return false;
        }
        process();
    });
};
const cancelAdding = () => {
    const savedValues = filterObject(newAction.value, (k, v) => {
        return !isEditMode.value && ['date', 'category_id'].includes(k) && v;
    });
    isEditMode.value = false;
    emit('call-to-end');
    console.log(savedValues);
    newAction.value = cloneByJSON(clearAction);
    newAction.value.date = new Date();
    sumPart.value = '';
    sumPartsAll.value = [];
    newAction.value = {
        ...newAction.value,
        ...savedValues,
    };
};
const readFromRouteQuery = () => {
    if (!JSON.parse(router.currentRoute.value.query?.isEdit || 'false')) return;
    Object.keys(clearAction).forEach(field => {
        newAction.value[field] = router.currentRoute.value.query[field];
        newAction.value.sum = +router.currentRoute.value.query.sum;
    });
    if (JSON.parse(router.currentRoute.value.query?.isEdit || 'false')) isEditMode.value = true;
    else isEditMode.value = false;
    if (!newAction.value.date) newAction.value.date = new Date();
    console.log(newAction.value);
};
const addSumPart = () => {
    if (!/-?\d+\.?\d*/.test(sumPart.value)) return;
    sumPartsAll.value.push(sumPart.value);
    sumPart.value = '';
};
const deleteSumPart = index => {
    sumPartsAll.value.splice(index, 1);
};
const replaceSumPartValue = value => {
    let result = value.replace(/(?<=^(-\d*)|(\d+))-|(?<=\d+\.\d*)[-\.]|[^-\d\.]|^\./g, '');
    return result;
};
const handleCancelCategory = () => {
    categoryDialog.value = false;
};
const openCategoryDialog = () => {
    categoryDialog.value = true;
};
const nextFocus = (name, ref) => {
    console.log(ref);

    if (
        ['button_add', 'button_change'].includes(name) &&
        (!newAction.value.sum || !newAction.value.category_id || !newAction.value.date)
    ) {
        return;
    }
    ref.focus?.();
};

const loadCategories = async () => {
    try {
        categories.value = await dbController.getCategoriesByGroups();
    } catch (error) {
        console.log(error);
    }
};

watch(
    routeQuery,
    nv => {
        console.log(nv);
        readFromRouteQuery();
    },
    { deep: true }
);

watch(
    sumPartsAll,
    nv => {
        if (!nv.length) return;
        newAction.value.sum = nv.reduce((sum, curr) => {
            let part = Math.round(+curr * 100) / 100;
            return (sum += part);
        }, 0);
    },
    { deep: true }
);

onMounted(() => {
    readFromRouteQuery();
    loadCategories();
});
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
