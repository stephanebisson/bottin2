const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')
const { onDocumentWritten } = require('firebase-functions/v2/firestore')
const { onRequest } = require('firebase-functions/v2/https')
const { FUNCTIONS_REGION } = require('./config')

const db = getFirestore()

/**
 * Online directory account status for an email address.
 * 'active'     - account exists and its email is verified
 * 'unverified' - account exists but the verification link was never clicked
 * 'none'       - no account
 *
 * @param {string} email
 * @returns {Promise<'active'|'unverified'|'none'>}
 */
async function getAccountStatus (email) {
  if (!email) {
    return 'none'
  }
  try {
    const user = await getAuth().getUserByEmail(email)
    return user.emailVerified ? 'active' : 'unverified'
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return 'none'
    }
    throw error
  }
}

/**
 * Find the signed-in parent from an `Authorization: Bearer <Firebase ID token>`
 * header: the parent whose email is the account's verified email.
 *
 * @param {string} authHeader
 * @returns {Promise<{ parentDoc: object|null, uid?: string, status?: number, reason?: string }>}
 */
async function findSignedInParent (authHeader) {
  let decodedToken
  try {
    decodedToken = await getAuth().verifyIdToken(authHeader.split('Bearer ', 2)[1])
  } catch {
    return { parentDoc: null, status: 401, reason: 'invalid_id_token' }
  }
  if (!decodedToken.email || !decodedToken.email_verified) {
    return { parentDoc: null, status: 403, reason: 'email_not_verified' }
  }
  const snapshot = await db.collection('parents')
    .where('email', '==', decodedToken.email.toLowerCase())
    .limit(1)
    .get()
  return snapshot.empty
    ? { parentDoc: null, status: 404, reason: 'parent_not_found' }
    : { parentDoc: snapshot.docs[0], uid: decodedToken.uid }
}

/**
 * Return the account status of every parent, keyed by parent ID (admin only)
 */
exports.getParentAccountStatuses = onRequest({
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

    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(authHeader.split('Bearer ', 2)[1])
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // One pass over all auth users rather than one lookup per parent
    const statusByEmail = new Map()
    let nextPageToken
    do {
      const result = await getAuth().listUsers(1000, nextPageToken)
      for (const user of result.users) {
        if (user.email) {
          statusByEmail.set(user.email.toLowerCase(), user.emailVerified ? 'active' : 'unverified')
        }
      }
      nextPageToken = result.pageToken
    } while (nextPageToken)

    const parentsSnap = await db.collection('parents').get()
    const statuses = {}
    for (const parentDoc of parentsSnap.docs) {
      const email = parentDoc.data().email?.toLowerCase()
      statuses[parentDoc.id] = (email && statusByEmail.get(email)) || 'none'
    }

    return res.status(200).json({ statuses })
  } catch (error) {
    console.error('Get parent account statuses error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

/**
 * Delete the online directory account of an email that leaves the parents
 * collection: the parent was removed, or an admin changed their email.
 * Parents cannot change their own email; with a new email they sign up again.
 * The account is kept when another parent record still has that email.
 */
exports.deleteOrphanedParentAccount = onDocumentWritten({
  region: FUNCTIONS_REGION,
  document: 'parents/{parentId}',
}, async event => {
  const oldEmail = event.data.before.data()?.email?.toLowerCase().trim()
  const newEmail = event.data.after.data()?.email?.toLowerCase().trim()
  if (!oldEmail || oldEmail === newEmail) {
    return
  }

  const stillUsed = await db.collection('parents').where('email', '==', oldEmail).limit(1).get()
  if (!stillUsed.empty) {
    return
  }

  try {
    const user = await getAuth().getUserByEmail(oldEmail)
    await getAuth().deleteUser(user.uid)
    console.log(`Deleted account of parent ${event.params.parentId}`)
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error
    }
  }
})

exports.getAccountStatus = getAccountStatus
exports.findSignedInParent = findSignedInParent
