<template>
  <LegalDocument prefix="privacy" :sections="sections" />
</template>

<script setup>
  definePage({ meta: { titleKey: 'legal.privacyPolicy' } })

  const providerLinks = [
    { label: 'privacy.googlePrivacyLink', href: 'https://policies.google.com/privacy' },
    { label: 'privacy.firebasePrivacyLink', href: 'https://firebase.google.com/support/privacy' },
  ]

  const sections = ['who', 'officer', 'collected', 'purposes', 'consent', 'access', { id: 'providers', links: providerLinks }, 'retention', 'security', 'rights', 'incidents', 'cookies', 'changes']
</script>
