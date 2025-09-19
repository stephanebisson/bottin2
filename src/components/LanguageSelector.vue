<template>
  <v-menu>
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        icon
        :title="`${$t('common.language')}: ${currentLanguageDisplay}`"
        variant="text"
      >
        <v-icon>{{ currentLanguageIcon }}</v-icon>
      </v-btn>
    </template>

    <v-list min-width="200">
      <!-- Language Header -->
      <v-list-subheader>{{ $t('common.chooseLanguage') }}</v-list-subheader>

      <!-- Language Options -->
      <v-list-item
        v-for="language in languages"
        :key="language.code"
        :active="locale === language.code"
        @click="setLanguage(language.code)"
      >
        <template #prepend>
          <v-icon :color="language.color">{{ language.icon }}</v-icon>
        </template>
        <v-list-item-title>{{ language.name }}</v-list-item-title>
        <v-list-item-subtitle>{{ language.nativeName }}</v-list-item-subtitle>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>
  import { computed } from 'vue'
  import { useI18n } from '@/composables/useI18n'

  const { locale } = useI18n()

  const languages = [
    {
      code: 'fr',
      name: 'Français',
      nativeName: 'French',
      icon: 'mdi-alpha-f-circle',
      color: '#0055A4',
    },
    {
      code: 'en',
      name: 'English',
      nativeName: 'Anglais',
      icon: 'mdi-alpha-e-circle',
      color: '#CF142B',
    },
  ]

  const currentLanguageDisplay = computed(() => {
    const lang = languages.find(l => l.code === locale.value)
    return lang ? lang.name : 'Unknown'
  })

  const currentLanguageIcon = computed(() => {
    return 'mdi-translate'
  })

  const setLanguage = langCode => {
    locale.value = langCode

    // Save to localStorage
    localStorage.setItem('bottin-locale', langCode)

    // Update document language for accessibility
    document.documentElement.lang = langCode
  }
</script>
