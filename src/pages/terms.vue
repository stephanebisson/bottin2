<template>
  <LegalDocument prefix="terms" :sections="sections" />
</template>

<script setup>
  const sections = ['service', 'access', 'acceptableUse', 'accuracy', 'availability', 'suspension', 'liability', 'changes', 'law', 'contact']
</script>
