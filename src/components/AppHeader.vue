<template>
    <div class="container">
        <div
            class="logo"
            @click="jumpRoute('/actions')"
        >
            <!-- @click="jumpRoute('/main')" -->
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
                <!-- <el-menu-item index="/main">Главная</el-menu-item> -->
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
                            <!-- <el-dropdown-item
                                :icon="iconUser"
                                disabled
                                >Профиль</el-dropdown-item
                            > -->
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
                            <!-- <el-dropdown-item
                                :icon="iconMagic"
                                @click="handleRandomClick"
                                >Рандомизировать</el-dropdown-item
                            > -->
                            <!-- :icon="iconExit" -->
                            <el-dropdown-item
                                :icon="iconDelete"
                                @click="handleSignoutClick"
                                class="delete_opt"
                                >Очистить данные</el-dropdown-item
                            >
                            <!-- <el-dropdown-item
                                :icon="iconDelete"
                                @click="handleDeleteClick"
                                class="delete_opt"
                            >
                                Удалить данные
                            </el-dropdown-item> -->
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
            @change="processFile"
        />
    </div>
</template>
<script setup>
import AuthBar from './AuthBar.vue';
import LogoIcon from '../components/icons/LogoIcon.vue';
import LogoText from '../components/icons/LogoText.vue';
import { computed, ref, shallowRef } from 'vue';
import { Tools, Close, User, Delete, FullScreen, Aim, Upload, Download, MagicStick } from '@element-plus/icons-vue';
import { notifyWrap } from '../services/utils';
import { Actions, Plans } from '../services/changings';
import { onMounted } from 'vue';
import store from '../store';
import router from '../router';
import { ElMessage, ElMessageBox } from 'element-plus';
import dbController from '../services/db/controller';
import emitHelper from '../services/helpers/emitHelper';
import { dbSettings } from '../services/db/config';

const iconSetting = shallowRef(Tools);
const iconUser = shallowRef(User);
const iconExit = shallowRef(Close);
const iconDelete = shallowRef(Delete);
const iconFull = shallowRef(FullScreen);
const iconNorm = shallowRef(Aim);
const iconDownload = shallowRef(Download);
const iconUpload = shallowRef(Upload);
const iconMagic = shallowRef(MagicStick);
const fileInput = ref(null);

const isFullMode = computed(() => {
    return store.getters.getScreenMode;
});

const jumpRoute = path => {
    router.push({ path });
};
const handleSignoutClick = async () => {
    console.log('signout');
    ElMessageBox.confirm('Вы хотите очистить данные и выйти?', '', {
        confirmButtonText: 'Да',
        cancelButtonText: 'Нет',
        type: 'warning',
    })
        .then(() => {
            clearData();

            ElMessage({
                type: 'success',
                message: 'Данные очищены',
            });
        })
        .then(() => router.push({ path: '/login' }))
        .catch(() => {
            ElMessage({
                type: 'info',
                message: 'Действие отменено',
            });
        });
    // store.dispatch('logout')
};
// const handleDeleteClick = async () => {
//     try {
//         await ElMessageBox.prompt(
//             `Если вы действительно хотите удалить данные приложения,
//         введите "Удалить" в поле ниже. Данные будут стерты с Google диска.
//         Отменить действие будет невозможно. `,
//             'Подтвердите удаление',
//             {
//                 confirmButtonText: 'Удалить',
//                 cancelButtonText: 'Отмена',
//                 inputPlaceholder: 'Удалить',
//                 inputPattern: /Удалить/,
//                 inputErrorMessage: 'Неверный ввод',
//                 confirmButtonClass: 'el-button--danger',
//                 type: 'warning',
//             }
//         );
//         // await store.dispatch('deleteDataList', { col: 'data' });
//         store.dispatch('deleteData');
//         ElMessage({
//             type: 'success',
//             message: 'Удалено',
//         });
//         // store.dispatch('logout');
//     } catch (e) {
//         if (e === 'cancel')
//             return ElMessage({
//                 type: 'info',
//                 message: 'Удаление отменено',
//             });
//         if (!store.getters.isLoggedIn) return;
//         notifyWrap(e);
//     }
// };
const handleScreenModeClick = value => {
    store.commit('SET_SCREEN_MODE', value);
};
const handleDownloadClick = async () => {
    try {
        const link = document.createElement('a');
        const data = await dbController.dump();

        link.href = window.URL.createObjectURL(new Blob([JSON.stringify(data)]));
        const suffix = new Date().toISOString().replace(/:|-|\.|T|Z/g, '');
        link.setAttribute('download', `clerk_data_v${dbSettings.DB_VERSION}_${suffix}.txt`);

        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
    } catch (error) {}
};
const handleUploadClick = async () => {
    fileInput.value.click();
};
const clearData = async () => {
    await dbController.destroy();
    await dbController.init();
};
const processFile = async event => {
    const file = event.target.files[0];
    const reader = new FileReader();

    try {
        reader.onload = async () => {
            const fileContent = reader.result;
            try {
                await clearData();
                const parsedData = JSON.parse(fileContent);
                dbController.fill(parsedData);

                ElMessage({
                    type: 'success',
                    message: 'Сохранено',
                });
                emitHelper.emit('update-all');
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
// const handleRandomClick = async () => {
//     const actions = new Actions();
//     let changes = actions.randomize();
//     await store.dispatch('saveDataChanges', changes);

//     const plans = new Plans();
//     changes = plans.checkPlans();
//     await store.dispatch('saveDataChanges', changes);

//     ElMessage({
//         type: 'success',
//         message: 'Сохранено',
//     });
// };
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
    --el-menu-horizontal-height: var(--header-height);
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
