<template>
  <v-menu>
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        icon
        :title="$i18n('themeSelector.currentTheme', currentThemeDisplay)"
        variant="text"
      >
        <v-icon>{{ currentThemeIcon }}</v-icon>
      </v-btn>
    </template>

    <v-list min-width="280">
      <!-- Theme Categories Header -->
      <v-list-subheader>{{ $i18n('themes.chooseTheme') }}</v-list-subheader>

      <!-- Light Themes -->
      <v-list-item
        v-for="themeItem in lightThemes"
        :key="themeItem.value"
        :active="currentTheme === themeItem.value"
        @click="setTheme(themeItem.value)"
      >
        <template #prepend>
          <v-icon :color="themeItem.color">{{ themeItem.icon }}</v-icon>
        </template>
        <v-list-item-title>{{ themeItem.name }}</v-list-item-title>
        <v-list-item-subtitle>{{ themeItem.description }}</v-list-item-subtitle>
      </v-list-item>

      <v-divider class="my-2" />

      <!-- Dark Mode Toggle -->
      <v-list-item>
        <template #prepend>
          <v-icon>mdi-brightness-6</v-icon>
        </template>
        <v-list-item-title>{{ $i18n('themes.darkMode') }}</v-list-item-title>
        <template #append>
          <v-switch
            color="primary"
            hide-details
            :model-value="isDarkMode"
            @update:model-value="toggleDarkMode"
          />
        </template>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>
  import { computed, onMounted, watch } from 'vue'
  import { useI18n } from 'vue-banana-i18n'
  import { useTheme } from 'vuetify'

  // Get i18n function from vue-banana-i18n
  const bananaI18n = useI18n()
  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)
  const theme = useTheme()
  const lightThemes = computed(() => [
    {
      value: 'academicExcellence',
      name: $i18n('themes.academicExcellence'),
      description: $i18n('themes.academicExcellenceDesc'),
      icon: 'mdi-school',
      color: '#1565C0',
    },
    {
      value: 'knowledgeHub',
      name: $i18n('themes.knowledgeHub'),
      description: $i18n('themes.knowledgeHubDesc'),
      icon: 'mdi-book-open-page-variant',
      color: '#2E7D32',
    },
    {
      value: 'modernSchool',
      name: $i18n('themes.modernSchool'),
      description: $i18n('themes.modernSchoolDesc'),
      icon: 'mdi-laptop',
      color: '#00695C',
    },
  ])

  const currentTheme = computed(() => {
    const themeName = theme.global.name.value
    // Remove 'Dark' suffix if present
    return themeName.replace('Dark', '')
  })

  const isDarkMode = computed(() => {
    return theme.global.name.value.includes('Dark')
  })

  const currentThemeDisplay = computed(() => {
    const themeData = lightThemes.value.find(th => th.value === currentTheme.value)
    return themeData ? themeData.name : $i18n('themeSelector.custom')
  })

  const currentThemeIcon = computed(() => {
    const themeData = lightThemes.value.find(th => th.value === currentTheme.value)
    return themeData ? themeData.icon : 'mdi-palette'
  })

  function setTheme (themeName) {
    const targetTheme = isDarkMode.value ? `${themeName}Dark` : themeName
    theme.global.name.value = targetTheme

    // Save to localStorage
    localStorage.setItem('bottin-theme-name', themeName)
    localStorage.setItem('bottin-theme-dark', isDarkMode.value.toString())
  }

  function toggleDarkMode (darkMode) {
    const baseTheme = currentTheme.value
    const targetTheme = darkMode ? `${baseTheme}Dark` : baseTheme
    theme.global.name.value = targetTheme

    // Save to localStorage
    localStorage.setItem('bottin-theme-name', baseTheme)
    localStorage.setItem('bottin-theme-dark', darkMode.toString())
  }

  // Load theme from localStorage on mount
  onMounted(() => {
    const savedTheme = localStorage.getItem('bottin-theme-name')
    const savedDarkMode = localStorage.getItem('bottin-theme-dark') === 'true'

    if (savedTheme) {
      const targetTheme = savedDarkMode ? `${savedTheme}Dark` : savedTheme
      theme.global.name.value = targetTheme
    }
  })
</script>
