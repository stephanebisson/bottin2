<template>
  <LegalDocument prefix="terms" :sections="sections" />
</template>

<script setup>
  definePage({ meta: { titleKey: 'legal.termsOfUse' } })

  const sections = ['service', 'access', 'acceptableUse', 'accuracy', 'availability', 'suspension', 'liability', 'changes', 'law', 'contact']
</script>
