<template>
  <v-menu>
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        icon
        :title="`Current theme: ${currentThemeDisplay}`"
        variant="text"
      >
        <v-icon>{{ currentThemeIcon }}</v-icon>
      </v-btn>
    </template>

    <v-list min-width="280">
      <!-- Theme Categories Header -->
      <v-list-subheader>{{ $t('themes.chooseTheme') }}</v-list-subheader>

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
        <v-list-item-title>{{ $t('themes.darkMode') }}</v-list-item-title>
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
  import { useTheme } from 'vuetify'
  import { useI18n } from '@/composables/useI18n'

  const theme = useTheme()
  const { t } = useI18n()

  const lightThemes = computed(() => [
    {
      value: 'academicExcellence',
      name: t('themes.academicExcellence'),
      description: t('themes.academicExcellenceDesc'),
      icon: 'mdi-school',
      color: '#1565C0',
    },
    {
      value: 'knowledgeHub',
      name: t('themes.knowledgeHub'),
      description: t('themes.knowledgeHubDesc'),
      icon: 'mdi-book-open-page-variant',
      color: '#2E7D32',
    },
    {
      value: 'modernSchool',
      name: t('themes.modernSchool'),
      description: t('themes.modernSchoolDesc'),
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
    return themeData ? themeData.name : 'Custom'
  })

  const currentThemeIcon = computed(() => {
    const themeData = lightThemes.value.find(th => th.value === currentTheme.value)
    return themeData ? themeData.icon : 'mdi-palette'
  })

  const setTheme = themeName => {
    const targetTheme = isDarkMode.value ? `${themeName}Dark` : themeName
    theme.global.name.value = targetTheme

    // Save to localStorage
    localStorage.setItem('bottin-theme-name', themeName)
    localStorage.setItem('bottin-theme-dark', isDarkMode.value.toString())
  }

  const toggleDarkMode = darkMode => {
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
