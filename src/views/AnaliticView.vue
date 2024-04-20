<template>
    <div class="container">
        <AnaliticChartCorrelation />
        <AnaliticChartBalance />
    </div>
</template>
<script setup>
import AnaliticChartBalance from '../components/AnaliticChartBalance.vue';
import AnaliticChartCorrelation from '../components/AnaliticChartCorrelation.vue';
</script>
<style scoped>
.container {
    display: flex;
    flex-direction: column;
    gap: 16px;
}
</style>
