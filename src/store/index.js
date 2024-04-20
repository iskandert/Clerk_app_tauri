import { createStore } from 'vuex';
import createPersistedState from 'vuex-persistedstate';
import api from '../services/api';
import axios from 'axios';
import { cloneByJSON, dayjs, getInitWidth, setValueAfterDelay } from '../services/utils';
import { layoutSizing } from '../config';
import { watch } from 'vue';
import { initEntities } from '../initial.config';

const getDefaultState = () => {
    return {
        token: '',
        isExpired: false,
        expiringTimeout: undefined,
        user: {},
        loadState: false,
        isMobileSize: false,
        fullScreenMode: false,
        meta: [],
        data: {
            tables: {},
            categories: {},
            plans: {},
            actions: {},
            config: {},
        },
        calculatings: {
            isFirstCalculate: true,
        },
        viewportSize: getInitWidth(layoutSizing), // xs, sm, md, lg, xl
    };
};

console.log('store created');
const store = createStore({
    // plugins: [createPersistedState()],
    state: getDefaultState(),
    getters: {
        isLoggedIn: state => {
            // return true
            return state.token;
        },
        getUser: state => {
            return state.user;
        },
        getLoadState: state => {
            return state.loadState;
        },
        getWindowSizeState: state => {
            return state.isMobileSize;
        },
        getScreenMode: state => {
            return state.fullScreenMode;
        },
        getList: state => col => {
            let colParts = col.split('/').filter(str => str);
            if (colParts.length === 2) return state[colParts[0]][colParts[1]];
            return state[colParts[0]];
        },
        getData: state => col => {
            return state.data?.[col]?.data;
        },
        getCalcs: state => col => {
            return state.calculatings?.[col];
        },
        getAllData: state => state.data,
        // getViewportSize: (state) => (size) => {
        //   if (typeof size === 'string') {
        //     return state.viewportSize === size
        //   }
        //   return size.some((curr) => state.viewportSize === curr)
        // },
    },
    mutations: {
        SET_TOKEN: (state, { token, saved_in, expires_in }) => {
            state.token = token;
            state.saved_in = saved_in;
            state.expires_in = expires_in; // prod
            window.localStorage.setItem(
                'vuex',
                JSON.stringify({
                    token,
                    saved_in,
                    expires_in,
                })
            );
            // state.expires_in = 65 // test
        },
        SET_TOKEN_EVER: state => {
            state.token = 'token';
        },
        SET_USER: (state, user) => {
            state.user = user;
        },
        SET_SUP_DATA: (state, { f, data }) => {
            let colParts = f.split('/').filter(str => str);
            if (colParts.length === 2) return (state[colParts[0]][colParts[1]] = data);
            state[colParts[0]] = data;
        },
        SET_CALC_DATA: (state, { f, data }) => {
            state.calculatings[f] = data;
        },
        SET_COL_DATA: (state, { f, data }) => {
            let colParts = f.split('/').filter(str => str);
            if (colParts.length === 2) return (state[colParts[0]][colParts[1]].data = data);
            state[colParts[0]].data = data;
        },
        SET_ALL_DATA: (state, { data }) => {
            state.data = data;
        },
        SET_LOAD_STATE: (state, value) => {
            state.loadState = value;
        },
        SET_SCREEN_MODE: (state, value) => {
            state.fullScreenMode = value;
        },
        RESET: state => {
            // clearTimeout(state.expiringTimeout)
            Object.assign(state, getDefaultState());
            console.log('store reseted');
        },
    },
    actions: {
        login: ({ commit, dispatch }, { token, saved_in, expires_in }) => {
            console.log(saved_in, expires_in);
            commit('SET_TOKEN', { token, saved_in, expires_in });
            dispatch('setTokenExpiring');

            axios.defaults.headers.common['Authorization'] = token;
        },
        logout: async ({ commit, getters }) => {
            console.log('sign out');
            commit('RESET');
            window.localStorage.removeItem('vuex');
            axios.defaults.headers.common['Authorization'] = '';
            window.google?.accounts?.oauth2?.revoke?.(getters.isLoggedIn);
            window.gapi?.client?.setToken?.('');
        },
        loginLocal: ({ commit, state }) => {
            commit('SET_TOKEN_EVER');
            console.log(state.token);
        },
        logoutLocal: ({ commit }) => {
            commit('RESET');
        },
        setTokenExpiring: ({ commit, getters }) => {
            if (!getters.isLoggedIn) return;
            const saved_in = getters.getList('saved_in');
            const expires_in = getters.getList('expires_in');
            commit('SET_SUP_DATA', {
                f: 'expiringTimeout',
                data: setValueAfterDelay(
                    //
                    data => commit('SET_SUP_DATA', { f: 'isExpired', data }),
                    [false, true],
                    expires_in,
                    saved_in
                ),
            });
        },
        getDataList: async ({ commit }, payload) => {
            try {
                console.log('dispatch');
                const res = await api.getData(payload);
                console.log(res);
                // if (payload.col === 'data') commit('SET_ALL_DATA', { data: res.data })
                // else commit('SET_SUP_DATA', { f: payload.col, data: res.data })
            } catch (err) {
                console.log(err);
            }
        },
        async deleteDataList({ commit }, payload) {
            try {
                const res = await api.deleteData(payload);
                if (payload.col === 'data') commit('SET_ALL_DATA', { data: res.data });
                else commit('SET_SUP_DATA', { f: payload.col, data: res.data });
            } catch (e) {
                throw e;
            }
        },
        deleteData({ commit, state }) {
            try {
                commit('SET_ALL_DATA', { data: initEntities() });
                console.log(state.data);
            } catch (e) {
                console.log(e);
                throw e;
            }
        },
        async saveDataChanges({ commit, getters }, payload) {
            const setUpData = ({ field, data, col = 'data' }) => {
                const { fileId, name } = getters.getList(`data/${field}`);
                return {
                    col,
                    id: fileId,
                    payload: {
                        name,
                        data,
                    },
                    field,
                };
            };
            let options;
            if (Array.isArray(payload)) {
                options = cloneByJSON(payload).map(setUpData);
            } else options = [setUpData(cloneByJSON(payload))];
            try {
                const res = await Promise.all(
                    options.map(opts => {
                        commit('SET_COL_DATA', {
                            f: `${opts.col}/${opts.field}`,
                            data: opts.payload.data,
                        });
                        // return api.putData(opts)
                    })
                );
                // const res = await api.putData(options)
                // if (payload.col === 'data') commit('SET_ALL_DATA', { data: res.data })
                // else commit('SET_SUP_DATA', { f: payload.col, data: res.data })
                return res;
            } catch (e) {
                throw e;
            }
        },
    },
});

watch(
    () => store.state.token,
    nv => console.log('token changed:', nv)
);

export default store;
