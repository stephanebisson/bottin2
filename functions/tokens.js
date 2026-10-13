const crypto = require('node:crypto')
const { FieldValue, getFirestore } = require('firebase-admin/firestore')

const db = getFirestore()

function generateToken () {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Return the existing token for this parent + school year, or mint a new one.
 * Tokens are stored as document IDs in /tokens so lookup is always O(1).
 *
 * @param {string} parentId    - Firestore document ID of the parent
 * @param {string} schoolYear  - e.g. "2026-2027"
 * @returns {Promise<string>}  - the token string
 */
async function generateOrReuseToken (parentId, schoolYear) {
  const existing = await db.collection('tokens')
    .where('parentId', '==', parentId)
    .where('schoolYear', '==', schoolYear)
    .limit(1)
    .get()

  if (!existing.empty) {
    return existing.docs[0].id
  }

  const token = generateToken()
  await db.collection('tokens').doc(token).set({
    parentId,
    schoolYear,
    createdAt: FieldValue.serverTimestamp(),
  })

  return token
}

module.exports = { generateOrReuseToken }
