/**
 * plugins/vuetify.js
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Composables
import { createVuetify } from 'vuetify'
// Styles
import 'vuetify/styles'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: 'academicExcellence',
    themes: {
      // 🎓 Academic Excellence Theme - Deep blues and warm oranges
      academicExcellence: {
        dark: false,
        colors: {
          'primary': '#1565C0', // Deep Academic Blue
          'secondary': '#FF8F00', // Warm Educational Orange
          'accent': '#3F51B5', // Indigo Accent
          'success': '#2E7D32', // Fresh Green
          'warning': '#F57F17', // Golden Yellow
          'error': '#C62828', // Professional Red
          'info': '#0277BD', // Light Academic Blue
          'surface': '#FAFAFA', // Light Gray Surface
          'background': '#F5F5F5', // Very Light Gray Background
          'on-primary': '#FFFFFF',
          'on-secondary': '#000000',
          'on-surface': '#1D1D1D',
          'on-background': '#1D1D1D',
        },
      },

      // 📚 Knowledge Hub Theme - Forest greens and warm browns
      knowledgeHub: {
        dark: false,
        colors: {
          'primary': '#2E7D32', // Forest Green
          'secondary': '#8D6E63', // Warm Brown
          'accent': '#558B2F', // Light Green Accent
          'success': '#388E3C', // Success Green
          'warning': '#F9A825', // Warm Yellow
          'error': '#D32F2F', // Deep Red
          'info': '#1976D2', // Classic Blue
          'surface': '#F1F8E9', // Very Light Green Surface
          'background': '#FAFAFA', // Clean White Background
          'on-primary': '#FFFFFF',
          'on-secondary': '#FFFFFF',
          'on-surface': '#1B5E20',
          'on-background': '#1B5E20',
        },
      },

      // 🌟 Modern School Theme - Contemporary blues and teals
      modernSchool: {
        dark: false,
        colors: {
          'primary': '#00695C', // Deep Teal
          'secondary': '#00BCD4', // Bright Cyan
          'accent': '#009688', // Teal Accent
          'success': '#4CAF50', // Material Green
          'warning': '#FF9800', // Material Orange
          'error': '#F44336', // Material Red
          'info': '#2196F3', // Material Blue
          'surface': '#E0F2F1', // Very Light Teal Surface
          'background': '#FAFAFA', // Clean Background
          'on-primary': '#FFFFFF',
          'on-secondary': '#000000',
          'on-surface': '#004D40',
          'on-background': '#004D40',
        },
      },

      // Dark variants for each theme
      academicExcellenceDark: {
        dark: true,
        colors: {
          'primary': '#42A5F5', // Lighter Blue for dark mode
          'secondary': '#FFB74D', // Lighter Orange for dark mode
          'accent': '#7986CB', // Lighter Indigo
          'success': '#66BB6A', // Lighter Green
          'warning': '#FFCA28', // Lighter Yellow
          'error': '#EF5350', // Lighter Red
          'info': '#29B6F6', // Lighter Info Blue
          'surface': '#1E1E1E', // Dark Surface
          'background': '#121212', // Dark Background
          'on-primary': '#000000',
          'on-secondary': '#000000',
          'on-surface': '#FFFFFF',
          'on-background': '#FFFFFF',
        },
      },

      knowledgeHubDark: {
        dark: true,
        colors: {
          'primary': '#66BB6A', // Lighter Green
          'secondary': '#A1887F', // Lighter Brown
          'accent': '#8BC34A', // Light Green
          'success': '#81C784', // Success Green
          'warning': '#FFD54F', // Warm Yellow
          'error': '#E57373', // Light Red
          'info': '#64B5F6', // Light Blue
          'surface': '#1B5E20', // Dark Green Surface
          'background': '#0D1B0F', // Very Dark Green Background
          'on-primary': '#000000',
          'on-secondary': '#000000',
          'on-surface': '#C8E6C9',
          'on-background': '#C8E6C9',
        },
      },

      modernSchoolDark: {
        dark: true,
        colors: {
          'primary': '#26A69A', // Lighter Teal
          'secondary': '#4DD0E1', // Lighter Cyan
          'accent': '#4DB6AC', // Light Teal
          'success': '#81C784', // Light Green
          'warning': '#FFB74D', // Light Orange
          'error': '#E57373', // Light Red
          'info': '#64B5F6', // Light Blue
          'surface': '#004D40', // Dark Teal Surface
          'background': '#00251A', // Very Dark Teal Background
          'on-primary': '#000000',
          'on-secondary': '#000000',
          'on-surface': '#B2DFDB',
          'on-background': '#B2DFDB',
        },
      },
    },
  },
})
