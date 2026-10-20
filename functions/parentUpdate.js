const { getAuth } = require('firebase-admin/auth')
const { FieldValue, getFirestore } = require('firebase-admin/firestore')
const logger = require('firebase-functions/logger')
const { onRequest } = require('firebase-functions/v2/https')
const { getAccountStatus } = require('./accounts')
const { FUNCTIONS_REGION } = require('./config')
const { applySecurity } = require('./middleware/security')
const { validateFunctionData } = require('./middleware/validation')
const { tokenValidationSchema, parentUpdateSchema, parentOptOutSchema } = require('./validators/schemas')

// Get Firestore instance
const db = getFirestore()

/**
 * Log a parent update form failure. All failures share the parent_update_error
 * message so they can be found together in Cloud Logging.
 */
function logUpdateFailure (endpoint, reason, token, details = {}) {
  const log = reason === 'server_error' ? logger.error : logger.warn
  log('parent_update_error', {
    endpoint,
    reason,
    token: typeof token === 'string' ? `${token.slice(0, 8)}...` : null,
    ...details,
  })
}

/**
 * Find the parent a request is for: the signed-in parent when the request has
 * an `Authorization: Bearer <Firebase ID token>` header (profile edit page),
 * otherwise the parent the emailed update token belongs to.
 *
 * @returns {Promise<{ parentDoc: object|null, status?: number, reason?: string }>}
 */
async function resolveParent (req, token) {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(authHeader.split('Bearer ', 2)[1])
    } catch {
      return { parentDoc: null, status: 401, reason: 'invalid_id_token' }
    }
    if (!decodedToken.email || !decodedToken.email_verified) {
      return { parentDoc: null, status: 403, reason: 'email_not_verified' }
    }
    const snapshot = await db.collection('parents')
      .where('email', '==', decodedToken.email.toLowerCase())
      .limit(1)
      .get()
    return snapshot.empty
      ? { parentDoc: null, status: 404, reason: 'parent_not_found' }
      : { parentDoc: snapshot.docs[0] }
  }

  if (!token) {
    return { parentDoc: null, status: 400, reason: 'missing_token' }
  }

  // Direct O(1) token lookup — token is the document ID
  const tokenDoc = await db.collection('tokens').doc(token).get()
  if (!tokenDoc.exists) {
    return { parentDoc: null, status: 404, reason: 'token_not_found' }
  }

  const parentDoc = await db.collection('parents').doc(tokenDoc.data().parentId).get()
  return parentDoc.exists
    ? { parentDoc }
    : { parentDoc: null, status: 404, reason: 'parent_not_found' }
}

/**
 * Return the parent's current information for the update form,
 * from an emailed update token or the signed-in parent's ID token
 */
