<template>
    <RouterView />
</template>

<script>
import { RouterView } from 'vue-router';
import store from './store';
import { watchTokenExpiring } from './composables/watchers';

export default {
    setup() {
        // const localVuex = JSON.parse(window.localStorage.getItem('vuex'))
        // if (localVuex?.token) {
        //   store.dispatch('login', localVuex)
        // }
        // store.dispatch('setTokenExpiring')
        // watchTokenExpiring()
    },
};
</script>

<style>
:root {
    --app-vsize-sm: 768px;
    --app-vsize-md: 992px;
    --app-vsize-lg: 1200px;
    --app-vsize-xl: 1920px;

    --el-color-primary: #21b7c9 !important;
    --el-color-primary-light-3: #44cdd9 !important;
    --el-color-primary-light-5: #69dbe3 !important;
    --el-color-primary-light-7: #9ce7ee !important;
    --el-color-primary-light-8: #bbf2f4 !important;
    --el-color-primary-light-9: #dbf6f9 !important;
    --el-color-primary-dark-1: #1297a7 !important;
    --el-color-primary-dark-2: #176d77 !important;

    --el-color-gray: #c5dddb;
    --el-color-gray-light-3: #9eb8b5;
    --el-color-gray-light-5: #809190;
    --el-color-gray-light-7: #626e6c;
    --el-color-gray-light-8: #4f5956;
    --el-color-gray-light-9: #3a3f3f;
    --el-color-gray-dark-2: #e7f0ef;

    --el-color-transparent: #ffffffcc;
    --el-color-transparent-light-3: #ffffff9e;
    --el-color-transparent-light-5: #ffffff78;
    --el-color-transparent-light-7: #ffffff54;
    --el-color-transparent-light-8: #ffffff3b;
    --el-color-transparent-light-9: #ffffff21;
    --el-color-transparent-dark-2: #ffffffe8;

    --el-box-shadow-primary: 0px 12px 32px 4px #21b7c920, 0px 8px 20px #21b7c940;
    --el-box-shadow-primary-light-3: 0px 12px 32px 4px #44cdd920, 0px 8px 20px #44cdd940;
    --el-box-shadow-primary-light-5: 0px 12px 32px 4px #69dbe320, 0px 8px 20px #69dbe340;
    --el-box-shadow-primary-light-7: 0px 12px 32px 4px #9ce7ee20, 0px 8px 20px #9ce7ee40;
    --el-box-shadow-primary-light-8: 0px 12px 32px 4px #bbf2f420, 0px 8px 20px #bbf2f440;
    --el-box-shadow-primary-light-9: 0px 12px 32px 4px #dbf6f920, 0px 8px 20px #dbf6f940;
    --el-box-shadow-primary-dark-2: 0px 12px 32px 4px #176d7720, 0px 8px 20px #176d7740;
}

.el-button--transparent {
    --el-button-text-color: var(--el-color-white);
    --el-button-bg-color: var(--el-color-transparent);
    --el-button-border-color: var(--el-color-transparent);
    --el-button-outline-color: var(--el-color-transparent-light-5);
    --el-button-active-color: var(--el-color-transparent-dark-2);
    --el-button-hover-text-color: var(--el-color-white);
    --el-button-hover-link-text-color: var(--el-color-transparent-light-5);
    --el-button-hover-bg-color: var(--el-color-transparent-light-3);
    --el-button-hover-border-color: var(--el-color-transparent-light-3);
    --el-button-active-bg-color: var(--el-color-transparent-dark-2);
    --el-button-active-border-color: var(--el-color-transparent-dark-2);
    --el-button-disabled-text-color: var(--el-color-white);
    --el-button-disabled-bg-color: var(--el-color-transparent-light-5);
    --el-button-disabled-border-color: var(--el-color-transparent-light-5);
}

.el-button.el-button--transparent.is-text {
    --el-button-text-color: var(--el-color-white);
    --el-button-hover-text-color: var(--el-color-white);
    --el-button-active-text-color: var(--el-color-white);
}

.el-button.el-button--transparent.is-text:not(.is-disabled):focus,
.el-button.el-button--transparent.is-text:not(.is-disabled):hover {
    background-color: var(--el-color-transparent-light-8);
}

.el-button.el-button--transparent.is-text:not(.is-disabled):active {
    background-color: var(--el-color-transparent-light-5);
}

body .el-message-box__title {
    font-size: 16px;
    font-weight: bold;
    line-height: 1.3;
}

body .el-message-box__message > p > div {
    line-height: 1.3;
    margin-bottom: 8px;
}

.el-card > .el-card__body {
    padding: 12px;
}

h1,
h2,
h3,
h4,
h5,
h6 {
    margin-top: 0;
    color: var(--el-color-gray-light-8);
}

h1 {
    font-size: 24px;
    margin-bottom: 12px;
}

h2,
h3 {
    font-size: 20px;
    margin-bottom: 10px;
}

h4 {
    font-size: 16px;
    margin-bottom: 8px;
}

h5,
h6 {
    font-size: 14px;
    margin-bottom: 7px;
}

h1,
h2,
h5 {
    color: var(--el-color-gray-light-9);
}

:is(h1, h2, h3, h4, h5, h6) > .el-link {
    font-weight: inherit;
    font-size: inherit;
}

:is(h1, h2, h3, h4, h5, h6) > .el-link:not(:hover) {
    color: inherit;
}

span.el-link__inner {
    font-size: inherit;
}

p {
    margin: 0;
}

:not(.el-button, .menu-item-text, .el-message-box__title, .el-switch, .el-switch__label)
    > span:not(.el-link__inner, .trigger),
p {
    font-size: 14px;
    color: var(--el-text-color-regular);
}

.el-card:has(:is(h1, h2, h3, h4, h5, h6) > .el-link:hover),
.el-card.primary-shadow.is-always-shadow,
.primary-shadow {
    box-shadow: var(--el-box-shadow-primary);
}

div.el-form-item {
    margin-bottom: 16px;
}

.el-form-item__content > div,
.el-form-item__content > div.el-input {
    width: 100%;
}

div.el-dialog__body {
    padding-top: 0;
}

.span-wrap-keepall {
    word-break: keep-all;
    overflow-wrap: break-word;
}
</style>
