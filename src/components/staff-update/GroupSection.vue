<template>
  <div class="group-section mb-10">
    <!-- Group Header -->
    <h2 class="text-headline-medium font-weight-bold text-primary mb-6">
      {{ name }}
    </h2>

    <!-- Subgroups -->
    <SubgroupSection
      v-for="subgroupData in subgroups"
      :key="subgroupData.subgroup"
      :group="group"
      :icon="subgroupData.icon"
      :members="subgroupData.members"
      :modified-ids="modifiedIds"
      :name="subgroupData.name"
      :subgroup="subgroupData.subgroup"
      @change="$emit('change', $event)"
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
  defineEmits(['change'])
</script>
