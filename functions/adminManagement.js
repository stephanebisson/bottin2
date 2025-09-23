const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { FUNCTIONS_REGION } = require('./config')

// Get Firestore instance
const db = admin.firestore()

/**
 * Set admin custom claim for a user
 * Can only be called by existing admins or during initial setup
 */
exports.setAdminClaimV2 = onCall({
  region: FUNCTIONS_REGION,
}, async request => {
  try {
    // Verify the request is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { uid, isAdmin = true } = request.data

    if (!uid) {
      throw new HttpsError('invalid-argument', 'User UID is required')
    }

    // Check if caller is already an admin (except during initial setup)
    const isInitialSetup = await checkInitialSetup()

    if (!isInitialSetup && !request.auth.token.admin) {
      throw new HttpsError(
        'permission-denied',
        'Only admins can set admin claims',
      )
    }

    // Get user to verify they exist
    let targetUser
    try {
      targetUser = await admin.auth().getUser(uid)
    } catch {
      throw new HttpsError('not-found', 'User not found')
    }

    // Set the admin custom claim
    await admin.auth().setCustomUserClaims(uid, {
      admin: isAdmin,
      adminSetAt: new Date().toISOString(),
      adminSetBy: request.auth.uid,
    })

    // Log the admin change
    await logAdminChange({
      targetUid: uid,
      targetEmail: targetUser.email,
      action: isAdmin ? 'ADMIN_GRANTED' : 'ADMIN_REVOKED',
      performedBy: request.auth.uid,
      performedByEmail: request.auth.token.email,
      timestamp: FieldValue.serverTimestamp(),
    })

    console.log(`Admin claim ${isAdmin ? 'granted to' : 'revoked from'} ${targetUser.email} by ${request.auth.token.email}`)

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
exports.getAdminStatusV2 = onCall({
  region: FUNCTIONS_REGION,
}, async request => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    // Force token refresh to get latest claims
    const user = await admin.auth().getUser(request.auth.uid)
    const customClaims = user.customClaims || {}

    return {
      isAdmin: !!customClaims.admin,
      claims: customClaims,
      uid: request.auth.uid,
      email: request.auth.token.email,
    }
  } catch (error) {
    console.error('Get admin status error:', error)
    throw new HttpsError('internal', 'Failed to get admin status')
  }
})

/**
 * List all admin users (admin only)
 */
exports.listAdminsV2 = onCall({
  region: FUNCTIONS_REGION,
}, async request => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    if (!request.auth.token.admin) {
      throw new HttpsError('permission-denied', 'Admin access required')
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
    throw new HttpsError('internal', 'Failed to list admins')
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
