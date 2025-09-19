/**
 * plugins/index.js
 *
 * Automatically included in `./src/main.js`
 */

import { createI18nPlugin } from '@/composables/useI18n'
import router from '@/router'
import pinia from '@/stores'
// Plugins
import vuetify from './vuetify'
// import i18n from './i18n' // Temporarily commented until package is installed

export function registerPlugins (app) {
  app
    .use(vuetify)
    .use(router)
    .use(pinia)
    .use(createI18nPlugin())
    // .use(i18n) // Temporarily commented until package is installed
}
