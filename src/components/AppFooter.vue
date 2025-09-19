<template>
  <v-footer
    app
    class="d-flex align-center justify-space-between px-4"
    height="60"
  >
    <div class="text-caption text-disabled">
      <div>&copy; 2025 Comité Bottin</div>
      <a
        class="text-decoration-none text-disabled d-flex align-center"
        href="mailto:bottin.etoile.filante@gmail.com"
        style="font-size: 0.7rem;"
      >
        <v-icon class="me-1" size="12">mdi-email</v-icon>
        Bottin Étoile Filante
      </a>
    </div>

    <v-btn
      size="small"
      :title="`Switch to ${otherLanguage.name}`"
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

  const { locale } = useI18n()

  const languages = [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'English' },
  ]

  const otherLanguage = computed(() => {
    return languages.find(lang => lang.code !== locale.value)
  })

  const toggleLanguage = () => {
    locale.value = otherLanguage.value.code
  }
</script>