exports.validateUpdateTokenV2 = onRequest({
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
    enableRateLimit: true,
    rateLimitOptions: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 requests per minute for token validation
  })(req, res)
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Use POST.',
    })
  }

  try {
    console.log('=== validateUpdateTokenV2 ===')
    console.log('Token validation request received')

    // Validate and sanitize input
    const validatedData = validateFunctionData(
      tokenValidationSchema,
      req.body,
      'validateUpdateTokenV2',
    )

    const { token } = validatedData

    const { parentDoc, status, reason } = await resolveParent(req, token)

    if (!parentDoc) {
      logUpdateFailure('validateUpdateTokenV2', reason, token)
      return res.status(status).json({ valid: false, error: 'Invalid or expired token.' })
    }

    const parentData = parentDoc.data()
    console.log('✓ Token validation successful')

    // Check if there's another parent with the same address (for shared address feature)
    let otherParentHasAddress = false
    let otherParentInfo = null

    // Find students that belong to this parent (using parent document ID)
    const parentId = parentDoc.id
    const studentsSnapshot = await db.collection('students')
      .where('parent1_id', '==', parentId)
      .get()

    const studentsSnapshot2 = await db.collection('students')
      .where('parent2_id', '==', parentId)
      .get()

    // Combine results and find other parent IDs
    const allStudents = [...studentsSnapshot.docs, ...studentsSnapshot2.docs]
    const otherParentIds = new Set()

    for (const studentDoc of allStudents) {
      const student = studentDoc.data()
      if (student.parent1_id && student.parent1_id !== parentId) {
        otherParentIds.add(student.parent1_id)
      }
      if (student.parent2_id && student.parent2_id !== parentId) {
        otherParentIds.add(student.parent2_id)
      }
    }

    // Check if there are other parents and get their info
    for (const otherParentId of otherParentIds) {
      const otherParentDoc = await db.collection('parents').doc(otherParentId).get()

      if (otherParentDoc.exists) {
        const otherParentData = otherParentDoc.data()
        // Show checkbox for any other parent, regardless of whether they have address info
        otherParentHasAddress = true
        otherParentInfo = {
          email: otherParentData.email,
          fullName: `${otherParentData.first_name || ''} ${otherParentData.last_name || ''}`.trim(),
        }
        break // Take the first other parent found
      }
    }

    res.status(200).json({
      valid: true,
      parent: {
        id: parentDoc.id,
        email: parentData.email,
        first_name: parentData.first_name || '',
        last_name: parentData.last_name || '',
        phone: parentData.phone || '',
        address: parentData.address || '',
        city: parentData.city || '',
        postal_code: parentData.postal_code || '',
        // Backward compatibility: parse string interests (legacy format) to array
        interests: Array.isArray(parentData.interests)
          ? parentData.interests
          : (typeof parentData.interests === 'string' && parentData.interests
              ? parentData.interests.split(', ').filter(i => i.trim() !== '')
              : []),
        optedOut: parentData.optedOut || false,
      },
      otherParentHasAddress,
      otherParentInfo,
    })
  } catch (error) {
    // Handle validation errors
    if (error.code === 'invalid-argument') {
      logUpdateFailure('validateUpdateTokenV2', 'invalid_input', req.body?.token, { error: error.message })
      return res.status(400).json({
        valid: false,
        error: error.message,
        details: error.details,
      })
    }

    logUpdateFailure('validateUpdateTokenV2', 'server_error', req.body?.token, { error: error.message, stack: error.stack })
    res.status(500).json({
      valid: false,
      error: 'Internal server error occurred during token validation.',
    })
  }
})

/**
 * Save the parent update form (emailed link or profile edit page)
 */
exports.processParentUpdateV2 = onRequest({
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
    enableRateLimit: true,
    rateLimitOptions: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests per minute for updates
  })(req, res)
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Use POST.',
    })
  }

  try {
    // Validate and sanitize input
    const validatedData = validateFunctionData(
      parentUpdateSchema,
      req.body,
      'processParentUpdateV2',
    )

    const { token, parentData } = validatedData

    const { parentDoc, status, reason } = await resolveParent(req, token)

    if (!parentDoc) {
      logUpdateFailure('processParentUpdateV2', reason, token)
      return res.status(status).json({ error: 'Invalid or expired token.' })
    }

    const existingParentData = parentDoc.data()

    const batch = db.batch()
    const parentRef = db.collection('parents').doc(parentDoc.id)

    // Prepare updated data
    // If parent was previously opted out, re-opt them in by clearing the optedOut flag
    const updatedData = {
      first_name: parentData.first_name || existingParentData.first_name,
      last_name: parentData.last_name || existingParentData.last_name,
      phone: parentData.phone || '',
      interests: Array.isArray(parentData.interests)
        ? parentData.interests
        : [],
      optedOut: false, // Re-opt in if they were previously opted out
      lastUpdated: FieldValue.serverTimestamp(),
      address: parentData.address || '', city: parentData.city || '', postal_code: parentData.postal_code || '' }

    // Always use the provided address data

    // If user confirms other parent lives at the same address, mark other parent as confirmed
    if (parentData.sameAddressAsOther) {
      // Find students that belong to this parent to get other parent IDs
      const currentParentId = parentDoc.id
      const studentsSnapshot1 = await db.collection('students')
        .where('parent1_id', '==', currentParentId)
        .get()

      const studentsSnapshot2 = await db.collection('students')
        .where('parent2_id', '==', currentParentId)
        .get()

      const allStudents = [...studentsSnapshot1.docs, ...studentsSnapshot2.docs]
      let confirmedParentId = null

      // Find other parent IDs
      for (const studentDoc of allStudents) {
        const student = studentDoc.data()
        const otherIds = []

        if (student.parent1_id && student.parent1_id !== currentParentId) {
          otherIds.push(student.parent1_id)
        }
        if (student.parent2_id && student.parent2_id !== currentParentId) {
          otherIds.push(student.parent2_id)
        }

        // Find the first other parent (the one we're confirming)
        if (otherIds.length > 0) {
          confirmedParentId = otherIds[0]
          break
        }
      }

      // Mark the other parent's address as confirmed by updating their workflow participant record
      if (confirmedParentId) {
        const otherParentRef = db.collection('parents').doc(confirmedParentId)
        batch.update(otherParentRef, {
          address: updatedData.address,
          city: updatedData.city,
          postal_code: updatedData.postal_code,
          lastUpdated: FieldValue.serverTimestamp(),
        })
      }
    }

    // Update parent document
    batch.update(parentRef, updatedData)

    // Online directory account status, for the confirmation page
    const accountStatus = await getAccountStatus(existingParentData.email)

    // Commit all updates
    await batch.commit()

    console.log(`Parent information updated successfully for ${existingParentData.email}`)

    res.status(200).json({
      success: true,
      message: 'Parent information updated successfully',
      accountStatus,
    })
  } catch (error) {
    // Handle validation errors
    if (error.code === 'invalid-argument') {
      logUpdateFailure('processParentUpdateV2', 'invalid_input', req.body?.token, { error: error.message })
      return res.status(400).json({
        error: error.message,
        details: error.details,
      })
    }

    logUpdateFailure('processParentUpdateV2', 'server_error', req.body?.token, { error: error.message, stack: error.stack })
    res.status(500).json({
      error: 'Internal server error occurred while processing update',
    })
  }
})

