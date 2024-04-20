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
                    <AuthBar type="in" />
                    <el-link
                        type="primary"
                        @click="openDescription"
                        >Зачем мне это нужно?</el-link
                    >
                </div>
            </div>
        </el-card>
    </div>
</template>

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
    align-items: flex-start;
    gap: 8px;
}
</style>
<script>
import AuthBar from '../components/AuthBar.vue';
import LogoIcon from '../components/icons/LogoIcon.vue';
import LogoText from '../components/icons/LogoText.vue';
import Google from '../components/icons/Google.vue';
import { shallowRef } from 'vue';

export default {
    components: { AuthBar, LogoIcon, LogoText },
    setup() {
        return {
            iconGoogle: shallowRef(Google),
        };
    },
    data() {
        return {
            descDialog: false,
        };
    },
    methods: {
        openDescription() {
            this.$alert(
                `
        <div>Мы не храним данные о вашем бюджете.
        Информация сохраняется в отдельной папке на вашем Google диске.</div>
        <div>К другим папкам и файлам наше приложение не будет иметь доступа.</div>
        `,
                'Это нужно для безопасного хранения данных',
                {
                    dangerouslyUseHTMLString: true,
                    confirmButtonText: 'Понятно!',
                }
            );
        },
    },
    mounted() {
        console.log('login');
    },
};
</script>
