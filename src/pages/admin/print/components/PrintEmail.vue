<template>
  <!-- A long email may only wrap after the "@", never in the middle of a name -->
  <template v-if="atIndex > 0">{{ email.slice(0, atIndex + 1) }}<wbr>{{ email.slice(atIndex + 1) }}</template>
  <template v-else>{{ email }}</template>
</template>

<script setup>
  import { computed } from 'vue'

  const props = defineProps({
    email: {
      type: String,
      default: '',
    },
  })

  const atIndex = computed(() => props.email.indexOf('@'))
</script>
