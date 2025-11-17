<template>
  <v-menu>
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        icon
        :title="`${$i18n('common.language')}: ${currentLanguageDisplay}`"
        variant="text"
      >
        <v-icon>{{ currentLanguageIcon }}</v-icon>
      </v-btn>
    </template>

    <v-list min-width="200">
      <!-- Language Header -->
      <v-list-subheader>{{ $i18n('common.chooseLanguage') }}</v-list-subheader>

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
        <v-list-item-title>{{ language.name() }}</v-list-item-title>
        <v-list-item-subtitle>{{ language.nativeName() }}</v-list-item-subtitle>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>
  import { computed } from 'vue'
  import { useI18n } from 'vue-banana-i18n'

  const bananaI18n = useI18n()
  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)

  // Get current locale reactively
  const locale = computed({
    get: () => bananaI18n.locale,
    set: (value) => {
      bananaI18n.setLocale(value)
    }
  })

  const languages = [
    {
      code: 'fr',
      name: () => $i18n('languageSelector.french'),
      nativeName: () => $i18n('languageSelector.frenchNative'),
      icon: 'mdi-alpha-f-circle',
      color: '#0055A4',
    },
    {
      code: 'en',
      name: () => $i18n('languageSelector.english'),
      nativeName: () => $i18n('languageSelector.englishNative'),
      icon: 'mdi-alpha-e-circle',
      color: '#CF142B',
    },
  ]

  const currentLanguageDisplay = computed(() => {
    const lang = languages.find(l => l.code === locale.value)
    return lang ? lang.name() : $i18n('languageSelector.unknown')
  })

  const currentLanguageIcon = computed(() => {
    return 'mdi-translate'
  })

  function setLanguage (langCode) {
    locale.value = langCode

    // Save to localStorage
    localStorage.setItem('bottin-locale', langCode)

    // Update document language for accessibility
    document.documentElement.lang = langCode
  }
</script>
