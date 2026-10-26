import { computed, ref } from 'vue'
import { getFunctionsBaseUrl } from '@/config/functions'
import { useAuthStore } from '@/stores/auth'

// Error code → updateForm.error.<key> title and message
const ERROR_KEYS = {
  missing_token: 'invalidLink',
  invalid_token: 'invalidLink',
  expired_token: 'expiredLink',
  server_error: 'server',
  network_error: 'network',
  submission_error: 'submission',
  opt_out_error: 'optOut',
}

/**
 * Load and save a parent's own information through the parent update functions.
 *
 * With a token (the emailed update link), the token identifies the parent.
 * Without one (the profile edit page), the signed-in parent's ID token does.
 *
 * @param {string|null} token - update token from the emailed link, or null
 */
export function useParentUpdate (token = null) {
  const authStore = useAuthStore()

  const loading = ref(true)
  const submitting = ref(false)
  const optingOut = ref(false)
  const error = ref(null)
  const errorType = ref(null) // 'network', 'expired', 'temporary', 'invalid'
  const retryCount = ref(0)
  const data = ref(null) // { parent }

  const errorKey = computed(() => ERROR_KEYS[error.value] || 'unexpected')

  function setError (code, type) {
    error.value = code
    errorType.value = type
  }

  async function post (endpoint, body = {}) {
    const headers = { 'Content-Type': 'application/json' }
    if (token) {
      body = { token, ...body }
    } else {
      headers.Authorization = `Bearer ${await authStore.user.getIdToken()}`
    }

    return fetch(`${getFunctionsBaseUrl()}/${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  }

  async function load () {
    try {
      loading.value = true
      setError(null, null)

      if (!token && !authStore.user) {
        setError('missing_token', 'invalid')
        return
      }

      const response = await post('validateUpdateTokenV2')

      if (!response.ok) {
        console.error('Failed to load parent data:', response.status, response.statusText)
        if (response.status === 404 || response.status === 410) {
          setError('expired_token', 'expired')
        } else if (response.status >= 500) {
          setError('server_error', 'temporary')
        } else {
          setError('network_error', 'network')
        }
        return
      }

      const result = await response.json()

      if (!result.valid) {
        setError('invalid_token', 'expired')
        return
      }

      data.value = {
        parent: result.parent,
      }
    } catch (error_) {
      console.error('Failed to load parent data:', error_)
      if (error_.message.includes('network') || error_.message.includes('fetch')) {
        setError('network_error', 'network')
      } else {
        setError('unexpected_error', 'temporary')
      }
    } finally {
      loading.value = false
    }
  }

  async function retry () {
    retryCount.value++
    await load()
  }

  /**
   * Save the form. Returns the function's result ({ accountStatus }) or null on failure.
   */
  async function submit (parentData) {
    try {
      submitting.value = true
      setError(null, null)

      const response = await post('processParentUpdateV2', { parentData })

      if (!response.ok) {
        if (response.status === 404 || response.status === 410) {
          setError('expired_token', 'expired')
        } else {
          setError('submission_error', 'temporary')
        }
        return null
      }

      return await response.json()
    } catch (error_) {
      console.error('Failed to submit form:', error_)
      setError('submission_error', 'network')
      return null
    } finally {
      submitting.value = false
    }
  }

  /**
   * Remove the parent's information from the directory. Returns the function's
   * result ({ accountStatus }) or null on failure.
   */
  async function optOut () {
    try {
      optingOut.value = true
      setError(null, null)

      const response = await post('processParentOptOutV2')

      if (!response.ok) {
        if (response.status === 404 || response.status === 410) {
          setError('expired_token', 'expired')
        } else {
          setError('opt_out_error', 'temporary')
        }
        return null
      }

      return await response.json()
    } catch (error_) {
      console.error('Failed to process opt-out:', error_)
      setError('opt_out_error', 'network')
      return null
    } finally {
      optingOut.value = false
    }
  }

  return {
    loading,
    submitting,
    optingOut,
    error,
    errorType,
    errorKey,
    retryCount,
    data,
    load,
    retry,
    submit,
    optOut,
  }
}
