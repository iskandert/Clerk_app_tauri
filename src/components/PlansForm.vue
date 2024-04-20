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
                    @change="sumPartsAll = []"
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
            <el-form-item
                label="Начальный месяц"
                prop="date"
            >
                <el-date-picker
                    v-model="newPlan.date"
                    :disabled-date="time => $dayjs(time).isBefore($dayjs(), 'month')"
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
                    :disabled-date="time => !$dayjs(time).isAfter($dayjs(newPlan.date), 'month')"
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
                class="dialog"
            />
        </el-dialog>
    </div>
</template>
<script>
import { CirclePlusFilled, Select, Delete, CloseBold } from '@element-plus/icons-vue';
import { shallowRef } from 'vue';
import { cloneByJSON, notifyWrap } from '../services/utils';
import { Plans } from '../services/changings';
import InfoBalloon from '../components/InfoBalloon.vue';
import CategoriesForm from './CategoriesForm.vue';

const clearPlan = {
    _id: undefined,
    category_id: undefined,
    sum: undefined,
    date: undefined,
    dateLast: undefined,
    comment: undefined,
};

export default {
    components: {
        InfoBalloon,
        CategoriesForm,
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
            newPlan: {},
            planRules: {
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
        processPlan(mode) {
            const process = async () => {
                try {
                    const plans = new Plans();
                    let changes;
                    if (mode === 'delete') changes = plans.delete(this.newPlan._id);
                    if (mode === 'change') changes = plans.change(this.newPlan);
                    if (mode === 'add') changes = plans.add(this.newPlan);
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
            if (mode === 'delete')
                return this.$confirm('Восстановить план будет нельзя', 'Удалить план?', {
                    confirmButtonText: 'Удалить',
                    confirmButtonClass: 'el-button--danger',
                })
                    .then(process)
                    .catch(err => err);

            this.$refs.planForm.validate(async valid => {
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
        readFromRouteQuery() {
            Object.keys(clearPlan).forEach(field => {
                this.newPlan[field] = this.$route.query[field];
            });
            if (JSON.parse(this.$route.query?.isEdit || 'false')) this.isEditMode = true;
            else this.isEditMode = false;
            if (!this.newPlan.date) this.newPlan.date = new Date();
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
                this.newPlan.sum = nv.reduce((sum, curr) => {
                    let part = Math.round(+curr * 100) / 100;
                    return (sum += part);
                }, 0);
            },
            deep: true,
        },
        'newPlan.date': {
            handler(nv) {
                if (!this.newPlan.dateLast) return;
                if (!nv || !this.$dayjs(nv).isBefore(this.$dayjs(this.newPlan.dateLast), 'month')) {
                    delete this.newPlan.dateLast;
                }
            },
            deep: true,
        },
        'newPlan.dateLast': {
            handler(nv) {
                console.log(nv);
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
