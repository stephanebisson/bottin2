const crypto = require('node:crypto')
const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const { onRequest } = require('firebase-functions/v2/https')
const { FUNCTIONS_REGION } = require('./config')

// Get Firestore instance
const db = admin.firestore()

/**
 * Generate secure random token for parent update links
 */
function generateUpdateToken () {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Calculate workflow stats from participants subcollection
 */
async function calculateWorkflowStats (workflowId) {
  const participantsSnapshot = await db.collection('workflows')
    .doc(workflowId)
    .collection('participants')
    .get()

  const stats = {
    totalParents: 0,
    emailsSent: 0,
    formsSubmitted: 0,
    accountsCreated: 0,
    optedOut: 0,
  }

  for (const doc of participantsSnapshot) {
    const participant = doc.data()
    stats.totalParents++
    if (participant.emailSent) {
      stats.emailsSent++
    }
    if (participant.formSubmitted) {
      stats.formsSubmitted++
    }
    if (participant.optedOut) {
      stats.optedOut++
    }
  }

  return stats
}

/**
 * V2 - Start the annual parent information update workflow
 * Generates tokens for all parents and sends notification emails
 */
exports.startAnnualUpdateV2 = onRequest({
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
    console.log('=== startAnnualUpdateV2 called ===')
    console.log('Request body:', req.body)
    console.log('Headers:', { authorization: req.headers.authorization ? 'Present' : 'Missing' })

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

    const { schoolYear, adminEmail } = req.body

    if (!schoolYear || !adminEmail) {
      return res.status(400).json({
        error: 'School year and admin email are required',
      })
    }

    // Create a new workflow session with year-based ID
    const currentYear = new Date().getFullYear()
    const workflowId = `parent_updates_${currentYear}`

    // Check if there's already a workflow for this year
    const existingWorkflowDoc = await db.collection('workflows').doc(workflowId).get()

    if (existingWorkflowDoc.exists) {
      const existingData = existingWorkflowDoc.data()
      return res.status(409).json({
        error: `A parent updates workflow already exists for ${currentYear}. Please complete or cancel the current workflow before starting a new one.`,
        currentWorkflow: existingData,
      })
    }

    const startedAt = FieldValue.serverTimestamp()

    // Get all parents for token generation
    const parentsSnapshot = await db.collection('parents').get()
    const parents = []

    for (const doc of parentsSnapshot.docs) {
      const parentData = doc.data()
      parents.push({
        id: doc.id,
        ...parentData,
      })
    }

    console.log(`Found ${parents.length} parents for workflow ${workflowId}`)

    // Generate tokens for all parents and store them in the participants subcollection
    const batch = db.batch()
    const currentTime = new Date()

    // Create the main workflow document
    const workflowRef = db.collection('workflows').doc(workflowId)
    batch.set(workflowRef, {
      id: workflowId,
      schoolYear,
      status: 'active',
      startedAt,
      adminEmail,
      tokensGenerated: parents.length,
      emailsSent: 0,
      responsesReceived: 0,
      phase: 'tokens_generated',
      stats: {
        totalParents: parents.length,
        emailsSent: 0,
        formsSubmitted: 0,
        accountsCreated: 0,
        optedOut: 0,
      },
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Create participant documents in subcollection
    for (const parent of parents) {
      const token = generateUpdateToken()
      const participantRef = workflowRef.collection('participants').doc(parent.email)
      batch.set(participantRef, {
        email: parent.email,
        parentId: parent.id,
        parentName: `${parent.firstName || parent.first_name || ''} ${parent.lastName || parent.last_name || ''}`.trim() || parent.email,
        token,
        tokenCreatedAt: currentTime,
        emailSent: false,
        emailSentAt: null,
        formSubmitted: false,
        submittedAt: null,
        optedOut: false,
      })
    }

    // Commit all the changes atomically
    await batch.commit()

    console.log(`Generated ${parents.length} tokens for workflow ${workflowId}`)

    res.status(200).json({
      message: 'Annual update workflow started successfully',
      workflowId,
      tokensGenerated: parents.length,
      parents: parents.length,
    })
  } catch (error_) {
    console.error('Failed to start annual update:', error_)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
})

/**
 * V2 - Get current workflow status and history
 */
exports.getWorkflowStatusV2 = onRequest({
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

    // Get all workflow sessions, ordered by start date
    const workflowsSnapshot = await db.collection('workflows')
      .orderBy('startedAt', 'desc')
      .get()

    const workflows = []
    let currentWorkflow = null

    for (const doc of workflowsSnapshot.docs) {
      const data = doc.data()

      // Calculate dynamic stats for this workflow
      const dynamicStats = await calculateWorkflowStats(doc.id)

      const workflow = {
        id: doc.id,
        ...data,
        stats: dynamicStats, // Use dynamic stats instead of cached stats
        startedAt: data.startedAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
      }

      // For the current (active) workflow, also load participants for frontend display
      if (data.status === 'active' && !currentWorkflow) {
        const participantsSnapshot = await doc.ref.collection('participants').get()
        const participants = []

        for (const participantDoc of participantsSnapshot) {
          const participant = participantDoc.data()
          participants.push({
            ...participant,
            emailSentAt: participant.emailSentAt?.toDate?.()?.toISOString() || null,
            submittedAt: participant.submittedAt?.toDate?.()?.toISOString() || null,
            tokenCreatedAt: participant.tokenCreatedAt?.toDate?.()?.toISOString() || null,
          })
        }

        workflow.participants = participants
        currentWorkflow = workflow
      }

      workflows.push(workflow)
    }

    res.status(200).json({
      current: currentWorkflow,
      history: workflows.slice(0, 10), // Return last 10 workflows
    })
  } catch (error) {
    console.error('Get workflow status error:', error)
    res.status(500).json({
      error: 'Internal server error occurred while getting workflow status',
    })
  }
})
