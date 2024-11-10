<template>
    <div class="form-container">
        <h5>{{ isEditMode ? 'Редактировать план' : 'Добавить план' }}</h5>
        <el-form
            :model="newPlan"
            :rules="planRules"
            label-position="top"
            ref="planForm"
        >
            <el-form-item
                label="Планируемая сумма"
                prop="sum"
            >
                <el-input-number
                    v-model="newPlan.sum"
                    :min="1"
                    :step="1000"
                />
            </el-form-item>
            <el-form-item
                label="Категория"
                prop="category_id"
            >
                <el-select
                    v-model="newPlan.category_id"
                    filterable
                    default-first-option
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
                                v-for="{ name, _id } in categories[categoryStatusEnum.INCOME][categoryTypeEnum.DEFAULT]"
                                :key="_id"
                                :value="_id"
                                :label="name"
                            ></el-option>
                        </el-option-group>
                        <el-option-group label="Из накоплений">
                            <el-option
                                v-for="{ name, _id } in categories[categoryStatusEnum.INCOME][categoryTypeEnum.SAVINGS]"
                                :key="_id"
                                :value="_id"
                                :label="name"
                            ></el-option>
                        </el-option-group>
                    </template>
                </el-select>
            </el-form-item>
            <el-form-item
                label="Начальный месяц"
                prop="date"
            >
                <el-date-picker
                    v-model="newPlan.date"
                    :disabled-date="time => dayjs(time).isBefore(dayjs(), 'month')"
                    type="month"
                    placeholder="Выберите дату"
                    format="MMMM YYYY"
                />
            </el-form-item>
            <el-form-item
                label="Конечный месяц"
                prop="dateLast"
            >
                <el-date-picker
                    v-model="newPlan.dateLast"
                    :disabled-date="time => !dayjs(time).isAfter(dayjs(newPlan.date), 'month')"
                    type="month"
                    placeholder="Выберите дату"
                    format="MMMM YYYY"
                />
            </el-form-item>
            <el-form-item
                class="comment"
                label="Комментарий"
            >
                <el-input
                    v-model="newPlan.comment"
                    :rows="2"
                    type="textarea"
                    placeholder="Подробности операции"
                ></el-input>
            </el-form-item>
        </el-form>
        <div class="form-buttons">
            <el-button
                v-if="isEditMode"
                @click="processPlan('delete')"
                type="danger"
                :icon="iconDelete"
                round
            >
                Удалить
            </el-button>
            <el-button
                v-if="isEditMode"
                @click="cancelProcessing"
                :icon="iconCancel"
                round
            >
                Отменить
            </el-button>
            <el-button
                v-if="isEditMode"
                type="success"
                @click="processPlan('change')"
                :icon="iconCheck"
                round
            >
                Сохранить
            </el-button>
            <el-button
                v-else
                type="primary"
                @click="processPlan('add')"
                :icon="iconCheck"
                round
            >
                Сохранить
            </el-button>
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
                @update-category="
                    () => {
                        emit('update-category');
                        loadCategories();
                    }
                "
                class="dialog"
            />
        </el-dialog>
    </div>
</template>
<script setup>
import { CirclePlusFilled, Select, Delete, CloseBold } from '@element-plus/icons-vue';
import { computed, onMounted, shallowRef, watch } from 'vue';
import { cloneByJSON, notifyWrap } from '../services/utils';
import { Plans } from '../services/changings';
import InfoBalloon from '../components/InfoBalloon.vue';
import CategoriesForm from './CategoriesForm.vue';
import { ref } from 'vue';
import dbController from '../services/db/controller';
import router from '../router';
import dayjs from 'dayjs';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import { categoryStatusEnum, categoryTypeEnum } from '../services/constants';
import formatHelper from '../services/helpers/formatHelper';

const clearPlan = {
    _id: undefined,
    category_id: undefined,
    sum: undefined,
    date: undefined,
    dateLast: undefined,
    comment: undefined,
};

