const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const functions = require('firebase-functions')
const { FUNCTIONS_REGION } = require('./config')

// Get Firestore instance
const db = admin.firestore()

/**
 * Set admin custom claim for a user
 * Can only be called by existing admins or during initial setup
 */
exports.setAdminClaim = functions.region(FUNCTIONS_REGION).https.onCall(async (data, context) => {
  try {
    // Verify the request is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { uid, isAdmin = true } = data

    if (!uid) {
      throw new functions.https.HttpsError('invalid-argument', 'User UID is required')
    }

    // Check if caller is already an admin (except during initial setup)
    const isInitialSetup = await checkInitialSetup()

    if (!isInitialSetup && !context.auth.token.admin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can set admin claims',
      )
    }

    // Get user to verify they exist
    let targetUser
    try {
      targetUser = await admin.auth().getUser(uid)
    } catch {
      throw new functions.https.HttpsError('not-found', 'User not found')
    }

    // Set the admin custom claim
    await admin.auth().setCustomUserClaims(uid, {
      admin: isAdmin,
      adminSetAt: new Date().toISOString(),
      adminSetBy: context.auth.uid,
    })

    // Log the admin change
    await logAdminChange({
      targetUid: uid,
      targetEmail: targetUser.email,
      action: isAdmin ? 'ADMIN_GRANTED' : 'ADMIN_REVOKED',
      performedBy: context.auth.uid,
      performedByEmail: context.auth.token.email,
      timestamp: FieldValue.serverTimestamp(),
    })

    console.log(`Admin claim ${isAdmin ? 'granted to' : 'revoked from'} ${targetUser.email} by ${context.auth.token.email}`)

    return {
      success: true,
      message: `Admin access ${isAdmin ? 'granted to' : 'revoked from'} ${targetUser.email}`,
      user: {
        uid: targetUser.uid,
        email: targetUser.email,
        admin: isAdmin,
      },
    }
  } catch (error) {
    console.error('Set admin claim error:', error)
    throw error
  }
})

/**
 * Get admin status for current user
 */
exports.getAdminStatus = functions.region(FUNCTIONS_REGION).https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    // Force token refresh to get latest claims
    const user = await admin.auth().getUser(context.auth.uid)
    const customClaims = user.customClaims || {}

    return {
      isAdmin: !!customClaims.admin,
      claims: customClaims,
      uid: context.auth.uid,
      email: context.auth.token.email,
    }
  } catch (error) {
    console.error('Get admin status error:', error)
    throw new functions.https.HttpsError('internal', 'Failed to get admin status')
  }
})

/**
 * List all admin users (admin only)
 */
exports.listAdmins = functions.region(FUNCTIONS_REGION).https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    if (!context.auth.token.admin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required')
    }

    const admins = []
    let nextPageToken

    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken)

      for (const user of listUsersResult.users) {
        if (user.customClaims?.admin) {
          admins.push({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            adminSetAt: user.customClaims.adminSetAt,
            adminSetBy: user.customClaims.adminSetBy,
            disabled: user.disabled,
          })
        }
      }

      nextPageToken = listUsersResult.pageToken
    } while (nextPageToken)

    return { admins }
  } catch (error) {
    console.error('List admins error:', error)
    throw new functions.https.HttpsError('internal', 'Failed to list admins')
  }
})

/**
 * Check if this is initial setup (no admins exist yet)
 */
async function checkInitialSetup () {
  try {
    let hasAdmin = false
    let nextPageToken

    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken)

      for (const user of listUsersResult.users) {
        if (user.customClaims?.admin) {
          hasAdmin = true
          break
        }
      }

      if (hasAdmin) {
        break
      }
      nextPageToken = listUsersResult.pageToken
    } while (nextPageToken)

    return !hasAdmin // Return true if no admins exist (initial setup)
  } catch (error) {
    console.error('Check initial setup error:', error)
    return false
  }
}

/**
 * Log admin changes for audit trail
 */
async function logAdminChange (changeData) {
  try {
    await db.collection('adminLogs').add(changeData)
  } catch (error) {
    console.error('Failed to log admin change:', error)
    // Don't throw error as this is just logging
  }
}
