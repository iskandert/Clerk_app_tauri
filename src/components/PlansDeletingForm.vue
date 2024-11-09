<template>
    <div class="form-container">
        <h5>Удалить планы</h5>
        <el-form
            :model="deletingPlan"
            :rules="planRules"
            label-position="top"
            ref="planForm"
        >
            <el-form-item
                label="Начальный месяц"
                prop="date"
            >
                <el-date-picker
                    v-model="deletingPlan.date"
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
                    v-model="deletingPlan.dateLast"
                    :disabled-date="time => !dayjs(time).isAfter(dayjs(deletingPlan.date), 'month')"
                    type="month"
                    placeholder="Выберите дату"
                    format="MMMM YYYY"
                />
            </el-form-item>
            <el-form-item
                label="Категории"
                prop="categories_ids"
            >
                <el-select
                    v-model="deletingPlan.categories_ids"
                    filterable
                    default-first-option
                    multiple
                    v-if="!isAllCategs"
                >
                    <template v-if="categories">
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
                <el-checkbox
                    v-model="isAllCategs"
                    label="Все категории"
                ></el-checkbox>
            </el-form-item>
        </el-form>
        <div class="form-buttons">
            <el-button
                @click="cancelProcessing"
                :icon="iconCancel"
                round
            >
                Отменить
            </el-button>
            <el-button
                @click="processPlan"
                type="danger"
                :icon="iconDelete"
                round
            >
                Удалить
            </el-button>
        </div>
    </div>
</template>
<script setup>
import { CirclePlusFilled, Select, Delete, CloseBold } from '@element-plus/icons-vue';
import { computed, onMounted, ref, shallowRef } from 'vue';
import { cloneByJSON, notifyWrap } from '../services/utils';
import { Plans } from '../services/changings';
import InfoBalloon from '../components/InfoBalloon.vue';
import dayjs from 'dayjs';
import dbController from '../services/db/controller';
import { categoryStatusEnum, categoryTypeEnum } from '../services/constants';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import { watch } from 'vue';
import formatHelper from '../services/helpers/formatHelper';

const clearPlan = {
    categories_ids: [],
    date: undefined,
    dateLast: undefined,
};

const emit = defineEmits(['call-to-end', 'update-plan']);

const iconDelete = shallowRef(Delete);
const iconCancel = shallowRef(CloseBold);
const planForm = ref(null);
const categories = ref(null);
const deletingPlan = ref(cloneByJSON(clearPlan));
const isAllCategs = ref(false);
const planRules = {
    categories_ids: [
        {
            required: true,
            message: 'Нужно выбрать хотя бы одну категорию',
            trigger: 'blur',
        },
    ],
    date: [{ required: true, message: 'Дата - обязательное поле', trigger: 'change' }],
};

const categoriesFlatten = computed(() =>
    Object.values(categories.value)
        .map(obj => Object.values(obj))
        .flat(2)
);

const processPlan = () => {
    planForm.value.validate(async valid => {
        if (!valid) {
            ElNotification({
                title: 'Проверьте поля формы',
                type: 'error',
            });
            return false;
        }
        try {
            await ElMessageBox.confirm('Восстановить планы будет нельзя', 'Удалить выбранные планы?', {
                confirmButtonText: 'Удалить',
                confirmButtonClass: 'el-button--danger',
            });

            await dbController.deletePlans(
                formatHelper.getISOYearMonthString(deletingPlan.value.date),
                deletingPlan.value.dateLast
                    ? formatHelper.getISOYearMonthString(deletingPlan.value.dateLast)
                    : undefined,
                deletingPlan.value.categories_ids
            );
            emit('update-plan');
            cancelProcessing();

            ElMessage({
                type: 'success',
                message: 'Сохранено',
            });
        } catch (err) {
            if (err === 'cancel') return;
            notifyWrap(err);
        }
    });
};
const cancelProcessing = () => {
    emit('call-to-end');
    deletingPlan.value = cloneByJSON(clearPlan);
};
const loadCategories = async () => {
    try {
        categories.value = await dbController.getCategoriesByGroups(true);
    } catch (error) {
        console.log(error);
    }
};
watch(
    () => deletingPlan.value.date,
    nv => {
        if (!deletingPlan.value.dateLast) return;
        if (!nv || !dayjs(nv).isBefore(dayjs(deletingPlan.value.dateLast), 'month')) {
            delete deletingPlan.value.dateLast;
        }
    }
);
watch(isAllCategs, nv => {
    if (nv) {
        deletingPlan.value.categories_ids = categoriesFlatten.value.map(({ _id }) => _id);
    } else {
        deletingPlan.value.categories_ids = [];
    }
});

onMounted(() => {
    loadCategories();
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
