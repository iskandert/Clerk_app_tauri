<template>
    <div class="form-container">
        <h5>Настройка статистики</h5>
        <el-form
            :model="model"
            :rules="rules"
            label-position="top"
            ref="formEl"
        >
            <!-- <el-form-item label="Начальный месяц" prop="date">
        <el-date-picker v-model="model.date" :disabled-date="(time) => $dayjs(time).isBefore($dayjs(), 'month')"
          type="month" placeholder="Выберите дату" format="MMMM YYYY" />
      </el-form-item>
      <el-form-item label="Конечный месяц" prop="dateLast">
        <el-date-picker v-model="model.dateLast"
          :disabled-date="(time) => !$dayjs(time).isAfter($dayjs(model.date), 'month')" type="month"
          placeholder="Выберите дату" format="MMMM YYYY" />
      </el-form-item> -->
            <el-form-item
                label="Даты"
                prop="dates"
            >
                <el-select
                    v-model="model.dates"
                    filterable
                    default-first-option
                    multiple
                    v-if="!isAllDates"
                >
                    <el-option
                        v-for="date in datesStored"
                        :key="date"
                        :value="date"
                        :label="date"
                    ></el-option>
                </el-select>
                <el-checkbox
                    v-model="isAllDates"
                    label="Все даты"
                ></el-checkbox>
            </el-form-item>
            <el-form-item
                label="Категории"
                prop="categories_ids"
            >
                <el-select
                    v-model="model.categories_ids"
                    filterable
                    default-first-option
                    multiple
                    v-if="!isAllCategs"
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
                <el-checkbox
                    v-model="isAllCategs"
                    label="Все категории"
                ></el-checkbox>
            </el-form-item>
            <el-form-item>
                <el-checkbox
                    v-model="isShowFilteredOnly"
                    label="Показывать только выбранные категории и даты"
                ></el-checkbox>
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
import { CirclePlusFilled, Select, Delete, CloseBold, DataAnalysis } from '@element-plus/icons-vue';
import { shallowRef } from 'vue';
import { cloneByJSON, notifyWrap } from '../services/utils';
import { Plans } from '../services/changings';
import InfoBalloon from '../components/InfoBalloon.vue';

const clearModel = {
    categories_ids: [],
    dates: [],
};

export default {
    components: {
        InfoBalloon,
    },
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
            isAllCategs: false,
            isAllDates: false,
            isShowFilteredOnly: true,
            rules: {
                categories_ids: [
                    {
                        validator: (rule, value) => {
                            if (value.length < 2) return false;
                            return true;
                        },
                        message: 'Нужно выбрать хотя бы две категории',
                        trigger: 'blur',
                    },
                ],
                dates: [
                    {
                        validator: (rule, value) => {
                            if (value.length < 2) return false;
                            return true;
                        },
                        message: 'Нужно выбрать хотя бы две даты',
                        trigger: 'blur',
                    },
                ],
            },
        };
    },
    computed: {
        categoriesStored() {
            const category_ids = new Set(
                (this.$store.getters.getData('plans') || []).map(({ category_id }) => category_id)
            );
            return this.$store.getters
                .getData('categories')
                .filter(({ _id }) => category_ids.has(_id))
                .sort((a, b) => a.name.localeCompare(b.name));
        },
        datesStored() {
            return Object.keys(this.$store.getters.getCalcs('plansIdsByDatesByCategoriesIds') || {})
                .sort()
                .reverse();
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
        process() {
            this.$refs.formEl.validate(async valid => {
                if (!valid) {
                    this.$notify({
                        title: 'Проверьте поля формы',
                        type: 'error',
                    });
                    return false;
                }
                try {
                    this.cancelProcessing({
                        ...this.model,
                        isShowFilteredOnly: this.isShowFilteredOnly,
                    });

                    this.$message({
                        type: 'success',
                        message: 'Сохранено',
                    });
                } catch (err) {
                    if (err === 'cancel') return;
                    notifyWrap(err);
                }
            });
        },
        cancelProcessing(result) {
            this.$emit('call-to-end', result);
            this.model = cloneByJSON(clearModel);
        },
        cancelSettings() {
            this.cancelProcessing({
                ...cloneByJSON(clearModel),
                isShowFilteredOnly: false,
            });
        },
    },
    watch: {
        isAllCategs(nv) {
            if (nv) this.model.categories_ids = this.categoriesStored.map(({ _id }) => _id);
            else this.model.categories_ids = [];
        },
        isAllDates(nv) {
            if (nv) this.model.dates = [...this.datesStored];
            else this.model.dates = [];
        },
    },
    mounted() {
        this.model.categories_ids = this.categories_ids;
        this.model.dates = this.dates;
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
