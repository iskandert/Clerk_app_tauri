<template>
    <div class="form-container">
        <el-form
            :model="newCheck"
            :rules="checkRules"
            label-position="top"
            ref="checkForm"
        >
            <el-form-item
                label="Основной баланс"
                prop="checked_balance"
            >
                <template #label
                    >Общий баланс
                    <InfoBalloon data="Без накоплений" />
                </template>
                <el-input-number
                    v-model="newCheck.checked_balance"
                    :min="0"
                    :step="100"
                />
            </el-form-item>
            <el-form-item
                label="Размер накоплений"
                prop="checked_savings"
            >
                <el-input-number
                    v-model="newCheck.checked_savings"
                    :min="0"
                    :step="100"
                />
            </el-form-item>
            <el-form-item
                label="Дата сверки"
                prop="checking_date"
            >
                <template #label
                    >Дата сверки
                    <InfoBalloon data="Поменяйте, если указываете баланс не на текущий момент." />
                </template>
                <el-date-picker
                    v-model="newCheck.checking_date"
                    :disabled-date="time => time.getTime() > Date.now()"
                    type="date"
                    placeholder="Выберите дату"
                    format="DD.MM.YYYY"
                />
            </el-form-item>
        </el-form>
        <div class="form-buttons">
            <el-button
                type="primary"
                @click="checkConfig"
                :icon="iconCheck"
                round
            >
                Сохранить
            </el-button>
        </div>
    </div>
</template>
<script>
import { Select } from '@element-plus/icons-vue';
import { shallowRef } from 'vue';
import { cloneByJSON, notifyWrap } from '../services/utils';
import { Config } from '../services/changings';
import InfoBalloon from '../components/InfoBalloon.vue';

const clearCheck = {
    checked_balance: undefined,
    checked_savings: undefined,
    checking_date: undefined,
};

export default {
    components: {
        InfoBalloon,
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
            iconCheck: shallowRef(Select),
        };
    },
    data() {
        return {
            newCheck: {},
            checkRules: {
                checked_balance: [
                    { required: true, message: 'Баланс - обязательное поле', trigger: 'blur' },
                ],
                checked_savings: [
                    { required: true, message: 'Накопления - обязательное поле', trigger: 'blur' },
                ],
                checking_date: [
                    { required: true, message: 'Дата - обязательное поле', trigger: 'change' },
                ],
            },
        };
    },
    computed: {},
    methods: {
        jumpRoute(path) {
            this.$router.push({ path });
        },
        checkConfig() {
            this.$refs.checkForm.validate(async valid => {
                if (!valid) {
                    this.$notify({
                        title: 'Проверьте поля формы',
                        type: 'error',
                    });
                    return false;
                }
                try {
                    const config = new Config();
                    let changes = config.setStart(this.newCheck);
                    this.cancelChecking();
                    await this.$store.dispatch('saveDataChanges', changes);
                    this.$message({
                        type: 'success',
                        message: 'Сохранено',
                    });
                } catch (err) {
                    notifyWrap(err);
                }
            });
        },
        cancelChecking() {
            this.$emit('call-to-end');
            this.newCheck = cloneByJSON(clearCheck);
            this.newCheck.checking_date = new Date();
        },
    },
    watch: {},
    mounted() {
        const configData = this.$store.getters.getData('config') || {};
        this.newCheck.checking_date = new Date();
        this.newCheck.checked_balance = configData.checked_balance || 0;
        this.newCheck.checked_savings = configData.checked_savings || 0;
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

.el-form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    column-gap: 20px;
    margin-top: 4px;
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
</style>
