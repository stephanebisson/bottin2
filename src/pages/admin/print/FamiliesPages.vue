<template>
  <PrintFlow section-id="section-families">
    <template #header="{ page, start, end }">
      <!-- Section title only on first page -->
      <h1 v-if="page === 0" class="section-title">Liste alphabétique des élèves</h1>

      <!-- Letter range header -->
      <h1 class="families-letter-header">{{ letterRange(families.slice(start, end)) }}</h1>
    </template>

    <FamilyBlock v-for="family in families" :key="family.students[0].id" :family="family" />
  </PrintFlow>
</template>

<script setup>
  import FamilyBlock from './components/FamilyBlock.vue'
  import PrintFlow from './PrintFlow.vue'

  defineProps({
    families: {
      type: Array,
      required: true,
    },
  })

  // First letters of the students' last names on a page, e.g. "A-B"
  function letterRange (pageFamilies) {
    const letters = new Set()
    for (const family of pageFamilies) {
      for (const student of family.students) {
        if (student.last_name) {
          letters.add(student.last_name.charAt(0).toUpperCase())
        }
      }
    }
    return [...letters].toSorted().join('-')
  }
</script>

<style scoped>
/* Families Section */
.families-letter-header {
  font-size: var(--print-size-title);
  font-weight: bold;
  margin: 0;
  text-align: center;
  color: #000;
}

.section-title + .families-letter-header {
  margin-top: 0.7rem;
}
</style>