/**
 * Process parent opt-out request - removes all personal data except name and email
 */
exports.processParentOptOutV2 = onRequest({
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
    enableRateLimit: true,
    rateLimitOptions: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 requests per minute for opt-out
  })(req, res)
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Use POST.',
    })
  }

  try {
    console.log('Processing parent opt-out request')

    // Validate and sanitize input
    const validatedData = validateFunctionData(
      parentOptOutSchema,
      req.body,
      'processParentOptOutV2',
    )

    const { token } = validatedData

    const { parentDoc, status, reason } = await resolveParent(req, token)

    if (!parentDoc) {
      logUpdateFailure('processParentOptOutV2', reason, token)
      return res.status(status).json({ error: 'Invalid or expired token.' })
    }

    const existingParentData = parentDoc.data()

    const batch = db.batch()
    const parentRef = db.collection('parents').doc(parentDoc.id)
    const parentEmail = existingParentData.email

    // Prepare minimal data - keep only essential fields
    const optedOutData = {
      email: existingParentData.email,
      first_name: existingParentData.first_name || '',
      last_name: existingParentData.last_name || '',
      // Clear all other fields
      phone: '',
      address: '',
      city: '',
      postal_code: '',
      interests: [],
      optedOut: true,
      lastUpdated: FieldValue.serverTimestamp(),
    }

    // Update parent document with minimal data
    batch.set(parentRef, optedOutData)

    // Remove from ALL committee memberships (from subcollections)
    const committeesSnapshot = await db.collection('committees').get()
    for (const committeeDoc of committeesSnapshot.docs) {
      const committeeData = committeeDoc.data()
      const memberRef = committeeDoc.ref.collection('members').doc(parentDoc.id)
      const memberDoc = await memberRef.get()

      if (memberDoc.exists) {
        batch.delete(memberRef)
        console.log(`Removed parent ${parentDoc.id} from committee: ${committeeData.name}`)
      }
    }

    // Online directory account status, for the confirmation page
    const accountStatus = await getAccountStatus(parentEmail)

    // Commit all changes
    await batch.commit()

    console.log(`Parent ${parentEmail} successfully opted out - all data cleared except name and email`)

    res.status(200).json({
      success: true,
      message: 'Successfully opted out and removed personal information',
      accountStatus,
    })
  } catch (error) {
    // Handle validation errors
    if (error.code === 'invalid-argument') {
      logUpdateFailure('processParentOptOutV2', 'invalid_input', req.body?.token, { error: error.message })
      return res.status(400).json({
        error: error.message,
        details: error.details,
      })
    }

    logUpdateFailure('processParentOptOutV2', 'server_error', req.body?.token, { error: error.message, stack: error.stack })
    res.status(500).json({
      error: 'Internal server error occurred while processing opt-out',
    })
  }
})
