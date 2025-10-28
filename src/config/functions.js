/**
 * Firebase Functions Configuration
 *
 * Centralized configuration for Firebase Functions endpoints
 * Includes HTTPS enforcement and security validation
 */

// Firebase Functions region
export const FUNCTIONS_REGION = 'northamerica-northeast1' // Montreal, Canada
export const PROJECT_ID = 'bottin2-3b41d'

/**
 * Validates that URLs use HTTPS in production
 * @param {string} url - URL to validate
 * @param {string} context - Context for error messages
 */
function validateHttpsUrl (url, context = 'API') {
  if (import.meta.env.PROD && !url.startsWith('https://')) {
    throw new Error(`${context} must use HTTPS in production. Current URL: ${url}`)
  }
}

// Base URLs for Firebase Functions with HTTPS enforcement
export function getFunctionsBaseUrl () {
  const baseUrl = import.meta.env.DEV
    ? `http://localhost:5001/${PROJECT_ID}/${FUNCTIONS_REGION}` // Emulator uses same region as production
    : `https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net` // Production uses Montreal

  // Validate HTTPS in production
  validateHttpsUrl(baseUrl, 'Firebase Functions')

  return baseUrl
}

/**
 * Security headers for API requests
 */
export function getApiHeaders () {
  return {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
}

/**
 * Secure fetch wrapper with HTTPS enforcement and timeout
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise} Fetch promise
 */
export async function secureFetch (url, options = {}) {
  // Validate HTTPS in production
  validateHttpsUrl(url, 'API Request')

  // Add security headers
  const secureOptions = {
    ...options,
    headers: {
      ...getApiHeaders(),
      ...options.headers,
    },
  }

  // Add timeout to prevent hanging requests
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30_000) // 30 second timeout

  try {
    const response = await fetch(url, {
      ...secureOptions,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      throw new Error('Request timeout after 30 seconds')
    }

    throw error
  }
}
