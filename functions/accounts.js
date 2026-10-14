const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')
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
 * Disable or re-enable the online directory accounts of parents (admin only).
 * Disable is called before the parent records are deleted; an account is left
 * active when another remaining parent record shares its email.
 * Enable is called after a parent is added or its email changes, so a parent
 * who was removed and re-added can sign in again.
 */
exports.setParentAccountsDisabled = onRequest({
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

    const { parentIds, disabled } = req.body || {}
    if (!Array.isArray(parentIds) || parentIds.some(id => typeof id !== 'string' || !id)) {
      return res.status(400).json({ error: 'parentIds must be an array of parent IDs' })
    }
    if (typeof disabled !== 'boolean') {
      return res.status(400).json({ error: 'disabled must be a boolean' })
    }

    const targetIds = new Set(parentIds)
    const parentsSnap = await db.collection('parents').get()
    const targetEmails = new Set()
    const otherEmails = new Set()
    for (const parentDoc of parentsSnap.docs) {
      const email = parentDoc.data().email?.toLowerCase().trim()
      if (email) {
        (targetIds.has(parentDoc.id) ? targetEmails : otherEmails).add(email)
      }
    }

    let updated = 0
    for (const email of targetEmails) {
      if (disabled && otherEmails.has(email)) {
        continue
      }
      try {
        const user = await getAuth().getUserByEmail(email)
        if (user.disabled !== disabled) {
          await getAuth().updateUser(user.uid, { disabled })
          if (disabled) {
            await getAuth().revokeRefreshTokens(user.uid)
          }
          updated++
        }
      } catch (error) {
        if (error.code !== 'auth/user-not-found') {
          throw error
        }
      }
    }

    return res.status(200).json({ updated })
  } catch (error) {
    console.error('Set parent accounts disabled error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

exports.getAccountStatus = getAccountStatus
