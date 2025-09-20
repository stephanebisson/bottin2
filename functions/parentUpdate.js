const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const functions = require('firebase-functions/v1')
const { FUNCTIONS_REGION } = require('./config')

// Get Firestore instance
const db = admin.firestore()

/**
 * Validate update token and return parent information
 */
exports.validateUpdateToken = functions.region(FUNCTIONS_REGION).https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).send()
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Use POST.',
    })
  }

  try {
    const { token } = req.body

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        valid: false,
        error: 'Token is required and must be a string.',
      })
    }

    // Find parent with this token
    const parentsQuery = await db.collection('parents')
      .where('updateToken', '==', token)
      .limit(1)
      .get()

    if (parentsQuery.empty) {
      return res.status(404).json({
        valid: false,
        error: 'Invalid or expired token.',
      })
    }

    const parentDoc = parentsQuery.docs[0]
    const parentData = parentDoc.data()

    // Check if token has expired
    if (parentData.tokenExpiry && parentData.tokenExpiry.toDate() < new Date()) {
      return res.status(410).json({
        valid: false,
        error: 'Token has expired.',
      })
    }

    // Check if there's another parent with the same address (for shared address feature)
    let otherParentHasAddress = false
    if (parentData.parent1_email || parentData.parent2_email) {
      const otherParentEmail = parentData.parent1_email === parentData.email
        ? parentData.parent2_email
        : parentData.parent1_email

      if (otherParentEmail) {
        const otherParentQuery = await db.collection('parents')
          .where('email', '==', otherParentEmail)
          .limit(1)
          .get()

        if (!otherParentQuery.empty) {
          const otherParentData = otherParentQuery.docs[0].data()
          otherParentHasAddress = !!(otherParentData.address || otherParentData.city)
        }
      }
    }

    // Get available committees
    const committeesSnapshot = await db.collection('committees').get()
    const committees = []
    for (const doc of committeesSnapshot) {
      committees.push({
        id: doc.id,
        ...doc.data(),
      })
    }

    res.status(200).json({
      valid: true,
      parent: {
        id: parentDoc.id,
        email: parentData.email,
        first_name: parentData.first_name || '',
        last_name: parentData.last_name || '',
        phone1: parentData.phone1 || '',
        phone2: parentData.phone2 || '',
        address: parentData.address || '',
        city: parentData.city || '',
        postal_code: parentData.postal_code || '',
        committees: parentData.committees || [],
        interests: parentData.interests || '',
        directoryOptOut: parentData.directoryOptOut || false,
      },
      otherParentHasAddress,
      availableCommittees: committees,
    })
  } catch (error) {
    console.error('Validate token error:', error)
    res.status(500).json({
      valid: false,
      error: 'Internal server error occurred during token validation.',
    })
  }
})

/**
 * Process parent information update from the public form
 */
exports.processParentUpdate = functions.region(FUNCTIONS_REGION).https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).send()
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Use POST.',
    })
  }

  try {
    const { token, parentData } = req.body

    if (!token || !parentData) {
      return res.status(400).json({
        error: 'Token and parent data are required',
      })
    }

    // Find parent with this token
    const parentsQuery = await db.collection('parents')
      .where('updateToken', '==', token)
      .limit(1)
      .get()

    if (parentsQuery.empty) {
      return res.status(404).json({
        error: 'Invalid or expired token.',
      })
    }

    const parentDoc = parentsQuery.docs[0]
    const existingParentData = parentDoc.data()

    // Check if token has expired
    if (existingParentData.tokenExpiry && existingParentData.tokenExpiry.toDate() < new Date()) {
      return res.status(410).json({
        error: 'Token has expired.',
      })
    }

    // Additional security: Check if form was already submitted recently (prevent duplicate submissions)
    if (existingParentData.lastUpdated) {
      const lastUpdate = existingParentData.lastUpdated.toDate()
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000) // 1 minute cooldown

      if (lastUpdate > oneMinuteAgo) {
        return res.status(429).json({
          error: 'Form was recently submitted. Please wait before submitting again.',
        })
      }
    }

    const batch = db.batch()
    const parentRef = db.collection('parents').doc(parentDoc.id)

    // Prepare updated data
    const updatedData = {
      first_name: parentData.first_name || existingParentData.first_name,
      last_name: parentData.last_name || existingParentData.last_name,
      phone1: parentData.phone1 || '',
      phone2: parentData.phone2 || '',
      committees: parentData.committees || [],
      interests: parentData.interests || '',
      directoryOptOut: parentData.directoryOptOut || false,
      lastUpdated: FieldValue.serverTimestamp(),
    }

    // Handle address logic
    if (parentData.sameAddressAsOther) {
      // Find the other parent and copy their address
      const otherParentEmail = existingParentData.parent1_email === existingParentData.email
        ? existingParentData.parent2_email
        : existingParentData.parent1_email

      if (otherParentEmail) {
        const otherParentQuery = await db.collection('parents')
          .where('email', '==', otherParentEmail)
          .limit(1)
          .get()

        if (!otherParentQuery.empty) {
          const otherParentData = otherParentQuery.docs[0].data()
          updatedData.address = otherParentData.address || ''
          updatedData.city = otherParentData.city || ''
          updatedData.postal_code = otherParentData.postal_code || ''
        }
      }
    } else {
      // Use provided address data
      updatedData.address = parentData.address || ''
      updatedData.city = parentData.city || ''
      updatedData.postal_code = parentData.postal_code || ''
    }

    // Update parent document
    batch.update(parentRef, updatedData)

    // Find the current active workflow and update participation
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()
    const schoolYear = currentMonth >= 8
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`

    const workflowId = `${schoolYear.split('-')[0]}-annual-update`
    const workflowRef = db.collection('updateSessions').doc(workflowId)
    const workflowDoc = await workflowRef.get()

    if (workflowDoc.exists) {
      const participantPath = `participants.${existingParentData.email}`
      batch.update(workflowRef, {
        [`${participantPath}.formSubmitted`]: true,
        [`${participantPath}.submittedAt`]: FieldValue.serverTimestamp(),
        [`${participantPath}.optedOut`]: parentData.directoryOptOut || false,
        'stats.formsSubmitted': FieldValue.increment(1),
      })

      if (parentData.directoryOptOut) {
        batch.update(workflowRef, {
          'stats.optedOut': FieldValue.increment(1),
        })
      }
    }

    // Check if user already has an account
    let hasAccount = false
    try {
      await admin.auth().getUserByEmail(existingParentData.email)
      hasAccount = true
    } catch {
      // User doesn't exist, which is fine
      hasAccount = false
    }

    // Commit all updates
    await batch.commit()

    console.log(`Parent information updated successfully for ${existingParentData.email}`)

    res.status(200).json({
      success: true,
      message: 'Parent information updated successfully',
      hasAccount,
    })
  } catch (error) {
    console.error('Process parent update error:', error)
    res.status(500).json({
      error: 'Internal server error occurred while processing update',
    })
  }
})
