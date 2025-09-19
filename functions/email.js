const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const functions = require('firebase-functions')
const nodemailer = require('nodemailer')
const { FUNCTIONS_REGION } = require('./config')

// Get Firestore instance
const db = admin.firestore()

/**
 * Email configuration and templates
 */
function getEmailTransporter () {
  // Check if we're in emulator/development mode
  const isDevelopment = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'development'

  if (isDevelopment) {
    // For development, create a mock transporter that logs emails instead of sending them
    console.log('📧 Using development mode - emails will be logged, not sent')
    return {
      sendMail: async mailOptions => {
        console.log('🔍 MOCK EMAIL SENT:')
        console.log('📧 To:', mailOptions.to)
        console.log('📋 Subject:', mailOptions.subject)
        console.log('📝 Content preview:', mailOptions.html?.slice(0, 100) + '...')

        // Return a mock successful response
        return {
          messageId: 'mock-' + Date.now(),
          response: 'Mock email logged successfully',
        }
      },
    }
  }

  // For production, use configured email service
  const emailConfig = functions.config().email
  if (!emailConfig?.user || !emailConfig?.password) {
    throw new Error('Email configuration not found. Please set functions.config().email.user and functions.config().email.password')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailConfig.user,
      pass: emailConfig.password,
    },
  })
}

