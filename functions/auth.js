const admin = require('firebase-admin')
const functions = require('firebase-functions/v1')
const { onRequest } = require('firebase-functions/v2/https')
const { FUNCTIONS_REGION } = require('./config')
const { applySecurity } = require('./middleware/security')
const { validateFunctionData } = require('./middleware/validation')
const { emailValidationSchema } = require('./validators/schemas')

// Get Firestore instance
const db = admin.firestore()

/**
 * Validates if an email address is authorized to create an account
 * Only emails that exist in the parents or staff collections can register
 */
exports.validateEmail = functions.region(FUNCTIONS_REGION).https.onRequest(async (req, res) => {
  // Apply security headers and validation
  const allowedOrigins = [
    'https://bottin-etoile-filante.org',
    'http://localhost:3000',
    'http://localhost:5173',
  ]

  applySecurity({
    useApiHeaders: true,
    allowedOrigins,
    enableRateLimit: true,
    rateLimitOptions: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests per minute
  })(req, res)

  // Set CORS headers
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin)
  }

  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  res.set('Access-Control-Allow-Credentials', 'true')

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).send()
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      authorized: false,
      error: 'Method not allowed. Use POST.',
    })
  }

  try {
    // Validate and sanitize input
    const validatedData = validateFunctionData(
      emailValidationSchema,
      req.body,
      'validateEmail',
    )

    const { email } = validatedData
    const normalizedEmail = email.toLowerCase().trim()
    console.log('Email validation request processed (V1)')

    // Check if email exists in parents collection
    const parentsQuery = await db.collection('parents')
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get()

    if (!parentsQuery.empty) {
      const parentDoc = parentsQuery.docs[0]
      const parentData = parentDoc.data()
      return res.status(200).json({
        authorized: true,
        displayName: parentData.first_name || '',
        userType: 'parent',
        message: 'Email found in parents collection.',
      })
    }

    // Check if email exists in staff collection
    const staffQuery = await db.collection('staff')
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get()

    if (!staffQuery.empty) {
      const staffDoc = staffQuery.docs[0]
      const staffData = staffDoc.data()
      return res.status(200).json({
        authorized: true,
        displayName: staffData.first_name || '',
        userType: 'staff',
        message: 'Email found in staff collection.',
      })
    }

    // Email not found in either collection
    return res.status(200).json({
      authorized: false,
      message: 'Email not found in authorized collections.',
    })
  } catch (error) {
    // Handle validation errors
    if (error.code === 'invalid-argument') {
      return res.status(400).json({
        authorized: false,
        error: error.message,
        details: error.details,
      })
    }

    console.error('Email validation error:', error)
    return res.status(500).json({
      authorized: false,
      error: 'Internal server error occurred during validation.',
    })
  }
})

/**
 * V2 version of validateEmail with built-in CORS support
 * This is a new function to avoid v1->v2 migration issues
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

  try {
    // Validate and sanitize input
    const validatedData = validateFunctionData(
      emailValidationSchema,
      req.body,
      'validateEmailV2',
    )

    const { email } = validatedData
    const normalizedEmail = email.toLowerCase().trim()
    console.log('Email validation request processed (V2)')

    // Check if email exists in parents collection
    const parentsQuery = await db.collection('parents')
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get()

    if (!parentsQuery.empty) {
      const parentDoc = parentsQuery.docs[0]
      const parentData = parentDoc.data()
      return res.status(200).json({
        authorized: true,
        displayName: parentData.first_name || '',
        userType: 'parent',
        message: 'Email found in parents collection.',
      })
    }

    // Check if email exists in staff collection
    const staffQuery = await db.collection('staff')
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get()

    if (!staffQuery.empty) {
      const staffDoc = staffQuery.docs[0]
      const staffData = staffDoc.data()
      return res.status(200).json({
        authorized: true,
        displayName: staffData.first_name || '',
        userType: 'staff',
        message: 'Email found in staff collection.',
      })
    }

    // Email not found in either collection
    return res.status(200).json({
      authorized: false,
      message: 'Email not found in authorized collections.',
    })
  } catch (error) {
    // Handle validation errors
    if (error.code === 'invalid-argument') {
      return res.status(400).json({
        authorized: false,
        error: error.message,
        details: error.details,
      })
    }

    console.error('Email validation error:', error)
    return res.status(500).json({
      authorized: false,
      error: 'Internal server error occurred during validation.',
    })
  }
})
