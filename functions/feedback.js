const { FieldValue, getFirestore } = require('firebase-admin/firestore')
const { onRequest } = require('firebase-functions/v2/https')
const { findSignedInParent } = require('./accounts')
const { FUNCTIONS_REGION } = require('./config')
const { applySecurity } = require('./middleware/security')
const { validateFunctionData } = require('./middleware/validation')
const { feedbackSchema } = require('./validators/schemas')

// Get Firestore instance
const db = getFirestore()

/**
 * Save a feedback message from the signed-in parent. The client sends only the
 * text: the sender, status and dates are set here so they can't be forged.
 * Clients can't create feedback directly (firestore.rules).
 */
exports.submitFeedback = onRequest({
  region: FUNCTIONS_REGION,
  cors: {
    origin: [
      'https://bottin-etoile-filante.org',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
}, async (req, res) => {
  // Apply security headers
  applySecurity({
    useApiHeaders: true,
  })(req, res)
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' })
    }

    // Validate input: only the message is kept, anything else is dropped
    const { message } = validateFunctionData(feedbackSchema, req.body, 'submitFeedback')

    const { parentDoc, uid, status, reason } = await findSignedInParent(authHeader)
    if (!parentDoc) {
      console.warn(`Feedback rejected: ${reason}`)
      return res.status(status).json({ error: 'Only signed-in parents can send feedback.' })
    }

    const feedbackRef = await db.collection('feedback').add({
      parent_id: parentDoc.id,
      message,
      status: 'pending',
      admin_notes: '',
      // Account that sent it, so every message can be traced
      uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return res.status(200).json({ success: true, id: feedbackRef.id })
  } catch (error) {
    // Handle validation errors
    if (error.code === 'invalid-argument') {
      return res.status(400).json({
        error: error.message,
        details: error.details,
      })
    }

    console.error('Submit feedback error:', error)
    return res.status(500).json({ error: 'Internal server error occurred while saving feedback.' })
  }
})
