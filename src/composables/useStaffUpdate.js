import { ref } from 'vue'
import { useI18n } from 'vue-banana-i18n'
import { getFunctionsBaseUrl } from '@/config/functions'

/**
 * Shared composable for staff update functionality
 * Used by both V1 (table) and V2 (form) versions
 *
 * @param {string} token - The staff update token
 * @returns {Object} Staff update functions and state
 */
export function useStaffUpdate (token) {
  // Get i18n function from vue-banana-i18n
  const bananaI18n = useI18n()
  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)

  // State
  const loadingStaff = ref(false)
  const saving = ref(false)
  const showSnackbar = ref(false)
  const snackbarMessage = ref('')
  const snackbarColor = ref('info')

  /**
   * Show snackbar notification
   * @param {string} message - Message to display
   * @param {string} color - Color (info, success, error, warning)
   */
  const showMessage = (message, color = 'info') => {
    snackbarMessage.value = message
    snackbarColor.value = color
    showSnackbar.value = true
  }

  /**
   * Load all staff via Firebase Function
   * @returns {Promise<Array>} Array of staff members
   */
  const loadStaff = async () => {
    try {
      loadingStaff.value = true

      const baseUrl = getFunctionsBaseUrl()
      const response = await fetch(`${baseUrl}/getStaffWithToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Convert to editing format
      const staffList = data.staff.map(staff => ({
        id: staff.id,
        first_name: staff.first_name || '',
        last_name: staff.last_name || '',
        email: staff.email || '',
        phone: staff.phone || '',
        title: staff.title || '',
        ce_role: staff.ce_role || '',
        group: staff.group || '',
        subgroup: staff.subgroup || '',
        order: staff.order || 99,
        _isNew: false, // Track if this is a new row
      }))

      return staffList
    } catch (error) {
      console.error('Failed to load staff:', error)
      showMessage($i18n('staffUpdate.loadError'), 'error')
      throw error
    } finally {
      loadingStaff.value = false
    }
  }

  /**
   * Save all changes via Firebase Function
   * @param {Array} updates - Array of staff members to update/create
   * @param {Array} deletions - Array of staff IDs to delete
   * @returns {Promise<void>}
   */
  const saveAllChanges = async (updates, deletions) => {
    try {
      saving.value = true

      const baseUrl = getFunctionsBaseUrl()
      const response = await fetch(`${baseUrl}/updateStaffWithToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          updates,
          deletions,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      showMessage($i18n('staffUpdate.saveSuccess'), 'success')
    } catch (error) {
      console.error('Failed to save changes:', error)
      showMessage($i18n('staffUpdate.saveError'), 'error')
      throw error
    } finally {
      saving.value = false
    }
  }

  return {
    // State
    loadingStaff,
    saving,
    showSnackbar,
    snackbarMessage,
    snackbarColor,

    // Methods
    loadStaff,
    saveAllChanges,
    showMessage,
  }
}
