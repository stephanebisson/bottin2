<template>
  <PrintPage v-for="(page, pageIndex) in paginatedParents" :id="page.isFirstPage ? 'section-parents' : undefined" :key="`parents-page-${pageIndex}`">
    <template #header>
      <!-- Section title only on first page -->
      <h1 v-if="page.isFirstPage" class="section-title">Liste alphabétique des parents</h1>

      <!-- Letter range header -->
      <h1 class="parents-letter-header">{{ page.letterRange }}</h1>
    </template>

    <!-- Parent entries -->
    <div class="parents-list">
      <ParentBlock v-for="parent in page.parents" :key="parent.id" :parent="parent" />
    </div>
  </PrintPage>
</template>

<script setup>
  import ParentBlock from './components/ParentBlock.vue'
  import PrintPage from './PrintPage.vue'

  const props = defineProps({
    paginatedParents: {
      type: Array,
      required: true,
    },
  })
</script>

<style scoped>
/* Parents Section */
.parents-letter-header {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 24pt;
  font-weight: bold;
  margin: 0;
  text-align: center;
  color: #000;
}

.section-title + .parents-letter-header {
  margin-top: 1rem;
}

.parents-list {
  margin-top: 1rem;
}
</style>
