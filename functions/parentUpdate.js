const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const { onRequest } = require('firebase-functions/v2/https')
const { FUNCTIONS_REGION } = require('./config')
const { applySecurity } = require('./middleware/security')
const { validateFunctionData } = require('./middleware/validation')
const { tokenValidationSchema, parentUpdateSchema, parentOptOutSchema } = require('./validators/schemas')

// Get Firestore instance
const db = admin.firestore()

/**
 * Validate update token and return parent information
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
    allowedHeaders: ['Content-Type'],
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

    // Find the token in active workflows
    const activeWorkflowsSnapshot = await db.collection('workflows')
      .where('status', '==', 'active')
      .get()

    console.log(`Found ${activeWorkflowsSnapshot.size} active workflows`)

    if (activeWorkflowsSnapshot.empty) {
      console.log('✗ No active workflows found in database')
      return res.status(404).json({
        valid: false,
        error: 'No active workflows found.',
      })
    }

    let parentData = null
    let parentDoc = null
    let tokenFound = false

    // Search through active workflows for this token
    for (const workflowDoc of activeWorkflowsSnapshot.docs) {
      const workflow = workflowDoc.data()
      console.log(`Checking workflow ${workflowDoc.id}`)
      console.log('Workflow status:', workflow.status)

      // Search participants subcollection for the token
      const participantsSnapshot = await workflowDoc.ref.collection('participants').get()
      console.log(`Participant count: ${participantsSnapshot.size}`)

      // Check participant tokens without logging sensitive data
      console.log('Checking participant tokens for validation')

      for (const participantDoc of participantsSnapshot.docs) {
        const participant = participantDoc.data()
        if (participant.token === token) {
          console.log(`✓ Token found for email: ${participant.email}`)
          tokenFound = true

          // Get parent data from parents collection
          const parentQuery = await db.collection('parents')
            .where('email', '==', participant.email)
            .limit(1)
            .get()

          if (parentQuery.empty) {
            console.log(`✗ No parent document found for email: ${participant.email}`)
          } else {
            parentDoc = parentQuery.docs[0]
            parentData = parentQuery.docs[0].data()
            console.log(`✓ Parent data found for ${participant.email}`)
          }
          break
        }
      }
      if (parentData) {
        break
      }
    }

    if (!tokenFound) {
      console.log('✗ Token not found in any active workflows')
    }

    if (!parentData) {
      console.log('✗ Token validation failed - returning 404')
      return res.status(404).json({
        valid: false,
        error: 'Invalid or expired token.',
      })
    }

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

    // Get available committees (basic info only)
    const committeesSnapshot = await db.collection('committees').get()
    const committees = []

    for (const committeeDoc of committeesSnapshot.docs) {
      const committeeData = committeeDoc.data()
      committees.push({
        id: committeeDoc.id,
        name: committeeData.name,
      })
    }

    // Check which committees THIS parent belongs to
    const parentCommittees = []
    const parentCommitteeRoles = {}

    for (const committeeDoc of committeesSnapshot.docs) {
      // Check if parent is a member by looking for their document in members subcollection
      const memberDoc = await committeeDoc.ref.collection('members').doc(parentId).get()

      if (memberDoc.exists) {
        const memberData = memberDoc.data()
        parentCommittees.push(committeeDoc.id)
        parentCommitteeRoles[committeeDoc.id] = memberData.role || 'Membre'
      }
    }

    // Store committees globally for use in processing function
    global.availableCommittees = committees
    global.parentCommittees = parentCommittees
    global.parentCommitteeRoles = parentCommitteeRoles

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
      availableCommittees: committees,
      // Parent's committee memberships
      parentCommittees,
      parentCommitteeRoles,
    })
  } catch (error) {
    // Handle validation errors
    if (error.code === 'invalid-argument') {
      return res.status(400).json({
        valid: false,
        error: error.message,
        details: error.details,
      })
    }

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
exports.processParentUpdateV2 = onRequest({
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

    console.log('Processing parent update:', {
      email: parentData.email || 'unknown',
      committees: parentData.committees || [],
      committeeRoles: parentData.committeeRoles || {},
    })

    // Find the token in active workflows
    const activeWorkflowsSnapshot = await db.collection('workflows')
      .where('status', '==', 'active')
      .get()

    let parentDoc = null
    let existingParentData = null
    let participantDocRef = null

    // Search through active workflows for this token
    for (const wDoc of activeWorkflowsSnapshot.docs) {
      // Search participants subcollection for the token
      const participantsSnapshot = await wDoc.ref.collection('participants').get()

      for (const participantDoc of participantsSnapshot.docs) {
        const participant = participantDoc.data()
        if (participant.token === token) {
          participantDocRef = participantDoc.ref

          // Get parent data from parents collection
          const parentQuery = await db.collection('parents')
            .where('email', '==', participant.email)
            .limit(1)
            .get()

          if (!parentQuery.empty) {
            parentDoc = parentQuery.docs[0]
            existingParentData = parentQuery.docs[0].data()
          }
          break
        }
      }
      if (existingParentData) {
        break
      }
    }

    if (!existingParentData) {
      return res.status(404).json({
        error: 'Invalid or expired token.',
      })
    }

    const batch = db.batch()
    const parentRef = db.collection('parents').doc(parentDoc.id)

    // Prepare updated data - committees are NOT stored in parent document
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
    }

    // Always use the provided address data
    updatedData.address = parentData.address || ''
    updatedData.city = parentData.city || ''
    updatedData.postal_code = parentData.postal_code || ''

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
        // Get the confirmed parent's email for workflow lookup
        const confirmedParentDoc = await db.collection('parents').doc(confirmedParentId).get()
        const confirmedParentEmail = confirmedParentDoc.exists ? confirmedParentDoc.data().email : null

        if (confirmedParentEmail) {
          const activeWorkflowsSnapshot = await db.collection('workflows')
            .where('status', '==', 'active')
            .get()

          for (const workflowDoc of activeWorkflowsSnapshot.docs) {
            const otherParticipantRef = workflowDoc.ref.collection('participants').doc(confirmedParentEmail)
            const otherParticipantDoc = await otherParticipantRef.get()

            if (otherParticipantDoc.exists) {
              batch.update(otherParticipantRef, {
                formSubmitted: true,
                submittedAt: FieldValue.serverTimestamp(),
                confirmedByPartner: existingParentData.email,
              })
              console.log(`Marked ${confirmedParentEmail}'s address as confirmed by ${existingParentData.email}`)

              // Also update the other parent's address to match the confirmed address
              const otherParentRef = db.collection('parents').doc(confirmedParentId)
              batch.update(otherParentRef, {
                address: updatedData.address,
                city: updatedData.city,
                postal_code: updatedData.postal_code,
                lastUpdated: FieldValue.serverTimestamp(),
              })
              console.log(`Updated ${confirmedParentEmail}'s address to match confirmed address`)
              break
            }
          }
        }
      }
    }

    // Update parent document
    batch.update(parentRef, updatedData)

    // Update committee memberships if committees were provided
    console.log('Committee update check:', {
      hasCommittees: !!parentData.committees,
      hasRoles: !!parentData.committeeRoles,
      committeesLength: parentData.committees?.length || 0,
      rolesCount: Object.keys(parentData.committeeRoles || {}).length,
    })

    if (parentData.committees !== undefined && parentData.committeeRoles !== undefined) {
      // Load committees fresh for this update (don't rely on global)
      const committeesSnapshot = await db.collection('committees').get()
      const allCommittees = []
      for (const doc of committeesSnapshot.docs) {
        allCommittees.push({
          id: doc.id,
          ...doc.data(),
        })
      }
      console.log('🔄 Loaded committees for update:', allCommittees.length)

      await updateCommitteeMemberships(
        db,
        batch,
        parentDoc.id, // Use parent document ID, not email
        parentData.committees,
        parentData.committeeRoles,
        allCommittees,
      )
    }

    // Update workflow participation in subcollection
    if (participantDocRef) {
      batch.update(participantDocRef, {
        formSubmitted: true,
        submittedAt: FieldValue.serverTimestamp(),
        optedOut: false,
      })
      console.log(`Updated participant status for ${existingParentData.email}`)
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
    // Handle validation errors
    if (error.code === 'invalid-argument') {
      return res.status(400).json({
        error: error.message,
        details: error.details,
      })
    }

    console.error('Process parent update error:', error)
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
    allowedHeaders: ['Content-Type'],
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

    // Find the token in active workflows
    const activeWorkflowsSnapshot = await db.collection('workflows')
      .where('status', '==', 'active')
      .get()

    let parentDoc = null
    let existingParentData = null
    let participantDocRef = null

    // Search through active workflows for this token
    for (const wDoc of activeWorkflowsSnapshot.docs) {
      // Search participants subcollection for the token
      const participantsSnapshot = await wDoc.ref.collection('participants').get()

      for (const participantDoc of participantsSnapshot.docs) {
        const participant = participantDoc.data()
        if (participant.token === token) {
          participantDocRef = participantDoc.ref

          // Get parent data from parents collection
          const parentQuery = await db.collection('parents')
            .where('email', '==', participant.email)
            .limit(1)
            .get()

          if (!parentQuery.empty) {
            parentDoc = parentQuery.docs[0]
            existingParentData = parentQuery.docs[0].data()
          }
          break
        }
      }
      if (existingParentData) {
        break
      }
    }

    if (!existingParentData) {
      return res.status(404).json({
        error: 'Invalid or expired token.',
      })
    }

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

    // Update workflow participation to indicate opt-out in subcollection
    if (participantDocRef) {
      batch.update(participantDocRef, {
        formSubmitted: true,
        submittedAt: FieldValue.serverTimestamp(),
        optedOut: true,
      })
      console.log(`Updated participant status for opt-out: ${parentEmail}`)
    }

    // Check if user has an account
    let hasAccount = false
    try {
      await admin.auth().getUserByEmail(parentEmail)
      hasAccount = true
    } catch {
      hasAccount = false
    }

    // Commit all changes
    await batch.commit()

    console.log(`Parent ${parentEmail} successfully opted out - all data cleared except name and email`)

    res.status(200).json({
      success: true,
      message: 'Successfully opted out and removed personal information',
      hasAccount,
    })
  } catch (error) {
    // Handle validation errors
    if (error.code === 'invalid-argument') {
      return res.status(400).json({
        error: error.message,
        details: error.details,
      })
    }

    console.error('Process parent opt-out error:', error)
    res.status(500).json({
      error: 'Internal server error occurred while processing opt-out',
    })
  }
})

/**
 * Update committee memberships for a parent using subcollections
 * @param {FirebaseFirestore.Firestore} db - Firestore database instance
 * @param {FirebaseFirestore.WriteBatch} batch - Firestore batch for atomic operations
 * @param {string} parentId - Parent document ID
 * @param {string[]} selectedCommittees - Array of committee IDs the parent selected
 * @param {Object} committeeRoles - Object mapping committee IDs to roles
 * @param {Object[]} allCommittees - Array of all available committees
 */
