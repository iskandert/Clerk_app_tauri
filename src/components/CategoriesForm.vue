<template>
    <div class="form-container">
        <h5>{{ isEditMode ? 'Редактировать категорию' : 'Добавить категорию' }}</h5>
        <el-form
            :model="newCategory"
            :rules="categoryRules"
            label-position="top"
            ref="categoryForm"
        >
            <el-form-item
                label="Название"
                prop="name"
            >
                <el-input v-model="newCategory.name"></el-input>
            </el-form-item>
            <div>
                <el-form-item
                    label="Направление финансов"
                    prop="status"
                >
                    <el-radio-group v-model="newCategory.status">
                        <el-radio :value="categoryStatusEnum.INCOME">Доходы</el-radio>
                        <el-radio :value="categoryStatusEnum.EXPENSE">Расходы</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item
                    label="Тип категории"
                    prop="type"
                >
                    <template #label>
                        Тип категории
                        <InfoBalloon
                            :data="[
                                'Доходы с типом `накопления` будут одновременно увеличивать баланс и уменьшать размер накоплений,',
                                'а расходы с типом `накопления` наоборот, уменьшать баланс и увеличивать размер накоплений.',
                            ]"
                        />
                    </template>
                    <el-radio-group v-model="newCategory.type">
                        <el-radio :value="categoryTypeEnum.DEFAULT">Обычная</el-radio>
                        <el-radio :value="categoryTypeEnum.SAVINGS">Накопления</el-radio>
                    </el-radio-group>
                </el-form-item>
            </div>
        </el-form>
        <div class="form-buttons">
            <!-- TODO не работает -->
            <!-- <el-button
                v-if="isEditMode"
                @click="processCategory('delete')"
                type="danger"
                :icon="iconDelete"
                round
            >
                Удалить
            </el-button> -->
            <el-button
                @click="cancelProcessing"
                :icon="iconCancel"
                round
            >
                Отменить
            </el-button>
            <el-button
                v-if="isEditMode"
                type="success"
                @click="processCategory('change')"
                :icon="iconCheck"
                round
            >
                Сохранить
            </el-button>
            <el-button
                v-else
                type="primary"
                @click="processCategory('add')"
                :icon="iconCheck"
                round
            >
                Сохранить
            </el-button>
        </div>

        <el-dialog
            v-model="redefiningDialog"
            width="500px"
            :append-to-body="true"
            :before-close="handleCancelRedefining"
        >
            <template #header>
                <h4>Переназначить категорию "{{ newCategory.name }}"</h4>
            </template>
            <div class="redefining-container">
                <el-form
                    :model="newCategory"
                    :rules="redefiningRules"
                    label-position="top"
                    ref="redefiningForm"
                >
                    <el-form-item label="Категория для переназначения">
                        <el-select
                            v-model="newCategory.redefined_category_id"
                            filterable
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
                </el-form>
                <div class="form-buttons">
                    <el-button
                        @click="handleCancelRedefining"
                        :icon="iconCancel"
                        round
                    >
                        Отменить
                    </el-button>
                    <el-button
                        type="primary"
                        @click="redefineAndDelete"
                        :icon="iconCheck"
                        round
                    >
                        Сохранить
                    </el-button>
                </div>
            </div>
        </el-dialog>
    </div>
</template>
<script setup>
import { CirclePlusFilled, Select, Delete, CloseBold } from '@element-plus/icons-vue';
import { computed, onMounted, ref, shallowRef } from 'vue';
import { cloneByJSON, notifyWrap } from '../services/utils';
import { Categories } from '../services/changings';
import InfoBalloon from '../components/InfoBalloon.vue';
import { categoryStatusEnum, categoryTypeEnum } from '../services/constants';
import router from '../router';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import store from '../store';
import dbController from '../services/db/controller';

const clearCategory = {
    _id: undefined,
    name: undefined,
    status: undefined,
    type: undefined,
};

const emit = defineEmits(['call-to-end', 'update-category']);
const iconPlus = shallowRef(CirclePlusFilled);
const iconCheck = shallowRef(Select);
const iconDelete = shallowRef(Delete);
const iconCancel = shallowRef(CloseBold);

