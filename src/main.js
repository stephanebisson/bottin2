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

// Polyfills for older browsers
import 'abortcontroller-polyfill/dist/polyfill-patch-fetch'

// Styles
import 'unfonts.css'

// Feature detection fallback for requestIdleCallback
const scheduleWork = window.requestIdleCallback
  || ((callback, options) => {
    const timeout = options?.timeout || 2000
    return setTimeout(callback, Math.min(timeout, 16))
  })

// Load icons asynchronously to avoid preload warnings
scheduleWork(() => {
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
