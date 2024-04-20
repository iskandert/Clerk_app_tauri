<template>
    <div class="container">
        <div
            class="logo"
            @click="jumpRoute('/main')"
        >
            <el-icon
                :size="20"
                color="white"
            >
                <LogoIcon />
            </el-icon>
            <el-icon
                class="logo_text"
                :size="60"
                color="white"
            >
                <LogoText />
            </el-icon>
        </div>
        <nav>
            <el-menu
                :default-active="'/' + $route.path.split('/')[1]"
                mode="horizontal"
                class="menu"
                :router="true"
                :ellipsis="false"
                background-color="#00000000"
                active-text-color="#fff"
                text-color="var(--el-color-transparent-light-3)"
            >
                <el-menu-item index="/main">Главная</el-menu-item>
                <el-menu-item index="/actions">Операции</el-menu-item>
                <el-menu-item index="/analitic">Аналитика</el-menu-item>
                <el-menu-item index="/plans">Планы</el-menu-item>
            </el-menu>
            <div class="settings">
                <el-dropdown
                    placement="bottom-end"
                    trigger="click"
                >
                    <el-button
                        class="el-button--transparent setting_btn"
                        text
                        circle
                        :icon="iconSetting"
                    ></el-button>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item
                                :icon="iconUser"
                                disabled
                                >Профиль</el-dropdown-item
                            >
                            <el-dropdown-item
                                :icon="iconFull"
                                class="desktop-only"
                                @click="handleScreenModeClick(true)"
                                v-if="!isFullMode"
                                >Развернуть</el-dropdown-item
                            >
                            <el-dropdown-item
                                :icon="iconNorm"
                                class="desktop-only"
                                @click="handleScreenModeClick(false)"
                                v-else
                                >Свернуть</el-dropdown-item
                            >
                            <el-dropdown-item
                                :icon="iconDownload"
                                @click="handleDownloadClick"
                                >Скачать данные</el-dropdown-item
                            >
                            <el-dropdown-item
                                :icon="iconUpload"
                                @click="handleUploadClick"
                                >Загрузить данные</el-dropdown-item
                            >
                            <el-dropdown-item
                                :icon="iconMagic"
                                @click="handleRandomClick"
                                >Рандомизировать</el-dropdown-item
                            >
                            <el-dropdown-item
                                :icon="iconExit"
                                @click="handleSignoutClick"
                                >Выйти</el-dropdown-item
                            >
                            <el-dropdown-item
                                :icon="iconDelete"
                                @click="handleDeleteClick"
                                class="delete_opt"
                            >
                                Удалить данные
                            </el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </div>
        </nav>

        <input
            type="file"
            ref="fileInput"
            style="display: none"
            accept=".txt"
            @change="handleFileChange"
        />
    </div>
</template>
<script>
import AuthBar from './AuthBar.vue';
import LogoIcon from '../components/icons/LogoIcon.vue';
import LogoText from '../components/icons/LogoText.vue';
import { shallowRef } from 'vue';
import {
    Tools,
    Close,
    User,
    Delete,
    FullScreen,
    Aim,
    Upload,
    Download,
    MagicStick,
} from '@element-plus/icons-vue';
import { notifyWrap } from '../services/utils';
import { Actions, Plans } from '../services/changings';

