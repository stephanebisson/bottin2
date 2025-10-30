<template>
  <v-footer
    app
    class="d-flex align-center justify-space-between px-4"
    height="60"
  >
    <div class="text-caption text-disabled">
      <div v-html="$t('footer.copyright')" />
      <div class="d-flex align-center gap-3">
        <a
          class="text-decoration-none text-disabled d-flex align-center"
          href="mailto:bottin.etoile.filante@gmail.com"
          style="font-size: 0.7rem;"
        >
          <v-icon class="me-1" size="12">mdi-email</v-icon>
          {{ $t('footer.organizationName') }}
        </a>
        <router-link
          v-if="authStore.isAuthenticated"
          class="text-decoration-none text-disabled d-flex align-center"
          style="font-size: 0.7rem;"
          to="/feedback"
        >
          <v-icon class="me-1" size="12">mdi-message-text</v-icon>
          {{ $t('footer.sendFeedback') }}
        </router-link>
      </div>
    </div>

    <v-btn
      size="small"
      :title="$t('footer.switchLanguage', { language: otherLanguage.name })"
      variant="text"
      @click="toggleLanguage"
    >
      <v-icon start>mdi-translate</v-icon>
      {{ otherLanguage.code.toUpperCase() }}
    </v-btn>
  </v-footer>
</template>

<script setup>
  import { computed } from 'vue'
  import { useI18n } from '@/composables/useI18n'
  import { useAuthStore } from '@/stores/auth'

  const { locale, t } = useI18n()
  const authStore = useAuthStore()

  const languages = [
    { code: 'fr', name: () => t('languageSelector.french') },
    { code: 'en', name: () => t('languageSelector.english') },
  ]

  const otherLanguage = computed(() => {
    const lang = languages.find(lang => lang.code !== locale.value)
    return { ...lang, name: lang.name() }
  })

  function toggleLanguage () {
    locale.value = otherLanguage.value.code
  }
</script>
