<template>
  <PrintFlow section-id="section-comites">
    <template #header="{ page }">
      <h1 v-if="page === 0" class="section-title">Comités</h1>
    </template>

    <!-- Each category: its title, then its committees; a category without a title starts a new page -->
    <template v-for="(category, categoryIndex) in categories" :key="categoryIndex">
      <h2 v-if="category.title" class="committee-category-title">{{ category.title }}</h2>

      <CommitteeBlock
        v-for="(item, index) in category.committees"
        :key="item.committee.id"
        :class="{ 'break-before': !category.title && index === 0 }"
        :committee="item.committee"
        :members="item.members"
      />
    </template>
  </PrintFlow>
</template>

<script setup>
  import CommitteeBlock from './components/CommitteeBlock.vue'
  import PrintFlow from './PrintFlow.vue'

  defineProps({
    // [{ title, committees: [{ committee, members }] }], in print order
    categories: {
      type: Array,
      required: true,
    },
  })
</script>