const emit = defineEmits(['call-to-end', 'update-plan', 'update-category']);
const iconPlus = shallowRef(CirclePlusFilled);
const iconCheck = shallowRef(Select);
const iconDelete = shallowRef(Delete);
const iconCancel = shallowRef(CloseBold);
const newPlan = ref({});
const planRules = {
    sum: [{ required: true, message: 'Сумма - обязательное поле', trigger: 'blur' }],
    category_id: [{ required: true, message: 'Категория - обязательное поле', trigger: 'blur' }],
    date: [{ required: true, message: 'Дата - обязательное поле', trigger: 'change' }],
};
const isEditMode = ref(false);
const categoryDialog = ref(false);

const planForm = ref(null);
const categories = ref(null);

const routeQuery = computed(() => {
    return router.currentRoute.value.query;
});

const processPlan = mode => {
    const process = async () => {
        try {
            if (mode === 'delete') {
                await dbController.deletePlan(newPlan.value._id);
            } else {
                const params = {};
                params.category_id = newPlan.value.category_id;
                params.sum = +newPlan.value.sum || 0;
                params.date = formatHelper.getISOYearMonthString(newPlan.value.date);
                params.comment = newPlan.value.comment || null;
                const dateLast = newPlan.value.dateLast
                    ? formatHelper.getISOYearMonthString(newPlan.value.dateLast)
                    : null;

                const isMultiPlans = !!dateLast;
                if (mode === 'change') {
                    if (isMultiPlans) {
                        await dbController.setSamePlans(params, newPlan.value._id, dateLast);
                    } else {
                        await dbController.setPlan(params, newPlan.value._id);
                    }
                }
                if (mode === 'add') {
                    if (isMultiPlans) {
                        await dbController.setSamePlans(params, null, dateLast);
                    } else {
                        await dbController.setPlan(params);
                    }
                }
            }

            emit('update-plan');
            cancelProcessing();

            ElMessage({
                type: 'success',
                message: 'Сохранено',
            });
        } catch (err) {
            notifyWrap(err);
        }
    };
    if (mode === 'delete') {
        return ElMessageBox.confirm('Восстановить план будет нельзя', 'Удалить план?', {
            confirmButtonText: 'Удалить',
            confirmButtonClass: 'el-button--danger',
        })
            .then(process)
            .catch(err => err);
    }

    planForm.value.validate(async valid => {
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
const cancelProcessing = () => {
    emit('call-to-end');
};
const readFromRouteQuery = () => {
    Object.keys(clearPlan).forEach(field => {
        newPlan.value[field] = routeQuery.value[field];
    });
    if (JSON.parse(routeQuery.value?.isEdit || 'false')) isEditMode.value = true;
    else isEditMode.value = false;
    if (!newPlan.value.date) newPlan.value.date = new Date();
};
const handleCancelCategory = () => {
    categoryDialog.value = false;
};
const openCategoryDialog = () => {
    categoryDialog.value = true;
};

const loadCategories = async () => {
    try {
        categories.value = await dbController.getCategoriesByGroups();
    } catch (error) {
        console.log(error);
    }
};
watch(routeQuery, () => {
    readFromRouteQuery();
});
watch(
    () => newPlan.date,
    nv => {
        if (!newPlan.value.dateLast) return;
        if (!nv || !dayjs(nv).isBefore(dayjs(newPlan.value.dateLast), 'month')) {
            delete newPlan.value.dateLast;
        }
    }
);

onMounted(() => {
    loadCategories();
    readFromRouteQuery();
});
</script>
<style scoped>
.form-container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
}

.el-form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    column-gap: 12px;
    margin-top: 4px;
}

.form-container.dialog h5:first-of-type {
    display: none;
}

.button_add-category {
    display: flex;
    justify-content: center;
    margin-top: 8px;
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