export default {
    components: { AuthBar, LogoIcon, LogoText },
    setup() {
        return {
            iconSetting: shallowRef(Tools),
            iconUser: shallowRef(User),
            iconExit: shallowRef(Close),
            iconDelete: shallowRef(Delete),
            iconFull: shallowRef(FullScreen),
            iconNorm: shallowRef(Aim),
            iconDownload: shallowRef(Download),
            iconUpload: shallowRef(Upload),
            iconMagic: shallowRef(MagicStick),
        };
    },
    computed: {
        pagePath() {
            return this.$route.name;
        },
        isFullMode() {
            return this.$store.getters.getScreenMode;
        },
    },
    methods: {
        jumpRoute(path) {
            this.$router.push({ path });
        },
        async handleSignoutClick() {
            console.log('signout');
            this.$confirm('Вы хотите выйти из системы?', '', {
                confirmButtonText: 'Да',
                cancelButtonText: 'Нет',
                type: 'warning',
            })
                .then(() => {
                    // this.$store.dispatch('logout');
                    this.$store.dispatch('logoutLocal');
                    this.$message({
                        type: 'success',
                        message: 'Вышли',
                    });
                })
                .then(() => this.$router.push({ path: '/login' }))
                .catch(() => {
                    this.$message({
                        type: 'info',
                        message: 'Действие отменено',
                    });
                });
            // this.$store.dispatch('logout')
        },
        async handleDeleteClick() {
            try {
                await this.$prompt(
                    `Если вы действительно хотите удалить данные приложения, 
        введите "Удалить" в поле ниже. Данные будут стерты с Google диска. 
        Отменить действие будет невозможно. `,
                    'Подтвердите удаление',
                    {
                        confirmButtonText: 'Удалить',
                        cancelButtonText: 'Отмена',
                        inputPlaceholder: 'Удалить',
                        inputPattern: /Удалить/,
                        inputErrorMessage: 'Неверный ввод',
                        confirmButtonClass: 'el-button--danger',
                        type: 'warning',
                    }
                );
                // await this.$store.dispatch('deleteDataList', { col: 'data' });
                this.$store.dispatch('deleteData');
                this.$message({
                    type: 'success',
                    message: 'Удалено',
                });
                // this.$store.dispatch('logout');
            } catch (e) {
                if (e === 'cancel')
                    return this.$message({
                        type: 'info',
                        message: 'Удаление отменено',
                    });
                if (!this.$store.getters.isLoggedIn) return;
                notifyWrap(e);
            }
        },
        handleScreenModeClick(value) {
            this.$store.commit('SET_SCREEN_MODE', value);
        },
        handleDownloadClick() {
            const link = document.createElement('a');
            const data = this.$store.getters.getList('data');
            const arrayedData = [];
            for (const field in data) {
                arrayedData.push({
                    field,
                    data: data[field].data,
                });
            }
            link.href = window.URL.createObjectURL(new Blob([JSON.stringify(arrayedData)]));
            const suffix = new Date().toISOString().replace(/:|-|\.|T|Z/g, '');
            link.setAttribute('download', `clerk_data_${suffix}.txt`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        handleUploadClick() {
            this.$refs.fileInput.click();
        },
        handleFileChange(event) {
            const file = event.target.files[0];
            const reader = new FileReader();

            reader.onload = async () => {
                const fileContent = reader.result;
                try {
                    const parsedData = JSON.parse(fileContent);
                    for (const { field, data } of parsedData) {
                        if (
                            !data ||
                            (field === 'config' &&
                                !(typeof data === 'object' && !Array.isArray(data))) ||
                            (field !== 'config' && !Array.isArray(data))
                        ) {
                            throw new Error('Файл поврежден');
                        }
                    }
                    await this.$store.dispatch('saveDataChanges', parsedData);

                    const actions = new Actions();
                    const changesActions = actions.simplifyByDays();
                    await this.$store.dispatch('saveDataChanges', changesActions);
                    const plans = new Plans();
                    const changes = plans.checkPlans();
                    await this.$store.dispatch('saveDataChanges', changes);

                    this.$message({
                        type: 'success',
                        message: 'Сохранено',
                    });
                } catch (error) {
                    notifyWrap(error);
                }
            };

            reader.readAsText(file);
        },
        async handleRandomClick() {
            const actions = new Actions();
            let changes = actions.randomize();
            await this.$store.dispatch('saveDataChanges', changes);

            const plans = new Plans();
            changes = plans.checkPlans();
            await this.$store.dispatch('saveDataChanges', changes);

            this.$message({
                type: 'success',
                message: 'Сохранено',
            });
        },
    },
    mounted() {
        console.log(this.$store.state.data);
    },
};
</script>
<style scoped>
.container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 100%;
    flex-grow: 1;
}

.logo {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.el-icon.logo_text,
.el-icon.logo_text > svg {
    height: min-content;
}

nav {
    display: flex;
    gap: 10px;
    align-items: center;
}

.menu.el-menu {
    --el-menu-item-height: calc(var(--header-height) - 2.5px);
    border-bottom: none;
    display: none;
}

.setting_btn {
    aspect-ratio: 1;
}

.setting_btn :deep(svg) {
    scale: 1.25;
}

:global(.delete_opt.el-dropdown-menu__item) {
    color: var(--el-color-danger);
}

@media (min-width: 768px) {
    .menu.el-menu {
        display: flex;
    }
}
</style>
