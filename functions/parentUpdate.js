const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const { onRequest } = require('firebase-functions/v2/https')
const { FUNCTIONS_REGION } = require('./config')

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
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Use POST.',
    })
  }

  try {
    const { token } = req.body

    console.log('=== validateUpdateTokenV2 ===')
    console.log('Received token:', token)
    console.log('Token type:', typeof token)
    console.log('Token length:', token?.length)

    if (!token || typeof token !== 'string') {
      console.log('Token validation failed: invalid token format')
      return res.status(400).json({
        valid: false,
        error: 'Token is required and must be a string.',
      })
    }

    // Find the token in active workflows
    const activeWorkflowsSnapshot = await db.collection('updateSessions')
      .where('status', '==', 'active')
      .get()

    console.log(`Found ${activeWorkflowsSnapshot.size} active workflows`)

    let parentData = null
    let parentDoc = null
    let tokenFound = false

    // Search through active workflows for this token
    for (const workflowDoc of activeWorkflowsSnapshot.docs) {
      const workflow = workflowDoc.data()
      console.log(`Checking workflow ${workflowDoc.id}`)
      console.log('Workflow status:', workflow.status)
      console.log('Has participants:', !!workflow.participants)

      if (workflow.participants) {
        const participantCount = Object.keys(workflow.participants).length
        console.log(`Participant count: ${participantCount}`)

        // Log first few tokens for comparison
        const tokens = Object.values(workflow.participants).map(p => p.token).slice(0, 3)
        console.log('Sample tokens:', tokens)

        for (const [email, participant] of Object.entries(workflow.participants)) {
          if (participant.token === token) {
            console.log(`✓ Token found for email: ${email}`)
            tokenFound = true

            // Get parent data from parents collection
            const parentQuery = await db.collection('parents')
              .where('email', '==', email)
              .limit(1)
              .get()

            if (parentQuery.empty) {
              console.log(`✗ No parent document found for email: ${email}`)
            } else {
              parentDoc = parentQuery.docs[0]
              parentData = parentQuery.docs[0].data()
              console.log(`✓ Parent data found for ${email}`)
            }
            break
          }
        }
        if (parentData) {
          break
        }
      } else {
        console.log('No participants in this workflow')
      }
    }

    if (!tokenFound) {
      console.log(`✗ Token not found in any active workflows: ${token}`)
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

    // Find students that belong to this parent
    const studentsSnapshot = await db.collection('students')
      .where('parent1_email', '==', parentData.email)
      .get()

    const studentsSnapshot2 = await db.collection('students')
      .where('parent2_email', '==', parentData.email)
      .get()

    // Combine results and find other parent emails
    const allStudents = [...studentsSnapshot.docs, ...studentsSnapshot2.docs]
    const otherParentEmails = new Set()

    for (const studentDoc of allStudents) {
      const student = studentDoc.data()
      if (student.parent1_email && student.parent1_email !== parentData.email) {
        otherParentEmails.add(student.parent1_email)
      }
      if (student.parent2_email && student.parent2_email !== parentData.email) {
        otherParentEmails.add(student.parent2_email)
      }
    }

    // Check if any other parent has an address
    for (const otherParentEmail of otherParentEmails) {
      const otherParentQuery = await db.collection('parents')
        .where('email', '==', otherParentEmail)
        .limit(1)
        .get()

      if (!otherParentQuery.empty) {
        const otherParentData = otherParentQuery.docs[0].data()
        if (otherParentData.address || otherParentData.city) {
          otherParentHasAddress = true
          break
        }
      }
    }

    // Get available committees (needed for both validation and processing)
    const committeesSnapshot = await db.collection('committees').get()
    const committees = []
    for (const doc of committeesSnapshot.docs) {
      committees.push({
        id: doc.id,
        ...doc.data(),
      })
    }

    // Store committees globally for use in processing function
    global.availableCommittees = committees

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
        // committees: removed - membership stored in committees collection only
        interests: parentData.interests || '',
        optedOut: parentData.optedOut || false,
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

    console.log('Processing parent update:', {
      email: parentData.email || 'unknown',
      committees: parentData.committees || [],
      committeeRoles: parentData.committeeRoles || {},
    })

    // Find the token in active workflows
    const activeWorkflowsSnapshot = await db.collection('updateSessions')
      .where('status', '==', 'active')
      .get()

    let parentDoc = null
    let existingParentData = null
    let workflowDoc = null

    // Search through active workflows for this token
    for (const wDoc of activeWorkflowsSnapshot.docs) {
      const workflow = wDoc.data()
      if (workflow.participants) {
        for (const [email, participant] of Object.entries(workflow.participants)) {
          if (participant.token === token) {
            workflowDoc = wDoc
            // Get parent data from parents collection
            const parentQuery = await db.collection('parents')
              .where('email', '==', email)
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
      interests: parentData.interests || '',
      optedOut: false, // Re-opt in if they were previously opted out
      lastUpdated: FieldValue.serverTimestamp(),
    }

    // Handle address logic
    if (parentData.sameAddressAsOther) {
      // Find students that belong to this parent to get other parent emails
      const studentsSnapshot1 = await db.collection('students')
        .where('parent1_email', '==', existingParentData.email)
        .get()

      const studentsSnapshot2 = await db.collection('students')
        .where('parent2_email', '==', existingParentData.email)
        .get()

      const allStudents = [...studentsSnapshot1.docs, ...studentsSnapshot2.docs]
      let addressCopied = false

      // Find other parent emails and try to copy their address
      for (const studentDoc of allStudents) {
        const student = studentDoc.data()
        const otherEmails = []

        if (student.parent1_email && student.parent1_email !== existingParentData.email) {
          otherEmails.push(student.parent1_email)
        }
        if (student.parent2_email && student.parent2_email !== existingParentData.email) {
          otherEmails.push(student.parent2_email)
        }

        // Try to get address from first other parent found
        for (const otherParentEmail of otherEmails) {
          const otherParentQuery = await db.collection('parents')
            .where('email', '==', otherParentEmail)
            .limit(1)
            .get()

          if (!otherParentQuery.empty) {
            const otherParentData = otherParentQuery.docs[0].data()
            if (otherParentData.address || otherParentData.city) {
              updatedData.address = otherParentData.address || ''
              updatedData.city = otherParentData.city || ''
              updatedData.postal_code = otherParentData.postal_code || ''
              addressCopied = true
              break
            }
          }
        }
        if (addressCopied) {
          break
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
        existingParentData.email,
        parentData.committees,
        parentData.committeeRoles,
        allCommittees,
      )
    }

    // Update workflow participation
    if (workflowDoc) {
      const participantPath = `participants.${existingParentData.email}`
      batch.update(workflowDoc.ref, {
        [`${participantPath}.formSubmitted`]: true,
        [`${participantPath}.submittedAt`]: FieldValue.serverTimestamp(),
        [`${participantPath}.optedOut`]: false,
        'stats.formsSubmitted': FieldValue.increment(1),
      })

      // If parent was previously opted out, decrement the opted out count
      if (existingParentData.optedOut) {
        batch.update(workflowDoc.ref, {
          'stats.optedOut': FieldValue.increment(-1),
        })
        console.log(`Parent ${existingParentData.email} re-opted in - decremented opt-out stats`)
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
        error: 'Token is required',
      })
    }

    console.log('Processing parent opt-out for token:', token)

    // Find the token in active workflows
    const activeWorkflowsSnapshot = await db.collection('updateSessions')
      .where('status', '==', 'active')
      .get()

    let parentDoc = null
    let existingParentData = null
    let workflowDocRef = null

    // Search through active workflows for this token
    for (const wDoc of activeWorkflowsSnapshot.docs) {
      const workflow = wDoc.data()
      if (workflow.participants) {
        for (const [email, participant] of Object.entries(workflow.participants)) {
          if (participant.token === token) {
            workflowDocRef = wDoc
            // Get parent data from parents collection
            const parentQuery = await db.collection('parents')
              .where('email', '==', email)
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
      interests: '',
      optedOut: true,
      lastUpdated: FieldValue.serverTimestamp(),
      // Keep children data intact for school records
      children: existingParentData.children || null,
    }

    // Update parent document with minimal data
    batch.set(parentRef, optedOutData)

    // Remove from ALL committee memberships
    const committeesSnapshot = await db.collection('committees').get()
    for (const committeeDoc of committeesSnapshot.docs) {
      const committeeData = committeeDoc.data()
      const currentMembers = committeeData.members || []
      const memberIndex = currentMembers.findIndex(member => member.email === parentEmail)

      if (memberIndex !== -1) {
        currentMembers.splice(memberIndex, 1)
        batch.update(db.collection('committees').doc(committeeDoc.id), {
          members: currentMembers,
        })
        console.log(`Removed ${parentEmail} from committee: ${committeeData.name}`)
      }
    }

    // Update workflow participation to indicate opt-out
    if (workflowDocRef) {
      const participantPath = `participants.${parentEmail}`
      batch.update(workflowDocRef.ref, {
        [`${participantPath}.formSubmitted`]: true,
        [`${participantPath}.submittedAt`]: FieldValue.serverTimestamp(),
        [`${participantPath}.optedOut`]: true,
        'stats.formsSubmitted': FieldValue.increment(1),
        'stats.optedOut': FieldValue.increment(1),
      })
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
    console.error('Process parent opt-out error:', error)
    res.status(500).json({
      error: 'Internal server error occurred while processing opt-out',
    })
  }
})

/**
 * Update committee memberships for a parent
 * @param {FirebaseFirestore.Firestore} db - Firestore database instance
 * @param {FirebaseFirestore.WriteBatch} batch - Firestore batch for atomic operations
 * @param {string} parentEmail - Email of the parent
 * @param {string[]} selectedCommittees - Array of committee IDs the parent selected
 * @param {Object} committeeRoles - Object mapping committee IDs to roles
 * @param {Object[]} allCommittees - Array of all available committees
 */
async function updateCommitteeMemberships (db, batch, parentEmail, selectedCommittees, committeeRoles, allCommittees) {
  console.log('🔄 Updating committee memberships for:', parentEmail)
  console.log('📋 Selected committees:', selectedCommittees)
  console.log('🏷️  Committee roles:', committeeRoles)
  console.log('📊 Total available committees:', allCommittees.length)

  try {
    // Process each committee to add/update/remove membership
    for (const committee of allCommittees) {
      const committeeRef = db.collection('committees').doc(committee.id)
      const isSelected = selectedCommittees.includes(committee.id)
      const currentMembers = committee.members || []
      const existingMemberIndex = currentMembers.findIndex(member => member.email === parentEmail)

      if (isSelected) {
        // Parent should be in this committee
        const role = committeeRoles[committee.id] || 'Member'
        const memberEntry = {
          email: parentEmail,
          role,
          member_type: 'parent',
        }

        if (existingMemberIndex === -1) {
          // Add new member
          currentMembers.push(memberEntry)
        } else {
          // Update existing member's role
          currentMembers[existingMemberIndex] = memberEntry
        }

        batch.update(committeeRef, { members: currentMembers })
        console.log(`✅ Updated ${committee.name}: added/updated ${parentEmail} with role ${role}`)
      } else if (existingMemberIndex !== -1) {
        // Parent should be removed from this committee
        currentMembers.splice(existingMemberIndex, 1)
        batch.update(committeeRef, { members: currentMembers })
        console.log(`❌ Updated ${committee.name}: removed ${parentEmail}`)
      }
    }
  } catch (error) {
    console.error('Error updating committee memberships:', error)
    throw error
  }
}
