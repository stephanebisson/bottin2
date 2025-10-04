const fs = require('node:fs')
const path = require('node:path')
const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const { onRequest } = require('firebase-functions/v2/https')
const nodemailer = require('nodemailer')
const { FUNCTIONS_REGION } = require('./config')

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
  const deadline = '13 octobre' // TODO: Make this configurable based on workflow settings
  const templatePath = path.join(__dirname, 'annual-update-email.html')

  try {
    let html = fs.readFileSync(templatePath, 'utf8')

    // Replace template variables
    html = html
      .replace(/{{PARENT_NAME}}/g, parentName)
      .replace(/{{UPDATE_URL}}/g, updateUrl)
      .replace(/{{SCHOOL_YEAR}}/g, schoolYear)
      .replace(/{{CURRENT_YEAR}}/g, currentYear)
      .replace(/{{DEADLINE}}/g, deadline)

    return {
      subject: `${schoolYear} - Mise à Jour Annuelle des Informations Requise`,
      html,
    }
  } catch (error) {
    console.error('Error reading email template:', error)
    throw new Error('Failed to load email template')
  }
}

/**
 * Send email notifications to selected parents for annual update
 */
exports.sendUpdateEmailsToSelectedV2 = onRequest({
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

    const { workflowId, parentEmails } = req.body

    if (!workflowId || !parentEmails || !Array.isArray(parentEmails)) {
      return res.status(400).json({
        error: 'workflowId and parentEmails array are required',
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

    // Get selected parents from workflow participants subcollection
    const selectedParents = []

    for (const email of parentEmails) {
      // Get participant from subcollection
      const participantDoc = await db.collection('workflows').doc(workflowId)
        .collection('participants').doc(email).get()

      if (participantDoc.exists) {
        const participant = participantDoc.data()

        // Get parent info from parents collection for additional details
        const parentQuery = await db.collection('parents')
          .where('email', '==', email)
          .limit(1)
          .get()

        const parentData = parentQuery.empty ? {} : parentQuery.docs[0].data()

        selectedParents.push({
          email,
          updateToken: participant.token,
          participantDocRef: participantDoc.ref, // Store reference for easy updates
          first_name: parentData.first_name || '',
          last_name: parentData.last_name || '',
          preferredLanguage: parentData.preferredLanguage || 'fr',
        })
      }
    }

    if (selectedParents.length === 0) {
      return res.status(400).json({
        error: 'No selected parents found in workflow participants',
      })
    }

    const emailService = getEmailService()
    let emailsSent = 0
    const emailResults = []

    // Send emails to selected parents only
    for (const parent of selectedParents) {
      const parentName = `${parent.first_name || ''} ${parent.last_name || ''}`.trim() || 'Parent'

      console.log('=== Sending email ===')
      console.log('Parent email:', parent.email)
      console.log('Token generation:', parent.updateToken ? 'SUCCESS' : 'FAILED')
      console.log('Token length:', parent.updateToken?.length)

      // Construct update URL
      const baseUrl = EMAIL_CONFIG.APP_URL
      const updateUrl = `${baseUrl}/update/${parent.updateToken}`
      console.log('Update URL:', updateUrl)

      const template = getEmailTemplate(parentName, updateUrl, workflowData.schoolYear)

      try {
        const fromEmail = EMAIL_CONFIG.FROM_EMAIL
        const fromName = EMAIL_CONFIG.FROM_NAME

        await emailService.sendEmail(
          { email: fromEmail, name: fromName },
          parent.email,
          template.subject,
          template.html,
        )
        emailsSent++

        emailResults.push({
          email: parent.email,
          status: 'sent',
          sentAt: new Date(),
        })

        // Update participant status immediately after successful email send
        try {
          // Update participant document directly in subcollection
          await parent.participantDocRef.update({
            emailSent: true,
            emailSentAt: FieldValue.serverTimestamp(),
          })
          console.log(`Database updated for ${parent.email}`)
        } catch (dbError) {
          console.error(`Failed to update database for ${parent.email}:`, dbError)
          // Email was sent successfully, but database update failed
          emailResults.at(-1).dbUpdateFailed = true
          emailResults.at(-1).dbError = dbError.message
        }
      } catch (emailError) {
        console.error(`Failed to send email to ${parent.email}:`, emailError)
        emailResults.push({
          email: parent.email,
          status: 'failed',
          error: emailError.message,
        })
      }
    }

    // Stats are now calculated dynamically from subcollection, no manual update needed

    console.log(`Selected email sending completed: ${emailsSent} emails sent to selected parents`)

    res.status(200).json({
      success: true,
      emailsSent,
      totalSelected: selectedParents.length,
      results: emailResults,
    })
  } catch (error) {
    console.error('Send selected emails error:', error)
    res.status(500).json({
      error: 'Internal server error occurred while sending emails',
    })
  }
})
