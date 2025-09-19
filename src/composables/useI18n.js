/**
 * composables/useI18n.js
 *
 * Temporary i18n composable until vue-i18n package is installed
 */

import { computed, ref } from 'vue'
import en from '@/locales/en.json'
import fr from '@/locales/fr.json'

const currentLocale = ref('fr') // Default to French

const messages = {
  en,
  fr,
}

// Get translation value from nested object path
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

export function useI18n () {
  const locale = computed({
    get: () => currentLocale.value,
    set: value => {
      currentLocale.value = value
      localStorage.setItem('bottin-locale', value)
      document.documentElement.lang = value
    },
  })

  const t = (key, params = {}) => {
    const message = getNestedValue(messages[currentLocale.value], key)

    if (!message) {
      // Fallback to English if not found
      const fallback = getNestedValue(messages.en, key)
      if (!fallback) {
        console.warn(`Translation key "${key}" not found`)
        return key
      }
      return fallback
    }

    // Simple parameter substitution
    let result = message
    for (const [param, value] of Object.entries(params)) {
      result = result.replace(`{${param}}`, value)
    }

    return result
  }

  // Initialize from localStorage
  const savedLocale = localStorage.getItem('bottin-locale')
  if (savedLocale && ['en', 'fr'].includes(savedLocale)) {
    currentLocale.value = savedLocale
  }

  return {
    locale,
    t,
  }
}

// Plugin to add global $t property
export function createI18nPlugin () {
  return {
    install (app) {
      app.config.globalProperties.$t = (key, params = {}) => {
        const message = getNestedValue(messages[currentLocale.value], key)

        if (!message) {
          // Fallback to English if not found
          const fallback = getNestedValue(messages.en, key)
          if (!fallback) {
            console.warn(`Translation key "${key}" not found`)
            return key
          }
          return fallback
        }

        // Simple parameter substitution
        let result = message
        for (const [param, value] of Object.entries(params)) {
          result = result.replace(`{${param}}`, value)
        }

        return result
      }
    },
  }
}
