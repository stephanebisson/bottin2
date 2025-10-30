<template>
  <v-footer app class="footer-two-row">
    <!-- Top Row: Actions (Feedback + Language) -->
    <div class="footer-actions d-flex align-center px-6 py-2" style="gap: 3rem;">
      <!-- Left: Feedback -->
      <router-link
        v-if="authStore.isAuthenticated"
        class="text-decoration-none text-primary d-flex align-center"
        to="/feedback"
      >
        <v-icon class="me-1" size="small">mdi-message-text</v-icon>
        <span class="text-body-2 font-weight-medium">{{ $t('footer.sendFeedback') }}</span>
      </router-link>
      <div v-else style="flex: 1;" />

      <!-- Spacer -->
      <div style="flex: 1;" />

      <!-- Right: Language Switcher -->
      <v-btn
        size="small"
        :title="$t('footer.switchLanguage', { language: otherLanguage.name })"
        variant="text"
        @click="toggleLanguage"
      >
        <v-icon start>mdi-translate</v-icon>
        {{ otherLanguage.code.toUpperCase() }}
      </v-btn>
    </div>

    <!-- Bottom Row: Copyright + Email (muted) -->
    <v-divider />
    <div class="footer-legal d-flex align-center justify-center px-4 py-2 text-caption text-disabled">
      <span v-html="$t('footer.copyright')" />
      <span class="mx-2">•</span>
      <a
        class="text-decoration-none text-disabled"
        href="mailto:bottin.etoile.filante@gmail.com"
      >
        bottin.etoile.filante@gmail.com
      </a>
    </div>
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

<style scoped>
.footer-two-row {
  display: flex;
  flex-direction: column;
  height: auto !important;
  padding: 0;
}

.footer-legal {
  background-color: rgba(var(--v-theme-surface), 1);
}

/* Mobile optimization */
@media (max-width: 600px) {
  .footer-actions {
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }

  .footer-legal {
    font-size: 0.65rem;
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
