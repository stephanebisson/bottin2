const admin = require('firebase-admin')
const { onRequest } = require('firebase-functions/v2/https')
const { FUNCTIONS_REGION } = require('./config')
const { applySecurity } = require('./middleware/security')
const { validateFunctionData } = require('./middleware/validation')
const { emailValidationSchema } = require('./validators/schemas')

// Get Firestore instance
const db = admin.firestore()

/**
 * Retry helper for Firestore queries with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of the function
 */
async function retryFirestoreQuery(fn, maxRetries = 3, baseDelay = 500) {
  let lastError

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now()
      const result = await fn()
      const duration = Date.now() - startTime

      if (attempt > 1) {
        console.log(`Query succeeded on attempt ${attempt} (${duration}ms)`)
      }

      return result
    } catch (error) {
      lastError = error
      console.warn(`Query attempt ${attempt} failed (${error.message})`)

      if (attempt === maxRetries) {
        throw lastError
      }

      // Exponential backoff: 500ms, 1s, 2s
      const delay = baseDelay * Math.pow(2, attempt - 1)
      console.log(`Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

/**
 * Get privacy-safe email domain for logging (doesn't expose full email)
 * @param {string} email - Email address
 * @returns {string} Domain part only
 */
function getEmailDomain(email) {
  const parts = email.split('@')
  return parts.length === 2 ? parts[1] : 'unknown'
}

/**
 * Validates if an email address is authorized to create an account
 * Only emails that exist in the parents or staff collections can register
 */
exports.validateEmailV2 = onRequest({
  region: FUNCTIONS_REGION,
  cors: {
    origin: [
      'https://bottin-etoile-filante.org',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
}, async (req, res) => {
  // Apply security headers
  applySecurity({
    useApiHeaders: true,
    enableRateLimit: true,
    rateLimitOptions: { maxRequests: 30, windowMs: 60 * 1000 },
  })(req, res)
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      authorized: false,
      error: 'Method not allowed. Use POST.',
    })
  }

  const requestStartTime = Date.now()

  try {
    // Validate and sanitize input
    const validatedData = validateFunctionData(
      emailValidationSchema,
      req.body,
      'validateEmailV2',
    )

    const { email } = validatedData
    const normalizedEmail = email.toLowerCase().trim()
    const emailDomain = getEmailDomain(normalizedEmail)
    console.log(`Email validation request processed (V2) - domain: ${emailDomain}`)

    // Check if email exists in parents collection with retry logic
    let parentsQuery
    try {
      parentsQuery = await retryFirestoreQuery(async () => {
        return await db.collection('parents')
          .where('email', '==', normalizedEmail)
          .limit(1)
          .get()
      })
    } catch (queryError) {
      // Query failed after retries - return 503 to indicate transient error
      const totalDuration = Date.now() - requestStartTime
      console.error(`Firestore query failed after retries (${totalDuration}ms):`, queryError.message)

      return res.status(503).json({
        authorized: false,
        error: 'Database query failed. Please try again in a moment.',
        retryable: true,
      })
    }

    const totalDuration = Date.now() - requestStartTime

    if (!parentsQuery.empty) {
      const parentDoc = parentsQuery.docs[0]
      const parentData = parentDoc.data()
      console.log(`Email validated successfully (${totalDuration}ms) - domain: ${emailDomain}`)

      return res.status(200).json({
        authorized: true,
        displayName: parentData.first_name || '',
        userType: 'parent',
        message: 'Email found in parents collection.',
      })
    }

    // Email not found in parents collection - only parents can create accounts
    console.log(`Email not found (${totalDuration}ms) - domain: ${emailDomain}`)
    return res.status(200).json({
      authorized: false,
      message: 'Email not found in parents collection. Only parents can create accounts.',
    })
  } catch (error) {
    const totalDuration = Date.now() - requestStartTime

    // Handle validation errors
    if (error.code === 'invalid-argument') {
      console.warn(`Validation error (${totalDuration}ms):`, error.message)
      return res.status(400).json({
        authorized: false,
        error: error.message,
        details: error.details,
      })
    }

    console.error(`Email validation error (${totalDuration}ms):`, error)
    return res.status(500).json({
      authorized: false,
      error: 'Internal server error occurred during validation.',
    })
  }
})
