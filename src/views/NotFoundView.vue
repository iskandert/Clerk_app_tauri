<template>
    <template v-if="path">
        <p>{{ path }}</p>
    </template>
    <template v-else>
        <el-page-header @back="goBack">
            <template #title> Назад </template>
            <template #content>
                <span class="text-large font-600 mr-3">
                    {{ ($route.redirectedFrom && $route.redirectedFrom.fullPath) || '404' }}
                </span>
            </template>
        </el-page-header>
        <p>Путь не найден</p>
    </template>
    <el-empty :image-size="200" />
</template>
<script>
export default {
    props: {
        path: String,
    },
    computed: {},
    data() {
        return {};
    },
    methods: {
        goBack() {
            return this.$router.go(-1);
        },
    },
};
</script>
