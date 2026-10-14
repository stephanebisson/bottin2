<template>
  <v-footer class="footer-compact d-flex align-center justify-center px-4 py-2">
    <div class="d-flex align-center text-body-small text-disabled">
      <span v-html="$i18n('footer.copyright')" />
      <span class="mx-2">•</span>

      <a
        class="text-decoration-none text-disabled"
        href="mailto:bottin.etoile.filante@gmail.com"
      >
        bottin.etoile.filante@gmail.com
      </a>

      <span class="mx-2">•</span>

      <router-link class="text-decoration-none text-disabled" to="/terms">
        {{ $i18n('legal.termsOfUse') }}
      </router-link>

      <span class="mx-2">•</span>

      <router-link class="text-decoration-none text-disabled" to="/privacy">
        {{ $i18n('legal.privacyPolicy') }}
      </router-link>

      <span class="mx-2">•</span>

      <a
        :aria-label="$i18n('footer.switchLanguage', otherLanguage.name)"
        class="text-decoration-none text-disabled"
        href="#"
        :lang="otherLanguage.code"
        @click.prevent="switchLanguage"
      >
        {{ otherLanguage.name }}
      </a>

      <span class="mx-2">•</span>

      <router-link
        class="game-link"
        to="/games"
      >
        <v-icon size="14">mdi-gamepad-variant</v-icon>
      </router-link>
    </div>
  </v-footer>
</template>

<script setup>
  import { computed } from 'vue'
  import { useI18n } from 'vue-banana-i18n'

  const bananaI18n = useI18n()

  // Each language is shown in its own name so it is recognizable to its speakers
  const otherLanguage = computed(() => bananaI18n.locale === 'fr'
    ? { code: 'en', name: 'English' }
    : { code: 'fr', name: 'Français' })

  function switchLanguage () {
    const code = otherLanguage.value.code
    bananaI18n.setLocale(code)
    localStorage.setItem('bottin-locale', code)
    document.documentElement.lang = code
  }
</script>

<style scoped>
.footer-compact {
  height: auto !important;
}

.game-link {
  color: rgb(var(--v-theme-on-surface) / 0.38);
  text-decoration: none;
  transition: all 0.2s ease;
  opacity: 0.6;
  display: inline-flex;
  align-items: center;
}

.game-link:hover {
  opacity: 1;
  color: rgb(var(--v-theme-success));
  transform: scale(1.1);
}

/* Mobile optimization */
@media (max-width: 600px) {
  .footer-compact {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }

  .footer-compact > div {
    font-size: 0.65rem;
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
