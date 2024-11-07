<template>
    <div class="form-container">
        <p class="description">Укажите размеры активов и накоплений на конец дня выбранной даты</p>
        <el-form
            v-if="isDataReady"
            :model="newCheck"
            :rules="checkRules"
            label-position="top"
            ref="checkForm"
        >
            <el-form-item prop="checked_default">
                <template #label>
                    Размер активов
                    <InfoBalloon data="Баланс без учета накоплений" />
                </template>
                <el-input-number
                    v-model="newCheck.checked_default"
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
                v-if="!date"
                label="Дата сверки"
                prop="checking_date"
            >
                <template #label>
                    Дата сверки
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
                v-if="date"
                :icon="iconDelete"
                type="danger"
                round
                @click="deleteCheck"
            >
                Удалить
            </el-button>
            <el-button
                :icon="iconCheck"
                type="primary"
                round
                @click="setCheck"
            >
                Сохранить
            </el-button>
        </div>
    </div>
</template>
<script setup>
import { Delete, Select } from '@element-plus/icons-vue';
import { onMounted, ref, shallowRef } from 'vue';
import { cloneByJSON, notifyWrap } from '../services/utils';
import { Config } from '../services/changings';
import InfoBalloon from '../components/InfoBalloon.vue';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import dbController from '../services/db/controller';
import formatHelper from '../services/helpers/formatHelper';

const clearCheck = {
    checked_default: undefined,
    checked_savings: undefined,
    checking_date: undefined,
};
const props = defineProps({
    mode: {
        type: String,
        default: 'mini', // mini | full
    },
    date: String,
});

const emit = defineEmits(['call-to-end', 'update-check']);

const iconCheck = shallowRef(Select);
const iconDelete = shallowRef(Delete);
const isDataReady = ref(false);
const checkForm = ref(null);
const newCheck = ref({});
const checkRules = {
    checked_default: [{ required: true, message: 'Баланс - обязательное поле', trigger: 'blur' }],
    checked_savings: [{ required: true, message: 'Накопления - обязательное поле', trigger: 'blur' }],
    checking_date: [{ required: true, message: 'Дата - обязательное поле', trigger: 'change' }],
};

const setCheck = () => {
    checkForm.value.validate(async valid => {
        if (!valid) {
            ElNotification({
                title: 'Проверьте поля формы',
                type: 'error',
            });
            return false;
        }
        try {
            const params = {
                date: formatHelper.getISODateString(newCheck.value.checking_date),
                default_sum: newCheck.value.checked_default,
                savings_sum: newCheck.value.checked_savings,
            };
            await dbController.setCheck(params);
            emit('update-check');
            cancelChecking();
            ElMessage({
                type: 'success',
                message: 'Сохранено',
            });
        } catch (err) {
            notifyWrap(err);
        }
    });
};

const deleteCheck = async () => {
    ElMessageBox.confirm('Восстановить сверку будет нельзя', 'Удалить сверку?', {
        confirmButtonText: 'Удалить',
        confirmButtonClass: 'el-button--danger',
    })
        .then(async () => {
            try {
                await dbController.deleteCheck(props.date);
                emit('update-check');
                cancelChecking();
                ElMessage({
                    type: 'success',
                    message: 'Удалено',
                });
            } catch (err) {
                notifyWrap(err);
            }
        })
        .catch(err => err);
};

const cancelChecking = () => {
    emit('call-to-end');
    newCheck.value = cloneByJSON(clearCheck);
    newCheck.value.checking_date = new Date();
};

const load = async () => {
    try {
        if (props.date) {
            const check = await dbController.getCheck(props.date);

            newCheck.value.checking_date = new Date(check.date);
            newCheck.value.checked_default = check.default_sum;
            newCheck.value.checked_savings = check.savings_sum;
        } else {
            const balance = await dbController.getCurrentBalance();

            newCheck.value.checking_date = new Date();
            newCheck.value.checked_default = balance.default;
            newCheck.value.checked_savings = balance.savings;
        }

        isDataReady.value = true;
    } catch (error) {
        console.log(error);
    }
};

onMounted(() => {
    load();
});
</script>
<style scoped>
.form-container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
}
.form-container > .description {
    margin-bottom: 8px;
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

@media (min-width: 768px) {
    .form-container .form-buttons {
        flex-direction: initial;
        gap: 0;
    }
}
</style>
