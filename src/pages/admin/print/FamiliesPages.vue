<template>
  <PrintPage v-for="(page, pageIndex) in paginatedFamilies" :id="page.isFirstPage ? 'section-families' : undefined" :key="`family-page-${pageIndex}`">
    <template #header>
      <!-- Section title only on first page -->
      <h1 v-if="page.isFirstPage" class="section-title">Liste alphabétique des élèves</h1>

      <!-- Letter range header -->
      <h1 class="families-letter-header">{{ page.letterRange }}</h1>
    </template>

    <!-- 5 families per page, each taking 20% height -->
    <FamilyBlock v-for="(family, index) in page.families" :key="`family-${pageIndex}-${index}`" :family="family" />
  </PrintPage>
</template>

<script setup>
  import FamilyBlock from './components/FamilyBlock.vue'
  import PrintPage from './PrintPage.vue'

  const props = defineProps({
    paginatedFamilies: {
      type: Array,
      required: true,
    },
  })
</script>

<style scoped>
/* Families Section */
.families-letter-header {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 24pt;
  font-weight: bold;
  margin: 0;
  text-align: center;
  color: #000;
}

.section-title + .families-letter-header {
  margin-top: 1rem;
}
</style>
