/**
 * plugins/vuetify.js
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Composables
import { createVuetify } from 'vuetify'
import { en, fr } from 'vuetify/locale'
// Styles
import 'vuetify/styles'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  // Vuetify's own texts (tables, pagination…); the footer link switches it with the app
  locale: {
    locale: localStorage.getItem('bottin-locale') || 'fr',
    fallback: 'fr',
    messages: { en, fr },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      // Deep blues and warm oranges
      light: {
        dark: false,
        colors: {
          'primary': '#1565C0',
          'secondary': '#FF8F00',
          'accent': '#3F51B5',
          'staff': '#00796B',
          'feve': '#558B2F',
          'school': '#6A1B9A',
          'sdg': '#AD1457',
          'success': '#2E7D32',
          'warning': '#F57F17',
          'error': '#C62828',
          'info': '#0277BD',
          'surface': '#FAFAFA',
          'background': '#F5F5F5',
          'on-primary': '#FFFFFF',
          'on-secondary': '#000000',
          'on-surface': '#1D1D1D',
          'on-background': '#1D1D1D',
        },
      },
    },
  },
})
