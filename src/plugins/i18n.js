/**
 * plugins/i18n.js
 *
 * Vue I18n internationalization setup
 */

import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import fr from '@/locales/fr.json'

// Get saved language from localStorage or default to French (Canadian school context)
const getSavedLocale = () => {
  const saved = localStorage.getItem('bottin-locale')
  if (saved && ['en', 'fr'].includes(saved)) {
    return saved
  }

  // Try browser language detection
  const browserLang = navigator.language.split('-')[0]
  if (['en', 'fr'].includes(browserLang)) {
    return browserLang
  }

  // Default to French for Canadian schools
  return 'fr'
}

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: getSavedLocale(),
  fallbackLocale: 'en',
  messages: {
    en,
    fr,
  },
})

export default i18n