async function updateCommitteeMemberships (db, batch, parentId, selectedCommittees, committeeRoles, allCommittees) {
  console.log('🔄 Updating committee memberships for parent ID:', parentId)
  console.log('📋 Selected committees:', selectedCommittees)
  console.log('🏷️  Committee roles:', committeeRoles)
  console.log('📊 Total available committees:', allCommittees.length)

  try {
    // Process each committee to add/update/remove membership
    for (const committee of allCommittees) {
      const committeeRef = db.collection('committees').doc(committee.id)
      const memberRef = committeeRef.collection('members').doc(parentId)
      const isSelected = selectedCommittees.includes(committee.id)

      // Check if member exists in subcollection
      const memberDoc = await memberRef.get()

      if (isSelected) {
        // Parent should be in this committee
        const role = committeeRoles[committee.id] || 'Membre'
        const memberData = {
          role,
          member_type: 'parent',
        }

        if (memberDoc.exists) {
          // Update existing member
          batch.update(memberRef, memberData)
          console.log(`✅ Updated ${committee.name}: updated parent ${parentId} with role ${role}`)
        } else {
          // Add new member
          batch.set(memberRef, memberData)
          console.log(`✅ Updated ${committee.name}: added parent ${parentId} with role ${role}`)
        }
      } else if (memberDoc.exists) {
        // Parent should be removed from this committee
        batch.delete(memberRef)
        console.log(`❌ Updated ${committee.name}: removed parent ${parentId}`)
      }
    }
  } catch (error) {
    console.error('Error updating committee memberships:', error)
    throw error
  }
}
