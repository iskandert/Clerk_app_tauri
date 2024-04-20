// import './assets/main.css'

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/display.css';
import axios from 'axios';
import ru from 'element-plus/dist/locale/ru.js';
import { dayjs } from './services/utils';

// const user = store.getters.getUser
const app = createApp(App);

axios.defaults.headers.common['Authorization'] = store.getters.isLoggedIn;

app.use(router).use(store).use(ElementPlus, {
    locale: ru,
});

app.config.globalProperties.$dayjs = dayjs;

app.mount('#app');

axios.interceptors.response.use(undefined, function (error) {
    if (error?.response?.status === 401) {
        store.dispatch('logout');
        return router.push('/login');
    }
    if (error?.response?.status !== 401) return Promise.reject(error);
    if (error) {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            store.dispatch('logout');
            return router.push('/login');
        }
    }
});
