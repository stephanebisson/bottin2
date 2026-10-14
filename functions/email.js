const fs = require('node:fs')
const path = require('node:path')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')
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
const db = getFirestore()

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

// Email versions: only the subject and the first paragraph differ
const EMAIL_VARIANTS = {
  initial: {
    subject: schoolYear => `${schoolYear} - Mise à jour annuelle des informations`,
    intro: '<p>Il vous faudra seulement <strong>2 minutes</strong> pour mettre à jour vos données pour le gros bottin de l\'Étoile filante!</p>',
  },
  reminder: {
    subject: schoolYear => `Rappel : ${schoolYear} - Mise à jour annuelle des informations`,
    intro: '<p>Nous n\'avons pas encore reçu la mise à jour de vos informations pour le bottin de l\'Étoile filante. Il ne vous faudra que <strong>2 minutes</strong>!</p>',
  },
  final: {
    subject: schoolYear => `Dernière chance : ${schoolYear} - Mise à jour annuelle des informations`,
    intro: '<p>Dernier rappel : la date limite pour mettre à jour vos informations pour le bottin est le <strong>{{DEADLINE}}</strong>. Sans réponse de votre part, vos informations de l\'an dernier ne seront pas reprises.</p>',
  },
}

function getEmailTemplate (parentName, updateUrl, schoolYear, variant) {
  const currentYear = new Date().getFullYear()
  const deadline = '31 octobre' // TODO: Make this configurable based on workflow settings
  const templatePath = path.join(__dirname, 'annual-update-email.html')
  const { subject, intro } = EMAIL_VARIANTS[variant]

  try {
    let html = fs.readFileSync(templatePath, 'utf8')

    // Replace template variables (intro first: it may contain other placeholders)
    html = html
      .replace(/\{\{INTRO\}\}/g, intro)
      .replace(/\{\{PARENT_NAME\}\}/g, parentName)
      .replace(/\{\{UPDATE_URL\}\}/g, updateUrl)
      .replace(/\{\{SCHOOL_YEAR\}\}/g, schoolYear)
      .replace(/\{\{CURRENT_YEAR\}\}/g, currentYear)
      .replace(/\{\{DEADLINE\}\}/g, deadline)
      .replace(/\{\{APP_URL\}\}/g, EMAIL_CONFIG.APP_URL)

    return {
      subject: subject(schoolYear),
      html,
    }
  } catch (error) {
    console.error('Error reading email template:', error)
    throw new Error('Failed to load email template', { cause: error })
  }
}

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
      decodedToken = await getAuth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { parentId, variant = 'initial' } = req.body
    if (!parentId) {
      return res.status(400).json({ error: 'parentId is required' })
    }
    if (!Object.hasOwn(EMAIL_VARIANTS, variant)) {
      return res.status(400).json({ error: `Unknown email variant: ${variant}` })
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

    const template = getEmailTemplate(parentName, updateUrl, schoolYear, variant)

    if (SIMULATE_EMAILS) {
      console.log(`🧪 SIMULATION MODE: Simulating email send to ${parentData.email}`)
      console.log(`📧 Variant: ${variant} | Subject: ${template.subject}`)
      console.log(`🔗 Update URL: ${updateUrl}`)
      console.log(`⏱️  Adding ${EMAIL_SIMULATION_DELAY_MS}ms delay`)
      await new Promise(resolve => setTimeout(resolve, EMAIL_SIMULATION_DELAY_MS))
      console.log(`✅ Simulated email "sent" to ${parentData.email}`)
      return res.status(200).json({ success: true, email: parentData.email, variant, simulated: true })
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
      variant,
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