function getEmailTemplate (parentName, updateUrl, schoolYear, deadline, language = 'en') {
  const templates = {
    en: {
      subject: `${schoolYear} - Annual Information Update Required`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Annual Information Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1976d2; color: white; text-align: center; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📚 School Directory System</h1>
              <h2>Annual Information Update</h2>
            </div>
            <div class="content">
              <p>Dear <strong>${parentName}</strong>,</p>
              
              <p>As we begin the <strong>${schoolYear}</strong> school year, we need to update and verify the information in our school directory.</p>
              
              <p>Please take a few minutes to review and update your family's information by clicking the button below:</p>
              
              <p style="text-align: center;">
                <a href="${updateUrl}" class="button">Update My Information</a>
              </p>
              
              <div class="warning">
                <strong>⏰ Important:</strong> Please complete this update by <strong>${deadline}</strong>. This link is unique to your family and expires after 30 days.
              </div>
              
              <p>You will be able to update:</p>
              <ul>
                <li>Contact information (phone, address)</li>
                <li>Committee memberships and interests</li>
                <li>Directory participation preferences</li>
              </ul>
              
              <p><strong>No account required!</strong> Simply click the link above to get started. After submitting your information, you'll have the option to create an account for easier future access.</p>
              
              <p>If you have any questions or need assistance, please contact the school office.</p>
              
              <p>Thank you for helping us keep our directory accurate and up-to-date!</p>
              
              <p>Sincerely,<br>School Administration</p>
            </div>
            <div class="footer">
              <p>School Directory System | ${new Date().getFullYear()}</p>
              <p style="font-size: 12px; color: #999;">This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
    fr: {
      subject: `${schoolYear} - Mise à Jour Annuelle des Informations Requise`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Mise à Jour Annuelle des Informations</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1976d2; color: white; text-align: center; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📚 Système de Bottin Scolaire</h1>
              <h2>Mise à Jour Annuelle des Informations</h2>
            </div>
            <div class="content">
              <p>Cher/Chère <strong>${parentName}</strong>,</p>
              
              <p>Alors que nous commençons l'année scolaire <strong>${schoolYear}</strong>, nous devons mettre à jour et vérifier les informations dans notre bottin scolaire.</p>
              
              <p>Veuillez prendre quelques minutes pour réviser et mettre à jour les informations de votre famille en cliquant sur le bouton ci-dessous :</p>
              
              <p style="text-align: center;">
                <a href="${updateUrl}" class="button">Mettre à Jour Mes Informations</a>
              </p>
              
              <div class="warning">
                <strong>⏰ Important :</strong> Veuillez compléter cette mise à jour avant le <strong>${deadline}</strong>. Ce lien est unique à votre famille et expire après 30 jours.
              </div>
              
              <p>Vous pourrez mettre à jour :</p>
              <ul>
                <li>Informations de contact (téléphone, adresse)</li>
                <li>Adhésions aux comités et intérêts</li>
                <li>Préférences de participation au bottin</li>
              </ul>
              
              <p><strong>Aucun compte requis !</strong> Cliquez simplement sur le lien ci-dessus pour commencer. Après avoir soumis vos informations, vous aurez l'option de créer un compte pour un accès futur plus facile.</p>
              
              <p>Si vous avez des questions ou avez besoin d'assistance, veuillez contacter le bureau de l'école.</p>
              
              <p>Merci de nous aider à maintenir notre bottin précis et à jour !</p>
              
              <p>Sincèrement,<br>Administration Scolaire</p>
            </div>
            <div class="footer">
              <p>Système de Bottin Scolaire | ${new Date().getFullYear()}</p>
              <p style="font-size: 12px; color: #999;">Ceci est un message automatisé. Veuillez ne pas répondre à ce courriel.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
  }

  return templates[language] || templates.en
}

/**
 * Send email notifications to parents for annual update
 */
/**
 * Send email notifications to selected parents for annual update
 */
exports.sendUpdateEmailsToSelected = functions.region(FUNCTIONS_REGION).https.onRequest(async (req, res) => {
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
    const workflowDoc = await db.collection('updateSessions').doc(workflowId).get()

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

    // Get selected parents with update tokens
    const parentsSnapshot = await db.collection('parents')
      .where('updateToken', '!=', null)
      .get()

    const selectedParents = []
    for (const doc of parentsSnapshot.docs) {
      const parentData = doc.data()
      if (parentEmails.includes(parentData.email)) {
        selectedParents.push({
          id: doc.id,
          ...parentData,
        })
      }
    }

    if (selectedParents.length === 0) {
      return res.status(400).json({
        error: 'No selected parents found with update tokens',
      })
    }

    const transporter = getEmailTransporter()
    let emailsSent = 0
    const emailResults = []
    const batch = db.batch()

    // Format deadline for email
    const deadline = workflowData.deadline.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Send emails to selected parents only
    for (const parent of selectedParents) {
      const parentName = `${parent.first_name || ''} ${parent.last_name || ''}`.trim() || 'Parent'

      // Construct update URL
      const baseUrl = functions.config().app?.url || 'https://your-app-domain.com'
      const updateUrl = `${baseUrl}/update/${parent.updateToken}`

      // Determine language (assume 'en' for now, could be based on parent preference)
      const language = parent.preferredLanguage || 'en'
      const template = getEmailTemplate(parentName, updateUrl, workflowData.schoolYear, deadline, language)

      try {
        const mailOptions = {
          from: functions.config().email?.from || 'noreply@school.com',
          to: parent.email,
          subject: template.subject,
          html: template.html,
        }

        await transporter.sendMail(mailOptions)
        emailsSent++

        emailResults.push({
          email: parent.email,
          status: 'sent',
          sentAt: new Date(),
        })

        // Update participant status in workflow
        const participantPath = `participants.${parent.email}`
        batch.update(db.collection('updateSessions').doc(workflowId), {
          [`${participantPath}.emailSent`]: true,
          [`${participantPath}.emailSentAt`]: FieldValue.serverTimestamp(),
        })
      } catch (emailError) {
        console.error(`Failed to send email to ${parent.email}:`, emailError)
        emailResults.push({
          email: parent.email,
          status: 'failed',
          error: emailError.message,
        })
      }
    }

    // Update workflow stats
    const currentStats = workflowData.stats || {}
    batch.update(db.collection('updateSessions').doc(workflowId), {
      'stats.emailsSent': (currentStats.emailsSent || 0) + emailsSent,
    })

    await batch.commit()

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

/**
 * Send email notifications to all parents for annual update (original function)
 */
exports.sendUpdateEmails = functions.region(FUNCTIONS_REGION).https.onRequest(async (req, res) => {
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

    const { workflowId } = req.body

    if (!workflowId) {
      return res.status(400).json({
        error: 'workflowId is required',
      })
    }

    // Get workflow document
    const workflowDoc = await db.collection('updateSessions').doc(workflowId).get()

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

    // Get all parents with update tokens
    const parentsSnapshot = await db.collection('parents')
      .where('updateToken', '!=', null)
      .get()

    if (parentsSnapshot.empty) {
      return res.status(400).json({
        error: 'No parents found with update tokens',
      })
    }

    const transporter = getEmailTransporter()
    let emailsSent = 0
    const emailResults = []
    const batch = db.batch()

    // Format deadline for email
    const deadline = workflowData.deadline.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Send emails to all parents
    for (const parentDoc of parentsSnapshot.docs) {
      const parentData = parentDoc.data()
      const parentName = `${parentData.first_name || ''} ${parentData.last_name || ''}`.trim() || 'Parent'

      // Construct update URL
      const baseUrl = functions.config().app?.url || 'https://your-app-domain.com'
      const updateUrl = `${baseUrl}/update/${parentData.updateToken}`

      // Determine language (assume 'en' for now, could be based on parent preference)
      const language = parentData.preferredLanguage || 'en'
      const template = getEmailTemplate(parentName, updateUrl, workflowData.schoolYear, deadline, language)

      try {
        const mailOptions = {
          from: functions.config().email?.from || 'noreply@school.com',
          to: parentData.email,
          subject: template.subject,
          html: template.html,
        }

        await transporter.sendMail(mailOptions)
        emailsSent++

        emailResults.push({
          email: parentData.email,
          status: 'sent',
          sentAt: new Date(),
        })

        // Update participant status in workflow
        const participantPath = `participants.${parentData.email}`
        batch.update(db.collection('updateSessions').doc(workflowId), {
          [`${participantPath}.emailSent`]: true,
          [`${participantPath}.emailSentAt`]: FieldValue.serverTimestamp(),
        })
      } catch (emailError) {
        console.error(`Failed to send email to ${parentData.email}:`, emailError)
        emailResults.push({
          email: parentData.email,
          status: 'failed',
          error: emailError.message,
        })
      }
    }

    // Update workflow stats
    batch.update(db.collection('updateSessions').doc(workflowId), {
      'stats.emailsSent': emailsSent,
    })

    await batch.commit()

    console.log(`Email sending completed: ${emailsSent} emails sent out of ${parentsSnapshot.size} parents`)

    res.status(200).json({
      success: true,
      emailsSent,
      totalParents: parentsSnapshot.size,
      results: emailResults,
    })
  } catch (error) {
    console.error('Send emails error:', error)
    res.status(500).json({
      error: 'Internal server error occurred while sending emails',
    })
  }
})
