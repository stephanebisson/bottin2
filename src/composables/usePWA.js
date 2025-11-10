import { onMounted, ref } from 'vue'

/**
 * Composable to detect if the app is running as an installed PWA
 * @returns {Object} Object containing isRunningAsPWA reactive reference
 */
export function usePWA () {
  const isRunningAsPWA = ref(false)

  /**
   * Check if the app is running in standalone mode (installed PWA)
   */
  const checkDisplayMode = () => {
    // Check if running in standalone mode (installed PWA)
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone || // iOS Safari
           document.referrer.includes('android-app://')
  }

  onMounted(() => {
    isRunningAsPWA.value = checkDisplayMode()
  })

  return {
    isRunningAsPWA,
  }
}
