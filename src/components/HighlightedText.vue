<template>
  <span>
    <span
      v-for="(segment, index) in segments"
      :key="index"
      :class="segment.highlight ? 'bg-yellow-lighten-4' : ''"
    >{{ segment.text }}</span>
  </span>
</template>

<script setup>
  import { computed } from 'vue'
  import { highlightMatches } from '@/utils/search'

  const props = defineProps({
    text: {
      type: String,
      default: '',
    },
    query: {
      type: String,
      default: '',
    },
  })

  const segments = computed(() => {
    return highlightMatches(props.text, props.query)
  })
</script>
