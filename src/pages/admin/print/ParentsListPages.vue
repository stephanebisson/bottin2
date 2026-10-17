<template>
  <PrintFlow section-id="section-parents">
    <template #header="{ page, start, end }">
      <!-- Section title only on first page -->
      <h1 v-if="page === 0" class="section-title">Liste alphabétique des parents</h1>

      <!-- Letter range header -->
      <h1 class="parents-letter-header">{{ letterRange(parents.slice(start, end)) }}</h1>
    </template>

    <ParentBlock v-for="parent in parents" :key="parent.id" :parent="parent" />
  </PrintFlow>
</template>

<script setup>
  import ParentBlock from './components/ParentBlock.vue'
  import PrintFlow from './PrintFlow.vue'

  defineProps({
    parents: {
      type: Array,
      required: true,
    },
  })

  // First letters of the parents' last names on a page, e.g. "A-B"
  function letterRange (pageParents) {
    const letters = new Set()
    for (const parent of pageParents) {
      if (parent.last_name) {
        letters.add(parent.last_name.charAt(0).toUpperCase())
      }
    }
    return [...letters].toSorted().join('-')
  }
</script>

<style scoped>
/* Parents Section */
.parents-letter-header {
  font-size: var(--print-size-title);
  font-weight: bold;
  margin: 0 0 0.7rem;
  text-align: center;
  color: #000;
}

.section-title + .parents-letter-header {
  margin-top: 0.7rem;
}
</style>
