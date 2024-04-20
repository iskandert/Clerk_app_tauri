<template>
    <div class="form-container">
        <h5>Настройка корреляции</h5>
        <el-form
            :model="model"
            :rules="rules"
            label-position="top"
            ref="formEl"
        >
            <el-form-item
                label="Начальный месяц"
                prop="date"
            >
                <el-date-picker
                    v-model="model.date"
                    :disabled-date="
                        time =>
                            model.dateLast
                                ? !$dayjs(time).isBefore($dayjs(model.dateLast), 'month')
                                : false
                    "
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
                    v-model="model.dateLast"
                    :disabled-date="
                        time =>
                            model.date ? !$dayjs(time).isAfter($dayjs(model.date), 'month') : false
                    "
                    type="month"
                    placeholder="Выберите дату"
                    format="MMMM YYYY"
                />
            </el-form-item>
            <el-form-item
                label="Первая категория"
                prop="category_a"
            >
                <el-select
                    v-model="model.category_a"
                    filterable
                    default-first-option
                >
                    <el-option-group label="Расходы">
                        <el-option
                            v-for="({ name, _id }, index) in categories_a?.expense"
                            :key="index"
                            :value="_id"
                            :label="name"
                        ></el-option>
                    </el-option-group>
                    <el-option-group label="Доходы">
                        <el-option
                            v-for="({ name, _id }, index) in categories_a?.income"
                            :key="index"
                            :value="_id"
                            :label="name"
                        ></el-option>
                    </el-option-group>
                    <el-option-group label="Накопления">
                        <el-option
                            v-for="({ name, _id }, index) in categories_a?.savings"
                            :key="index"
                            :value="_id"
                            :label="name"
                        ></el-option>
                    </el-option-group>
                </el-select>
            </el-form-item>
            <el-form-item
                label="Вторая категория"
                prop="category_b"
            >
                <el-select
                    v-model="model.category_b"
                    filterable
                    default-first-option
                >
                    <el-option-group label="Расходы">
                        <el-option
                            v-for="({ name, _id }, index) in categories_b?.expense"
                            :key="index"
                            :value="_id"
                            :label="name"
                        ></el-option>
                    </el-option-group>
                    <el-option-group label="Доходы">
                        <el-option
                            v-for="({ name, _id }, index) in categories_b?.income"
                            :key="index"
                            :value="_id"
                            :label="name"
                        ></el-option>
                    </el-option-group>
                    <el-option-group label="Накопления">
                        <el-option
                            v-for="({ name, _id }, index) in categories_b?.savings"
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
                @click="cancelSettings"
                type="warning"
                :icon="iconDelete"
                round
            >
                Сбросить
            </el-button>
            <el-button
                @click="cancelProcessing(null)"
                :icon="iconCancel"
                round
            >
                Отменить
            </el-button>
            <el-button
                @click="process"
                type="success"
                :icon="iconDataAnalysis"
                round
            >
                Рассчитать
            </el-button>
        </div>
    </div>
</template>
<script>
import { CirclePlusFilled, DataAnalysis, Delete, CloseBold } from '@element-plus/icons-vue';
import { shallowRef } from 'vue';
import { cloneByJSON, notifyWrap } from '../services/utils';

const clearModel = {
    category_a: undefined,
    category_b: undefined,
    date: undefined,
    dateLast: undefined,
};

export default {
    props: {
        categories_ids: Array,
        dates: Array,
    },
    emits: ['call-to-end'],
    setup() {
        return {
            iconDelete: shallowRef(Delete),
            iconCancel: shallowRef(CloseBold),
            iconDataAnalysis: shallowRef(DataAnalysis),
        };
    },
    data() {
        return {
            model: cloneByJSON(clearModel),
            rules: {
                category_a: [
                    {
                        required: true,
                        message: 'Нужно выбрать первую категорию',
                        trigger: 'blur',
                    },
                ],
                category_b: [
                    {
                        required: true,
                        message: 'Нужно выбрать вторую категорию',
                        trigger: 'blur',
                    },
                ],
                date: [
                    {
                        required: true,
                        message: 'Дата начала - обязательное поле',
                        trigger: 'change',
                    },
                ],
                dateLast: [
                    {
                        required: true,
                        message: 'Дата конца - обязательное поле',
                        trigger: 'change',
                    },
                ],
            },
        };
    },
    computed: {
        categoriesStored() {
            return this.$store.getters.getData('categories');
        },
        categories_a() {
            const categories = {
                income: [],
                expense: [],
                savings: [],
            };
            this.categoriesStored?.forEach(category => {
                if (category._id === this.model.category_b) return;
                if (category.type === 'savings') return categories.savings.push(category);
                if (category.status === 'income') return categories.income.push(category);
                return categories.expense.push(category);
            });
            return categories;
        },
        categories_b() {
            const categories = {
                income: [],
                expense: [],
                savings: [],
            };
            this.categoriesStored?.forEach(category => {
                if (category._id === this.model.category_a) return;
                if (category.type === 'savings') return categories.savings.push(category);
                if (category.status === 'income') return categories.income.push(category);
                return categories.expense.push(category);
            });
            return categories;
        },
    },
    methods: {
        process() {
            this.$refs.formEl.validate(valid => {
                if (!valid) {
                    this.$notify({
                        title: 'Проверьте поля формы',
                        type: 'error',
                    });
                    return false;
                }

                const dates = [];
                for (
                    let month = this.$dayjs(this.model.date);
                    !month.isAfter(this.$dayjs(this.model.dateLast));
                    month = month.add(1, 'month')
                ) {
                    dates.push(month.format('YYYY-MM'));
                }
                console.log(dates);
                this.cancelProcessing({
                    categories_ids: [this.model.category_a, this.model.category_b],
                    dates,
                });

                this.$message({
                    type: 'success',
                    message: 'Сохранено',
                });
            });
        },
        cancelProcessing(result) {
            this.$emit('call-to-end', result);
            this.model = cloneByJSON(clearModel);
        },
        cancelSettings() {
            this.cancelProcessing({
                categories_ids: [],
                dates: [],
            });
        },
    },
    mounted() {
        this.model.category_a = this.categories_ids[0] || null;
        this.model.category_b = this.categories_ids[1] || null;
        this.model.date = this.dates[0] || null;
        this.model.dateLast = this.dates.slice(-1)[0] || null;
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
