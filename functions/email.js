const fs = require('node:fs')
const path = require('node:path')
const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const { onRequest } = require('firebase-functions/v2/https')
const nodemailer = require('nodemailer')
const { FUNCTIONS_REGION, SIMULATE_EMAILS, EMAIL_SIMULATION_DELAY_MS } = require('./config')
const { getCurrentSchoolYear } = require('./schoolYear')
const { generateOrReuseToken } = require('./tokens')

// Email configuration constants
const EMAIL_CONFIG = {
  FROM_EMAIL: 'noreply@bottin-etoile-filante.org',
  FROM_NAME: 'Bottin Étoile filante',
  APP_URL: 'https://bottin-etoile-filante.org',
}

// Get Firestore instance
const db = admin.firestore()

/**
 * Email configuration and templates
 */
function getEmailService () {
  // Use Gmail SMTP with nodemailer
  const gmailUser = process.env.GMAIL_USER
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD

  if (!gmailUser || !gmailAppPassword) {
    throw new Error('Gmail credentials not found. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env file')
  }

  // Parse email allow list from environment variable
  const allowListString = process.env.EMAIL_ALLOW_LIST || ''
  const emailAllowList = allowListString
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0)

  // Create nodemailer transporter for Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  })

  return {
    sendEmail: async (from, to, subject, html) => {
      // Check allow list if it's configured
      if (emailAllowList.length > 0) {
        const recipientEmail = to.toLowerCase()
        if (!emailAllowList.includes(recipientEmail)) {
          console.log(`📧 Email blocked by allow list: ${to}`)
          console.log(`📧 Allowed emails: ${emailAllowList.join(', ')}`)
          return {
            messageId: 'blocked-' + Date.now(),
            response: 'Email blocked by allow list',
            blocked: true,
          }
        }
      }

      const mailOptions = {
        from: `"${from.name}" <${from.email}>`,
        to,
        subject,
        html,
      }

      return await transporter.sendMail(mailOptions)
    },
  }
}

function getEmailTemplate (parentName, updateUrl, schoolYear) {
  const currentYear = new Date().getFullYear()
  const deadline = '31 octobre' // TODO: Make this configurable based on workflow settings
  const templatePath = path.join(__dirname, 'annual-update-email.html')

  try {
    let html = fs.readFileSync(templatePath, 'utf8')

    // Replace template variables
    html = html
      .replace(/\{\{PARENT_NAME\}\}/g, parentName)
      .replace(/\{\{UPDATE_URL\}\}/g, updateUrl)
      .replace(/\{\{SCHOOL_YEAR\}\}/g, schoolYear)
      .replace(/\{\{CURRENT_YEAR\}\}/g, currentYear)
      .replace(/\{\{DEADLINE\}\}/g, deadline)

    return {
      subject: `Dernière chance: ${schoolYear} - Mise à jour annuelle des informations`,
      html,
    }
  } catch (error) {
    console.error('Error reading email template:', error)
    throw new Error('Failed to load email template', { cause: error })
  }
}

/**
 * Send email notification to a single parent for annual update
 */
