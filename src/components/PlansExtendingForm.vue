<template>
    <div class="form-container">
        <h5>Продлить планы</h5>
        <el-form
            :model="extendingSettings"
            :rules="extendingRules"
            label-position="top"
            ref="extendingForm"
        >
            <el-form-item
                label="Продляемый месяц"
                prop="date"
            >
                <el-date-picker
                    v-model="extendingSettings.date"
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
                    v-model="extendingSettings.dateLast"
                    :disabled-date="
                        time => !$dayjs(time).isAfter($dayjs(extendingSettings.date), 'month')
                    "
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
                    v-model="extendingSettings.categories_ids"
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
                type="primary"
                :icon="iconCheck"
                round
            >
                Продлить
            </el-button>
        </div>
    </div>
</template>
<script>
import { CirclePlusFilled, Select, Delete, CloseBold } from '@element-plus/icons-vue';
import { shallowRef } from 'vue';
import { cloneByJSON, notifyWrap } from '../services/utils';
import { Plans } from '../services/changings';
import InfoBalloon from '../components/InfoBalloon.vue';

const clearSettings = {
    categories_ids: [],
    date: undefined,
    dateLast: undefined,
};

export default {
    components: {
        InfoBalloon,
    },
    props: {},
    emits: ['call-to-end'],
    setup() {
        return {
            iconCheck: shallowRef(Select),
            iconCancel: shallowRef(CloseBold),
        };
    },
    data() {
        return {
            extendingSettings: cloneByJSON(clearSettings),
            isAllCategs: false,
            extendingRules: {
                categories_ids: [
                    {
                        required: true,
                        message: 'Нужно выбрать хотя бы одну категорию',
                        trigger: 'blur',
                    },
                ],
                date: [
                    {
                        required: true,
                        message: 'Нужно выбрать продляемый месяц',
                        trigger: 'change',
                    },
                ],
                dateLast: [
                    { required: true, message: 'Нужно выбрать конечный месяц', trigger: 'change' },
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
        processPlan() {
            this.$refs.extendingForm.validate(async valid => {
                if (!valid) {
                    this.$notify({
                        title: 'Проверьте поля формы',
                        type: 'error',
                    });
                    return false;
                }
                try {
                    const plans = new Plans();
                    let changes = plans.extendMany(this.extendingSettings);
                    this.cancelProcessing();

                    await this.$store.dispatch('saveDataChanges', changes);
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
        cancelProcessing() {
            this.$emit('call-to-end');
            this.extendingSettings = cloneByJSON(clearSettings);
        },
    },
    watch: {
        'extendingSettings.date': {
            handler(nv) {
                if (!this.extendingSettings.dateLast) return;
                if (
                    !nv ||
                    !this.$dayjs(nv).isBefore(this.$dayjs(this.extendingSettings.dateLast), 'month')
                ) {
                    this.extendingSettings.dateLast = undefined;
                }
            },
            deep: true,
        },
        'extendingSettings.dateLast': {
            handler(nv) {
                console.log(nv);
            },
            deep: true,
        },
        isAllCategs(nv) {
            if (nv)
                this.extendingSettings.categories_ids = this.categoriesStored.map(({ _id }) => _id);
            else this.extendingSettings.categories_ids = [];
        },
    },
    mounted() {},
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
