<template>
  <LegalDocument prefix="privacy" :sections="sections" />
</template>

<script setup>
  const sections = ['who', 'officer', 'collected', 'purposes', 'consent', 'access', 'providers', 'retention', 'security', 'rights', 'incidents', 'cookies', 'changes']
</script>