exports.sendParentEmailV2 = onRequest({
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
    console.log('🚨 EMAIL FUNCTION CALLED - SIMULATE_EMAILS:', SIMULATE_EMAILS)

    // Verify user is authenticated and is admin
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' })
    }

    const idToken = authHeader.split('Bearer ', 2)[1]
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

    const { workflowId, parentEmail } = req.body

    if (!workflowId || !parentEmail) {
      return res.status(400).json({
        error: 'workflowId and parentEmail are required',
      })
    }

    // Get workflow document
    const workflowDoc = await db.collection('workflows').doc(workflowId).get()

    if (!workflowDoc.exists) {
      return res.status(404).json({
        error: 'Workflow not found',
      })
    }

    const workflowData = workflowDoc.data()

    if (workflowData.status !== 'active') {
      return res.status(400).json({
        error: 'Workflow is not active',
      })
    }

    // Get participant from subcollection
    const participantDoc = await db.collection('workflows').doc(workflowId).collection('participants').doc(parentEmail).get()

    if (!participantDoc.exists) {
      return res.status(404).json({
        error: 'Parent not found in workflow participants',
      })
    }

    const participant = participantDoc.data()

    // Get parent info from parents collection for additional details
    const parentQuery = await db.collection('parents')
      .where('email', '==', parentEmail)
      .limit(1)
      .get()

    const parentData = parentQuery.empty ? {} : parentQuery.docs[0].data()

    const parentName = `${parentData.first_name || ''} ${parentData.last_name || ''}`.trim() || 'Parent'

    console.log('=== Sending single email ===')
    console.log('🔧 SIMULATE_EMAILS setting:', SIMULATE_EMAILS)
    console.log('📧 Parent email:', parentEmail)
    console.log('🔑 Token:', participant.token ? 'EXISTS' : 'MISSING')

    if (SIMULATE_EMAILS) {
      console.log('🧪 EMAIL SIMULATION MODE ACTIVE - No real email will be sent!')
    } else {
      console.log('⚠️  REAL EMAIL MODE - This will send an actual email!')
    }

    // Construct update URL
    const baseUrl = EMAIL_CONFIG.APP_URL
    const updateUrl = `${baseUrl}/update/${participant.token}`
    console.log('Update URL:', updateUrl)

    const template = getEmailTemplate(parentName, updateUrl, workflowData.schoolYear)

    try {
      if (SIMULATE_EMAILS) {
        // Development mode: simulate email sending with delay
        console.log(`🧪 SIMULATION MODE: Simulating email send to ${parentEmail}`)
        console.log(`📧 Subject: ${template.subject}`)
        console.log(`⏱️  Adding ${EMAIL_SIMULATION_DELAY_MS}ms delay to simulate email processing`)

        // Add delay to simulate email service slowness
        await new Promise(resolve => setTimeout(resolve, EMAIL_SIMULATION_DELAY_MS))

        console.log(`✅ Simulated email "sent" to ${parentEmail}`)
      } else {
        // Production mode: send real email
        const emailService = getEmailService()
        const fromEmail = EMAIL_CONFIG.FROM_EMAIL
        const fromName = EMAIL_CONFIG.FROM_NAME

        await emailService.sendEmail(
          { email: fromEmail, name: fromName },
          parentEmail,
          template.subject,
          template.html,
        )

        console.log(`📧 Real email sent successfully to ${parentEmail}`)
      }

      // Update participant status after successful email send (real or simulated)
      await participantDoc.ref.update({
        emailSent: true,
        emailSentAt: FieldValue.serverTimestamp(),
      })

      res.status(200).json({
        success: true,
        email: parentEmail,
        sentAt: new Date().toISOString(),
        simulated: SIMULATE_EMAILS,
      })
    } catch (emailError) {
      console.error(`Failed to send email to ${parentEmail}:`, emailError)

      // Return detailed error information for frontend handling
      res.status(500).json({
        success: false,
        email: parentEmail,
        error: emailError.message,
        errorType: emailError.code || 'EMAIL_SEND_FAILED',
      })
    }
  } catch (error) {
    console.error('Send parent email error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error occurred while sending email',
      errorType: 'INTERNAL_ERROR',
    })
  }
})

/**
 * Send annual update email to a single parent by parentId (no workflow dependency)
 */
exports.sendParentUpdateEmail = onRequest({
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' })
    }

    const idToken = authHeader.split('Bearer ', 2)[1]
    let decodedToken
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { parentId } = req.body
    if (!parentId) {
      return res.status(400).json({ error: 'parentId is required' })
    }

    const parentDoc = await db.collection('parents').doc(parentId).get()
    if (!parentDoc.exists) {
      return res.status(404).json({ error: 'Parent not found' })
    }

    const parentData = parentDoc.data()
    if (!parentData.email) {
      return res.status(400).json({ error: 'Parent has no email address' })
    }

    const schoolYear = getCurrentSchoolYear()
    const token = await generateOrReuseToken(parentId, schoolYear)
    const updateUrl = `${EMAIL_CONFIG.APP_URL}/update/${token}`
    const parentName = `${parentData.first_name || ''} ${parentData.last_name || ''}`.trim() || 'Parent'

    const template = getEmailTemplate(parentName, updateUrl, schoolYear)

    if (SIMULATE_EMAILS) {
      console.log(`🧪 SIMULATION MODE: Simulating email send to ${parentData.email}`)
      console.log(`📧 Subject: ${template.subject}`)
      console.log(`🔗 Update URL: ${updateUrl}`)
      console.log(`⏱️  Adding ${EMAIL_SIMULATION_DELAY_MS}ms delay`)
      await new Promise(resolve => setTimeout(resolve, EMAIL_SIMULATION_DELAY_MS))
      console.log(`✅ Simulated email "sent" to ${parentData.email}`)
      return res.status(200).json({ success: true, email: parentData.email, simulated: true })
    }

    const emailService = getEmailService()
    const result = await emailService.sendEmail(
      { email: EMAIL_CONFIG.FROM_EMAIL, name: EMAIL_CONFIG.FROM_NAME },
      parentData.email,
      template.subject,
      template.html,
    )

    return res.status(200).json({
      success: true,
      email: parentData.email,
      sentAt: new Date().toISOString(),
      blocked: !!result.blocked,
    })
  } catch (error) {
    console.error('Send parent update email error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    })
  }
})
