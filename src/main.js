/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Composables
import { createApp } from 'vue'

// Security
import { initSecurity } from '@/config/security'

// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Styles
import 'unfonts.css'

// Load icons asynchronously to avoid preload warnings
requestIdleCallback(() => {
  import('@/styles/icons.css')
}, { timeout: 2000 })

// Initialize security configuration
try {
  initSecurity()
} catch (error) {
  console.error('Failed to initialize security:', error)
  if (import.meta.env.PROD) {
    throw error // Fail hard in production
  }
}

const app = createApp(App)

registerPlugins(app)

app.mount('#app')
