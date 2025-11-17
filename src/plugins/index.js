/**
 * plugins/index.js
 *
 * Automatically included in `./src/main.js`
 */

import { createI18n } from 'vue-banana-i18n'
import enMessages from '@/locales/en.json'
import frMessages from '@/locales/fr.json'
import router from '@/router'
import pinia from '@/stores'
// Plugins
import vuetify from './vuetify'

/**
 * Flatten nested message object for vue-banana-i18n
 * Converts { nav: { home: "Home" } } to { "nav.home": "Home" }
 */
function flattenMessages(obj, prefix = '') {
  const flattened = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flattened, flattenMessages(value, newKey))
    } else {
      flattened[newKey] = value
    }
  }

  return flattened
}

// Get saved locale from localStorage, default to French (Canadian school)
const savedLocale = localStorage.getItem('bottin-locale') || 'fr'

// Flatten messages for vue-banana-i18n
const flatEnMessages = flattenMessages(enMessages)
const flatFrMessages = flattenMessages(frMessages)

// Create i18n instance with vue-banana-i18n
const i18n = createI18n({
  locale: savedLocale,
  messages: {
    en: flatEnMessages,
    fr: flatFrMessages
  }
})

export function registerPlugins (app) {
  app
    .use(vuetify)
    .use(router)
    .use(pinia)
    .use(i18n)
}
