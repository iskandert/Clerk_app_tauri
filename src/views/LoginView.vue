<template>
    <div class="container">
        <el-card>
            <div class="content">
                <div class="logo">
                    <el-icon
                        :size="36"
                        color="var(--el-color-primary-dark-2)"
                    >
                        <LogoIcon />
                    </el-icon>
                    <el-icon
                        class="logo_text"
                        :size="128"
                        color="var(--el-color-primary-dark-2)"
                    >
                        <LogoText />
                    </el-icon>
                </div>
                <p>Сервис для&nbsp;анализа и&nbsp;планирования бюджета</p>
                <div class="btn-container">
                    <el-button
                        size="large"
                        type="primary"
                        @click="createEmpty"
                    >
                        Создать новый бюджет
                    </el-button>

                    <el-button
                        size="large"
                        type="primary"
                        plain
                        @click="uploadFile"
                    >
                        Загрузить файл бюджета
                    </el-button>
                </div>
            </div>
        </el-card>
    </div>

    <input
        type="file"
        ref="fileInputEl"
        style="display: none"
        accept=".txt"
        @change="processFile"
    />
</template>

<script setup>
import LogoIcon from '../components/icons/LogoIcon.vue';
import LogoText from '../components/icons/LogoText.vue';
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { notifyWrap } from '../services/utils';
import dbController from '../services/db/controller';
import router from '../router';

const fileInputEl = ref(null);
const uploadFile = () => {
    fileInputEl.value.click();
};

const processFile = event => {
    const file = event.target.files[0];
    const reader = new FileReader();

    try {
        reader.onload = async () => {
            const fileContent = reader.result;
            try {
                const parsedData = JSON.parse(fileContent);
                dbController.fill(parsedData);

                ElMessage({
                    type: 'success',
                    message: 'Сохранено',
                });
                router.push('/actions');
            } catch (error) {
                console.log(error);
                notifyWrap(error);
            }
        };

        reader.readAsText(file);
    } catch (error) {
        console.log(error);
    }
};

const createEmpty = async () => {
    try {
        await dbController.setupInitial();
        router.push('/actions');
    } catch (error) {
        console.log(error);
    }
};
</script>

<style scoped>
.container {
    height: 200vh;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    background-color: var(--el-color-gray);
}

.el-card {
    margin-top: 20vh;
}

.el-card > :deep(.el-card__body) {
    padding: 20px;
}

.content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}

.logo {
    display: flex;
    align-items: center;
    gap: 12px;
}

.el-icon.logo_text,
.el-icon.logo_text > svg {
    height: min-content;
}

p {
    max-width: 200px;
    text-align: center;
    color: var(--el-color-gray-light-5);
}

.btn-container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
}
.btn-container > .el-button {
    margin: 0;
}
</style>
