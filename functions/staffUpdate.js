const crypto = require('node:crypto')
const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const { onRequest } = require('firebase-functions/v2/https')
const { FUNCTIONS_REGION } = require('./config')

// Get Firestore instance
const db = admin.firestore()

/**
 * Generate secure random token for staff update link
 */
function generateUpdateToken () {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Get the staff update workflow document ID for the current year
 */
function getStaffUpdateWorkflowId () {
  const currentYear = new Date().getFullYear()
  return `staff_update_${currentYear}`
}

/**
 * Generate staff update token and store in workflows collection
 * Document ID: staff_update_2025 (or current year)
 */
exports.generateStaffUpdateToken = onRequest({
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
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Use POST.',
    })
  }

  try {
    console.log('=== generateStaffUpdateToken called ===')

    // Verify user is authenticated and is admin
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' })
    }

    const idToken = authHeader.split('Bearer ')[1]
    let decodedToken

    try {
      decodedToken = await admin.auth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    // Verify admin claim
    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { adminEmail } = req.body

    if (!adminEmail) {
      return res.status(400).json({
        error: 'Admin email is required',
      })
    }

    // Generate token
    const token = generateUpdateToken()
    const workflowId = getStaffUpdateWorkflowId()

    // Create or update the staff update workflow document
    const workflowRef = db.collection('workflows').doc(workflowId)

    await workflowRef.set({
      id: workflowId,
      type: 'staff_update',
      token,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: adminEmail,
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.log(`Generated staff update token for workflow ${workflowId}`)

    res.status(200).json({
      message: 'Staff update token generated successfully',
      workflowId,
      token,
      createdAt: new Date().toISOString(),
      createdBy: adminEmail,
    })
  } catch (error_) {
    console.error('Failed to generate staff update token:', error_)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
})

/**
 * Get staff update token from workflows collection
 */
exports.getStaffUpdateToken = onRequest({
  region: FUNCTIONS_REGION,
  cors: {
    origin: [
      'https://bottin-etoile-filante.org',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
}, async (req, res) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed. Use GET.',
    })
  }

  try {
    // Verify user is authenticated and is admin
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' })
    }

    const idToken = authHeader.split('Bearer ')[1]
    let decodedToken

    try {
      decodedToken = await admin.auth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    // Verify admin claim
    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const workflowId = getStaffUpdateWorkflowId()
    const workflowDoc = await db.collection('workflows').doc(workflowId).get()

    if (!workflowDoc.exists) {
      return res.status(404).json({
        error: 'Staff update token not found',
      })
    }

    const data = workflowDoc.data()

    res.status(200).json({
      workflowId,
      token: data.token,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      createdBy: data.createdBy,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    })
  } catch (error) {
    console.error('Get staff update token error:', error)
    res.status(500).json({
      error: 'Internal server error occurred while getting token',
    })
  }
})

/**
 * Validate staff update token
 * This endpoint is accessible without authentication (public)
 */
exports.validateStaffUpdateToken = onRequest({
  region: FUNCTIONS_REGION,
  cors: {
    origin: [
      'https://bottin-etoile-filante.org',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Use POST.',
    })
  }

  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        valid: false,
        error: 'Token is required',
      })
    }

    console.log('Validating staff update token...')

    // Get the current year's staff update workflow
    const workflowId = getStaffUpdateWorkflowId()
    const workflowDoc = await db.collection('workflows').doc(workflowId).get()

    if (!workflowDoc.exists) {
      console.log('Staff update workflow not found')
      return res.status(404).json({
        valid: false,
        error: 'Staff update link not found or expired',
      })
    }

    const workflowData = workflowDoc.data()

    // Verify token matches
    if (workflowData.token !== token) {
      console.log('Invalid token provided')
      return res.status(404).json({
        valid: false,
        error: 'Invalid staff update link',
      })
    }

    console.log('Token validated successfully')

    res.status(200).json({
      valid: true,
    })
  } catch (error_) {
    console.error('Validate staff update token error:', error_)
    res.status(500).json({
      valid: false,
      error: 'Internal server error occurred while validating token',
    })
  }
})

/**
 * Get all staff with token validation
 * This endpoint is accessible without authentication (public with valid token)
 */
exports.getStaffWithToken = onRequest({
  region: FUNCTIONS_REGION,
  cors: {
    origin: [
      'https://bottin-etoile-filante.org',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Token is required' })
    }

    // Validate token
    const workflowId = getStaffUpdateWorkflowId()
    const workflowDoc = await db.collection('workflows').doc(workflowId).get()

    if (!workflowDoc.exists || workflowDoc.data().token !== token) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Get all staff
    const staffSnapshot = await db.collection('staff').get()
    const staff = []

    for (const doc of staffSnapshot.docs) {
      staff.push({
        id: doc.id,
        ...doc.data(),
      })
    }

    res.status(200).json({ staff })
  } catch (error_) {
    console.error('Get staff with token error:', error_)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Update staff with token validation
 * This endpoint is accessible without authentication (public with valid token)
 */
exports.updateStaffWithToken = onRequest({
  region: FUNCTIONS_REGION,
  cors: {
    origin: [
      'https://bottin-etoile-filante.org',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    const { token, updates, deletions } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Token is required' })
    }

    // Validate token
    const workflowId = getStaffUpdateWorkflowId()
    const workflowDoc = await db.collection('workflows').doc(workflowId).get()

    if (!workflowDoc.exists || workflowDoc.data().token !== token) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const batch = db.batch()

    // Process deletions
    if (deletions && Array.isArray(deletions)) {
      for (const id of deletions) {
        const staffRef = db.collection('staff').doc(id)
        batch.delete(staffRef)
      }
    }

    // Process updates (both updates and creates)
    if (updates && Array.isArray(updates)) {
      for (const item of updates) {
        if (item.id && !item.id.startsWith('new_')) {
          // Update existing
          const staffRef = db.collection('staff').doc(item.id)
          batch.update(staffRef, {
            first_name: item.first_name || '',
            last_name: item.last_name || '',
            email: item.email || '',
            phone: item.phone || '',
            title: item.title || '',
            ce_role: item.ce_role || '',
            group: item.group || '',
            subgroup: item.subgroup || '',
            order: item.order || 99,
            updatedAt: FieldValue.serverTimestamp(),
          })
        } else {
          // Create new
          const newStaffRef = db.collection('staff').doc()
          batch.set(newStaffRef, {
            first_name: item.first_name || '',
            last_name: item.last_name || '',
            email: item.email || '',
            phone: item.phone || '',
            title: item.title || '',
            ce_role: item.ce_role || '',
            group: item.group || '',
            subgroup: item.subgroup || '',
            order: item.order || 99,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          })
        }
      }
    }

    await batch.commit()

    res.status(200).json({ success: true, message: 'Staff updated successfully' })
  } catch (error_) {
    console.error('Update staff with token error:', error_)
    res.status(500).json({ error: 'Internal server error' })
  }
})
