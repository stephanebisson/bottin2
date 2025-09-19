const crypto = require('node:crypto')
const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const functions = require('firebase-functions')
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
 * Start the annual parent information update workflow
 * Generates tokens for all parents and sends notification emails
 */
exports.startAnnualUpdate = functions.region(FUNCTIONS_REGION).https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

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
    console.log('=== startAnnualUpdate called ===')
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
      console.log('Verifying ID token...')
      decodedToken = await admin.auth().verifyIdToken(idToken)
      console.log('Token verified, claims:', decodedToken.admin ? 'Admin' : 'Non-admin')
    } catch (error) {
      console.log('Token verification failed:', error.message)
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    // Verify admin claim
    if (!decodedToken.admin) {
      console.log('User is not admin')
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Get request data
    const { schoolYear, adminEmail } = req.body
    console.log('Request data parsed:', { schoolYear, adminEmail })

    if (!schoolYear || !adminEmail) {
      console.log('Missing required fields')
      return res.status(400).json({
        error: 'schoolYear and adminEmail are required',
      })
    }

    // Additional security: Rate limiting check - only allow one workflow start per hour per user
    console.log('Checking rate limiting...')
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentWorkflows = await db.collection('updateSessions')
      .where('adminEmail', '==', adminEmail)
      .where('startedAt', '>', oneHourAgo)
      .get()
    console.log('Rate limit check passed')

    if (!recentWorkflows.empty) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Only one workflow can be started per hour per admin.',
      })
    }

    // Check if workflow already exists for this school year
    const workflowId = `${schoolYear.split('-')[0]}-annual-update`
    const existingWorkflow = await db.collection('updateSessions').doc(workflowId).get()

    if (existingWorkflow.exists && existingWorkflow.data().status === 'active') {
      return res.status(409).json({
        error: 'Workflow already active for this school year',
      })
    }

    // Get all parents from the database
    console.log('Loading parents from database...')
    const parentsSnapshot = await db.collection('parents').get()
    const parents = []
    console.log(`Found ${parentsSnapshot.size} parent documents`)

    for (const doc of parentsSnapshot) {
      const parentData = doc.data()
      if (parentData.email) {
        parents.push({
          id: doc.id,
          email: parentData.email,
          first_name: parentData.first_name || '',
          last_name: parentData.last_name || '',
        })
      }
    }

    if (parents.length === 0) {
      return res.status(400).json({
        error: 'No parents found in database',
      })
    }

    const batch = db.batch()
    const tokens = {}
    const participants = {}

    // Generate tokens and prepare batch updates
    console.log('Generating tokens and preparing batch updates...')
    for (const parent of parents) {
      const token = generateUpdateToken()
      const tokenExpiry = new Date()
      tokenExpiry.setDate(tokenExpiry.getDate() + 30) // 30 days from now

      // Update parent document with token
      const parentRef = db.collection('parents').doc(parent.id)
      console.log(`Updating parent ${parent.id} (${parent.email}) with token`)

      // Use set with merge to ensure document exists
      batch.set(parentRef, {
        updateToken: token,
        tokenExpiry,
        lastUpdated: FieldValue.serverTimestamp(),
      }, { merge: true })

      tokens[parent.email] = token
      participants[parent.email] = {
        emailSent: false,
        emailSentAt: null,
        formSubmitted: false,
        submittedAt: null,
        accountCreated: false,
        optedOut: false,
        remindersSent: 0,
      }
    }

    // Create workflow session document
    console.log('Creating workflow session document...')
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 30)

    const workflowRef = db.collection('updateSessions').doc(workflowId)
    batch.set(workflowRef, {
      schoolYear,
      status: 'active',
      startedAt: FieldValue.serverTimestamp(),
      completedAt: null,
      deadline,
      adminEmail,
      stats: {
        totalParents: parents.length,
        emailsSent: 0,
        formsSubmitted: 0,
        accountsCreated: 0,
        optedOut: 0,
      },
      participants,
    })

    // Execute batch write
    console.log('Committing batch write...')
    await batch.commit()
    console.log('Batch write committed successfully')

    console.log(`Annual update workflow started for ${schoolYear} with ${parents.length} parents`)

    res.status(200).json({
      success: true,
      message: `Workflow started for ${schoolYear}`,
      workflowId,
      totalParents: parents.length,
      tokensGenerated: Object.keys(tokens).length,
    })
  } catch (error) {
    console.error('Start workflow error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    })
    res.status(500).json({
      error: 'Internal server error occurred while starting workflow',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
})

/**
 * Get current workflow status and history
 */
exports.getWorkflowStatus = functions.region(FUNCTIONS_REGION).https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).send()
  }

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
    const workflowsSnapshot = await db.collection('updateSessions')
      .orderBy('startedAt', 'desc')
      .get()

    const workflows = []
    let currentWorkflow = null

    for (const doc of workflowsSnapshot) {
      const data = doc.data()
      const workflow = {
        id: doc.id,
        ...data,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        deadline: data.deadline,
      }

      workflows.push(workflow)

      // Current workflow is the most recent active one
      if (data.status === 'active' && !currentWorkflow) {
        currentWorkflow = workflow
      }
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
