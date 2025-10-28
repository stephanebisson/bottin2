/**
 * Frontend security configuration and HTTPS enforcement
 * Ensures all API calls use HTTPS in production
 */

/**
 * Validates that API base URLs use HTTPS in production
 * @param {string} url - The API URL to validate
 * @param {string} name - Name of the API for error messages
 */
function validateHttpsUrl (url, name = 'API') {
  if (import.meta.env.PROD && !url.startsWith('https://')) {
    throw new Error(`${name} must use HTTPS in production. Current URL: ${url}`)
  }
}

/**
 * Gets the Firebase Functions base URL with HTTPS enforcement
 * @returns {string} The validated base URL
 */
export function getFunctionsBaseUrl () {
  const baseUrl = import.meta.env.PROD
    ? 'https://northamerica-northeast1-bottin2-3b41d.cloudfunctions.net'
    : 'http://localhost:5001/bottin2-3b41d/us-central1'

  validateHttpsUrl(baseUrl, 'Firebase Functions')
  return baseUrl
}

/**
 * Security headers for fetch requests
 */
export function getSecurityHeaders () {
  return {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
    // Add CSRF protection header if needed
    'X-Client-Version': '1.0.0',
  }
}

/**
 * Secure fetch wrapper that enforces HTTPS and adds security headers
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise} Fetch promise
 */
export async function secureFetch (url, options = {}) {
  // Validate HTTPS in production
  if (import.meta.env.PROD && !url.startsWith('https://')) {
    throw new Error(`All requests must use HTTPS in production. URL: ${url}`)
  }

  // Add security headers
  const secureOptions = {
    ...options,
    headers: {
      ...getSecurityHeaders(),
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

    // Validate response
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response
  } catch (error) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      throw new Error('Request timeout after 30 seconds')
    }

    throw error
  }
}

/**
 * Content Security Policy configuration for the app
 */
export function getCSPConfig () {
  const isDev = import.meta.env.DEV

  return {
    'default-src': ['\'self\''],
    'script-src': [
      '\'self\'',
      isDev ? '\'unsafe-eval\'' : '', // Allow eval in development for HMR
      '\'unsafe-inline\'', // Required for Vue.js
      'https://www.googletagmanager.com', // Google Analytics
    ].filter(Boolean),
    'style-src': [
      '\'self\'',
      '\'unsafe-inline\'', // Required for Vuetify and component styles
      'https://fonts.googleapis.com',
    ],
    'font-src': [
      '\'self\'',
      'https://fonts.gstatic.com',
      'data:',
    ],
    'img-src': [
      '\'self\'',
      'data:',
      'https:',
    ],
    'connect-src': [
      '\'self\'',
      isDev ? 'ws://localhost:*' : '', // WebSocket for HMR in dev
      isDev ? 'http://localhost:*' : '', // Dev server
      'https://northamerica-northeast1-bottin2-3b41d.cloudfunctions.net', // Firebase Functions
      'https://firebaseapp.com',
      'https://*.googleapis.com', // All Google APIs including Firebase services
      'https://www.google-analytics.com', // Google Analytics data collection
    ].filter(Boolean),
    'base-uri': ['\'self\''],
    'form-action': ['\'self\''],
  }
}

/**
 * Validates environment configuration for security
 */
export function validateSecurityConfig () {
  const errors = []

  // Check Firebase configuration
  const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
  ]

  for (const varName of requiredEnvVars) {
    if (!import.meta.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`)
    }
  }

  // Validate Firebase URLs use HTTPS in production
  if (import.meta.env.PROD) {
    const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
    if (authDomain && !authDomain.includes('firebaseapp.com') && !authDomain.startsWith('https://')) {
      errors.push('Firebase Auth Domain must use HTTPS in production')
    }
  }

  if (errors.length > 0) {
    console.error('Security configuration errors:', errors)
    throw new Error(`Security validation failed: ${errors.join(', ')}`)
  }

  console.log('✅ Security configuration validated')
}

/**
 * Initialize security configuration
 */
export function initSecurity () {
  try {
    validateSecurityConfig()

    // Set up CSP if supported
    if (typeof document !== 'undefined' && document.querySelector) {
      const cspConfig = getCSPConfig()
      const cspString = Object.entries(cspConfig)
        .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
        .join('; ')

      // Create or update CSP meta tag
      let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
      if (!cspMeta) {
        cspMeta = document.createElement('meta')
        cspMeta.setAttribute('http-equiv', 'Content-Security-Policy')
        document.head.append(cspMeta)
      }
      cspMeta.setAttribute('content', cspString)

      console.log('✅ Content Security Policy configured')
    }
  } catch (error) {
    console.error('Security initialization failed:', error)
    if (import.meta.env.PROD) {
      throw error // Fail hard in production
    }
  }
}
