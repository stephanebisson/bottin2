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

// Email messages organized by language
const EMAIL_MESSAGES = {
  en: {
    systemName: 'School Directory System',
    subject: 'Annual Information Update Required',
    title: 'Annual Information Update',
    greeting: 'Dear',
    intro: (schoolYear, systemName) => `As we begin the <strong>${schoolYear}</strong> school year, we need to update and verify the information in our ${systemName.toLowerCase()}.`,
    instruction: 'Please take a few minutes to review and update your family\'s information by clicking the button below:',
    buttonText: 'Update My Information',
    updateListTitle: 'You will be able to update:',
    updateItems: [
      'Contact information (phone, address)',
      'Committee memberships and interests',
      'Directory participation preferences',
    ],
    noAccountText: '<strong>No account required!</strong> Simply click the link above to get started. After submitting your information, you\'ll have the option to create an account for easier future access.',
    contactText: 'If you have any questions or need assistance, please contact the school office.',
    thankYouText: 'Thank you for helping us keep our directory accurate and up-to-date!',
    signature: 'School Administration',
    footerText: (systemName, year) => `${systemName} | ${year}`,
    automatedMessage: 'This is an automated message. Please do not reply to this email.',
  },
  fr: {
    systemName: 'Bottin de l\'Étoile filante',
    subject: 'Mise à Jour Annuelle des Informations Requise',
    title: 'Mise à Jour Annuelle des Informations',
    greeting: 'Cher/Chère',
    intro: schoolYear => `Alors que nous commençons l'année scolaire <strong>${schoolYear}</strong>, nous devons mettre à jour et vérifier les informations dans notre bottin scolaire.`,
    instruction: 'Veuillez prendre quelques minutes pour réviser et mettre à jour les informations de votre famille en cliquant sur le bouton ci-dessous :',
    buttonText: 'Mettre à Jour Mes Informations',
    updateListTitle: 'Vous pourrez mettre à jour :',
    updateItems: [
      'Informations de contact (téléphone, adresse)',
      'Adhésions aux comités et intérêts',
      'Préférences de participation au bottin',
    ],
    noAccountText: '<strong>Aucun compte requis !</strong> Cliquez simplement sur le lien ci-dessus pour commencer. Après avoir soumis vos informations, vous aurez l\'option de créer un compte pour un accès futur plus facile.',
    contactText: 'Si vous avez des questions ou avez besoin d\'assistance, veuillez contacter le bureau de l\'école.',
    thankYouText: 'Merci de nous aider à maintenir notre bottin précis et à jour !',
    signature: 'Administration Scolaire',
    footerText: (systemName, year) => `${systemName} | ${year}`,
    automatedMessage: 'Ceci est un message automatisé. Veuillez ne pas répondre à ce courriel.',
  },
}

const EMAIL_SYSTEM_EMOJI = '📚'

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

function getEmailTemplate (parentName, updateUrl, schoolYear, language = 'fr') {
  const messages = EMAIL_MESSAGES[language] || EMAIL_MESSAGES.en
  const currentYear = new Date().getFullYear()

  const updateListItems = messages.updateItems.map(item => `<li>${item}</li>`).join('')

  return {
    subject: `${schoolYear} - ${messages.subject}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${messages.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1976d2; color: white; text-align: center; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .info { background-color: #e3f2fd; border: 1px solid #2196f3; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${EMAIL_SYSTEM_EMOJI} ${messages.systemName}</h1>
            <h2>${messages.title}</h2>
          </div>
          <div class="content">
            <p>${messages.greeting} <strong>${parentName}</strong>,</p>
            
            <p>${messages.intro(schoolYear, messages.systemName)}</p>
            
            <p>${messages.instruction}</p>
            
            <p style="text-align: center;">
              <a href="${updateUrl}" class="button">${messages.buttonText}</a>
            </p>
            
            <div class="info">
              <strong>📝 Important:</strong> This link is unique to your family and will remain active throughout the school year.
            </div>
            
            <p>${messages.updateListTitle}</p>
            <ul>
              ${updateListItems}
            </ul>
            
            <p>${messages.noAccountText}</p>
            
            <p>${messages.contactText}</p>
            
            <p>${messages.thankYouText}</p>
            
            <p>Sincerely,<br>${messages.signature}</p>
          </div>
          <div class="footer">
            <p>${messages.footerText(messages.systemName, currentYear)}</p>
            <p style="font-size: 12px; color: #999;">${messages.automatedMessage}</p>
          </div>
        </div>
      </body>
      </html>
    `,
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
      console.log('Parent token:', parent.updateToken)
      console.log('Token length:', parent.updateToken?.length)

      // Construct update URL
      const baseUrl = EMAIL_CONFIG.APP_URL
      const updateUrl = `${baseUrl}/update/${parent.updateToken}`
      console.log('Update URL:', updateUrl)

      // Determine language (assume 'fr' for now, could be based on parent preference)
      const language = parent.preferredLanguage || 'fr'
      const template = getEmailTemplate(parentName, updateUrl, workflowData.schoolYear, language)

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