const categoryForm = ref(null);
const redefiningForm = ref(null);

const newCategory = ref({});
const categoryRules = {
    name: [{ required: true, message: 'Название - обязательное поле', trigger: 'blur' }],
    status: [
        {
            required: true,
            message: 'Направление финансов - обязательное поле',
            trigger: 'blur',
        },
    ],
    type: [
        {
            required: true,
            message: 'Тип категории - обязательное поле',
            trigger: 'blur',
        },
    ],
};
const isEditMode = ref(false);
const redefiningDialog = ref(false);
const redefiningRules = {
    redefined_category_id: [
        {
            required: true,
            message: 'Нужно выбрать категорию для переназначения',
            trigger: 'blur',
        },
    ],
};

const categories = ref(null);

const jumpRoute = path => {
    router.push({ path });
};
const readFromRouteQuery = () => {
    Object.keys(clearCategory).forEach(field => {
        newCategory.value[field] = router.currentRoute.value.query[field];
    });
    if (JSON.parse(router.currentRoute.value.query?.isEdit || 'false')) isEditMode.value = true;
    else isEditMode.value = false;
};
// category editing
const processCategory = async mode => {
    const process = async () => {
        try {
            const categories = new Categories();
            let changes;
            if (mode === 'delete') {
                return;
                // TODO не работает
                // changes = categories.delete(newCategory.value._id, newCategory.value);
            }
            if (mode === 'change') {
                await dbController.setCategory(newCategory.value, newCategory.value._id);
            }
            if (mode === 'add') {
                await dbController.setCategory(newCategory.value);
            }
            emit('update-category');
            cancelProcessing();

            loadCategories();
            ElMessage({
                type: 'success',
                message: 'Сохранено',
            });
        } catch (err) {
            notifyWrap(err);
        }
    };
    if (mode === 'delete') {
        const showDeletingConfirm = () =>
            ElMessageBox.confirm('Восстановить категорию будет нельзя', 'Удалить категорию?', {
                confirmButtonText: 'Удалить',
                confirmButtonClass: 'el-button--danger',
            })
                .then(process)
                .catch(err => err);

        if (newCategory.value.redefined_category_id) return showDeletingConfirm();

        const isEmptyCategory = await dbController.getIsEmptyCategory(newCategory.value._id);

        if (!isEmptyCategory)
            return ElMessageBox.confirm(
                `Переназначить категорию для планов и операций удаляемой категории?`,
                `Категория "${newCategory.value.name}" не пустая`,
                {
                    distinguishCancelAndClose: true,
                    confirmButtonText: 'Выбрать категорию',
                    cancelButtonText: 'Удалить с содержимым',
                    cancelButtonClass: 'el-button--danger',
                }
            )
                .then(() => {
                    openRedefiningDialog();
                })
                .catch(action => {
                    if (action !== 'cancel') return;
                    showDeletingConfirm();
                });

        return showDeletingConfirm();
    }

    categoryForm.value.validate(async valid => {
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
// category redefining
const openRedefiningDialog = () => {
    redefiningDialog.value = true;
};
const handleCancelRedefining = () => {
    redefiningDialog.value = false;
};
const callRedefining = () => {
    openRedefiningDialog();
};
const redefineAndDelete = () => {
    redefiningForm.value.validate(async valid => {
        if (!valid) {
            ElNotification({
                title: 'Проверьте поля формы',
                type: 'error',
            });
            return false;
        }
        processCategory('delete');
    });
};

const loadCategories = async () => {
    try {
        categories.value = await dbController.getCategoriesByGroups();
    } catch (error) {
        console.log(error);
    }
};

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

.el-form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    column-gap: 12px;
    margin-top: 4px;
}

.form-container.dialog h5:first-of-type {
    display: none;
}

.el-radio-group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.form-container .form-buttons,
.redefining-container .form-buttons {
    align-self: flex-end;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-end;
    margin-top: 12px;
    gap: 8px;
}

@media (min-width: 768px) {
    .form-container .form-buttons,
    .redefining-container .form-buttons {
        flex-direction: initial;
        gap: 0;
    }
}
</style>
