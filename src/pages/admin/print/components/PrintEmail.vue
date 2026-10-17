<template>
  <!-- A long email may only wrap after the "@", never inside a name or at a hyphen -->
  <template v-if="atIndex > 0"><span class="email-part">{{ email.slice(0, atIndex + 1) }}</span><wbr><span class="email-part">{{ email.slice(atIndex + 1) }}</span></template>
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

<style scoped>
.email-part {
  white-space: nowrap;
}
</style>
