<template>
  <div class="group-section mb-10">
    <!-- Group Header -->
    <h2 class="text-h4 font-weight-bold text-primary mb-6">
      {{ name }}
    </h2>

    <!-- Subgroups -->
    <SubgroupSection
      v-for="subgroupData in subgroups"
      :key="subgroupData.subgroup"
      :group="group"
      :icon="subgroupData.icon"
      :is-fixed="subgroupData.isFixed"
      :members="subgroupData.members"
      :modified-ids="modifiedIds"
      :name="subgroupData.name"
      :subgroup="subgroupData.subgroup"
      @add="$emit('add', $event)"
      @change="$emit('change', $event)"
      @delete="$emit('delete', $event)"
    />
  </div>
</template>

<script setup>
  import SubgroupSection from './SubgroupSection.vue'

  // Props
  defineProps({
    group: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    subgroups: {
      type: Array,
      required: true,
    },
    modifiedIds: {
      type: Set,
      default: () => new Set(),
    },
  })

  // Emits
  defineEmits(['change', 'delete', 'add'])
</script>

<style scoped>
.group-section {
  /* Add spacing between groups */
}
</style>
