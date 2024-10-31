import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '../views/AppLayout.vue';
import LoginView from '../views/LoginView.vue';
import NotFoundView from '../views/NotFoundView.vue';
import store from '../store';
import dbController from '../services/db/controller';
import { getDBInstanse } from '../services/db/instance';

const routes = [
    {
        path: '/',
        alias: '/login',
        name: 'login',
        component: LoginView,
    },
    {
        path: '/index.html',
        alias: '/login',
        name: 'login',
        component: LoginView,
    },
    {
        // path: '/main',
        path: '/actions',
        name: 'main',
        component: AppLayout,
        meta: { auth: true },
        children: [
            // {
            //     path: '/main',
            //     name: 'home',
            //     component: () => import('../views/HomeView.vue'),
            //     meta: { auth: true },
            // },
            {
                path: '/actions',
                name: 'actions',
                component: () => import('../views/ActionsView.vue'),
                meta: { auth: true },
            },
            {
                path: '/plans',
                name: 'plans',
                component: () => import('../views/PlansView.vue'),
                meta: { auth: true },
            },
            {
                path: '/analitic',
                name: 'analitic',
                component: () => import('../views/AnaliticView.vue'),
                meta: { auth: true },
            },
            {
                path: '/404',
                name: '404',
                component: NotFoundView,
            },
            {
                path: '/:pathMatch(.+)+',
                redirect: '/404',
            },
            {
                path: '/',
                // redirect: '/main',
                redirect: '/actions',
                meta: { auth: true },
            },
        ],
    },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

router.beforeEach(async (to, from, next) => {
    let authorized;
    try {
        if (!getDBInstanse()) {
            await dbController.init();
        }
        authorized = await dbController.hasData();
    } catch (error) {
        console.log(error);
        authorized = false;
    }
    console.log('authorized', authorized);
    // if (
    //     store.getters.isLoggedIn ||
    //     (JSON.parse(window.localStorage.getItem('vuex')) &&
    //         JSON.parse(window.localStorage.getItem('vuex')).token)
    // ) {
    //     authorized = true;
    // }
    const requiresAuth = to.matched.some(r => r.meta.auth);

    // console.log('guard 1:', (to.fullPath === '/' || to.fullPath === '/login') && authorized)
    if ((to.fullPath === '/' || to.fullPath === '/login') && authorized) {
        // next('/main');
        next('/actions');
        return;
    }
    // console.log('guard 2:', requiresAuth && !authorized)
    if (requiresAuth && !authorized) {
        next('/login');
        return;
    }
    // console.log('guard 3:', JSON.stringify(to.fullPath) === JSON.stringify(from.fullPath) && to.fullPath !== '/' && from.fullPath !== '/')
    if (JSON.stringify(to.fullPath) === JSON.stringify(from.fullPath) && to.fullPath !== '/' && from.fullPath !== '/') {
        next(false);
        return;
    }
    // console.log('next()')
    next();
});

export default router;
