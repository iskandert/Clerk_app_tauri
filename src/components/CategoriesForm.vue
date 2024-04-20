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
                        <el-radio label="income">Доходы</el-radio>
                        <el-radio label="expense">Расходы</el-radio>
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
                        <el-radio label="default">Обычная</el-radio>
                        <el-radio label="savings">Накопления</el-radio>
                    </el-radio-group>
                </el-form-item>
            </div>
        </el-form>
        <div class="form-buttons">
            <el-button
                v-if="isEditMode"
                @click="processCategory('delete')"
                type="danger"
                :icon="iconDelete"
                round
            >
                Удалить
            </el-button>
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
<script>
import { CirclePlusFilled, Select, Delete, CloseBold } from '@element-plus/icons-vue';
import { shallowRef } from 'vue';
import { cloneByJSON, notifyWrap } from '../services/utils';
import { Categories } from '../services/changings';
import InfoBalloon from '../components/InfoBalloon.vue';

const clearCategory = {
    _id: undefined,
    name: undefined,
    status: undefined,
    type: undefined,
};

export default {
    components: {
        InfoBalloon,
    },
    props: {},
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
            newCategory: {},
            categoryRules: {
                name: [
                    { required: true, message: 'Название - обязательное поле', trigger: 'blur' },
                ],
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
            },
            isEditMode: false,
            redefiningDialog: false,
            redefiningRules: {
                redefined_category_id: [
                    {
                        required: true,
                        message: 'Нужно выбрать категорию для переназначения',
                        trigger: 'blur',
                    },
                ],
            },
        };
    },
    computed: {
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
    },
    methods: {
        jumpRoute(path) {
            this.$router.push({ path });
        },
        readFromRouteQuery() {
            Object.keys(clearCategory).forEach(field => {
                this.newCategory[field] = this.$route.query[field];
            });
            if (JSON.parse(this.$route.query?.isEdit || 'false')) this.isEditMode = true;
            else this.isEditMode = false;
        },
        // category editing
        async processCategory(mode) {
            const process = async () => {
                try {
                    const categories = new Categories();
                    let changes;
                    if (mode === 'delete')
                        changes = categories.delete(this.newCategory._id, this.newCategory);
                    if (mode === 'change') changes = categories.change(this.newCategory);
                    if (mode === 'add') changes = categories.add(this.newCategory);
                    this.cancelProcessing();
                    await this.$store.dispatch('saveDataChanges', changes);
                    this.$message({
                        type: 'success',
                        message: 'Сохранено',
                    });
                } catch (err) {
                    notifyWrap(err);
                }
            };
            if (mode === 'delete') {
                const showDeletingConfirm = () =>
                    this.$confirm('Восстановить категорию будет нельзя', 'Удалить категорию?', {
                        confirmButtonText: 'Удалить',
                        confirmButtonClass: 'el-button--danger',
                    })
                        .then(process)
                        .catch(err => err);

                if (this.newCategory.redefined_category_id) return showDeletingConfirm();

                const isNotEmptyCategory = !![
                    ...this.$store.getters.getData('plans'),
                    ...this.$store.getters.getData('actions'),
                ].find(({ category_id }) => category_id === this.newCategory._id);

                if (isNotEmptyCategory)
                    return this.$confirm(
                        `Переназначить категорию для планов и операций удаляемой категории?`,
                        `Категория "${this.newCategory.name}" не пустая`,
                        {
                            distinguishCancelAndClose: true,
                            confirmButtonText: 'Выбрать категорию',
                            cancelButtonText: 'Удалить с содержимым',
                            cancelButtonClass: 'el-button--danger',
                        }
                    )
                        .then(() => {
                            this.openRedefiningDialog();
                        })
                        .catch(action => {
                            if (action !== 'cancel') return;
                            showDeletingConfirm();
                        });

                return showDeletingConfirm();
            }

            this.$refs.categoryForm.validate(async valid => {
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
        cancelProcessing() {
            this.$emit('call-to-end');
        },
        // category redefining
        openRedefiningDialog() {
            this.redefiningDialog = true;
        },
        handleCancelRedefining() {
            this.redefiningDialog = false;
        },
        callRedefining() {
            this.openRedefiningDialog();
        },
        redefineAndDelete() {
            this.$refs.redefiningForm.validate(async valid => {
                if (!valid) {
                    this.$notify({
                        title: 'Проверьте поля формы',
                        type: 'error',
                    });
                    return false;
                }
                this.processCategory('delete');
            });
        },
    },
    watch: {},
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
