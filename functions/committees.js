const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const { onRequest } = require('firebase-functions/v2/https')
const { FUNCTIONS_REGION } = require('./config')

// Get Firestore instance
const db = admin.firestore()

/**
 * Update committee members
 * Can only be called by admins
 */
exports.updateCommitteeMembersV2 = onRequest({
  region: FUNCTIONS_REGION,
  cors: true,
}, async (req, res) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Verify authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const idToken = authHeader.split('Bearer ')[1]

    // Verify the ID token and get user claims
    const decodedToken = await admin.auth().verifyIdToken(idToken)

    // Check if caller is an admin
    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Only admins can update committee members' })
    }

    const { committeeId, members } = req.body

    if (!committeeId) {
      return res.status(400).json({ error: 'Committee ID is required' })
    }

    if (!Array.isArray(members)) {
      return res.status(400).json({ error: 'Members must be an array' })
    }

    // Validate members array
    for (const member of members) {
      if (!member.email || typeof member.email !== 'string') {
        return res.status(400).json({ error: 'Each member must have a valid email' })
      }
      if (!member.role || typeof member.role !== 'string') {
        return res.status(400).json({ error: 'Each member must have a valid role' })
      }
    }

    // Get the committee document
    const committeeRef = db.collection('committees').doc(committeeId)
    const committeeDoc = await committeeRef.get()

    if (!committeeDoc.exists) {
      return res.status(404).json({ error: 'Committee not found' })
    }

    // Update the committee with new members
    await committeeRef.update({
      members: members.map(member => ({
        email: member.email,
        role: member.role,
      })),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: decodedToken.uid,
    })

    console.log(`Committee ${committeeId} members updated by admin ${decodedToken.uid}`)

    return res.status(200).json({
      success: true,
      message: 'Committee members updated successfully',
      committeeId,
      memberCount: members.length,
    })
  } catch (error) {
    console.error('Error updating committee members:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})
