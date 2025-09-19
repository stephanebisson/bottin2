#!/usr/bin/env node

/**
 * Admin Management Script
 *
 * This script allows you to manage admin privileges for any user.
 * Unlike createInitialAdmin.js, this script can be used at any time to grant or revoke admin access.
 *
 * Usage:
 *   node scripts/manageAdmin.js <action> <email>
 *
 * Actions:
 *   grant   - Grant admin privileges to a user
 *   revoke  - Revoke admin privileges from a user
 *   list    - List all current admins
 *   status  - Check admin status of a specific user
 *
 * Examples:
 *   node scripts/manageAdmin.js grant admin@yourschool.com
 *   node scripts/manageAdmin.js revoke user@example.com
 *   node scripts/manageAdmin.js list
 *   node scripts/manageAdmin.js status user@example.com
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Check if we're running in emulator mode
const isEmulator = process.env.NODE_ENV === 'development' || process.argv.includes('--emulator')

// Initialize Firebase Admin SDK
if (isEmulator) {
  // Emulator mode - use project ID without credentials
  console.log('🔧 Running in emulator mode')

  // Set emulator host for Auth (if not already set)
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'
  }
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'
  }

  admin.initializeApp({
    projectId: 'bottin2-3b41d', // Replace with your actual project ID
  })

  console.log('🔗 Connected to Firebase emulators')
} else {
  // Production mode - use service account credentials
  console.log('🏭 Running in production mode')

  const serviceAccountPath = path.join(__dirname, '../credentials/firebase-service-account.json')

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Firebase service account file not found at:', serviceAccountPath)
    console.error('   Please ensure you have set up the credentials as described in credentials/README.md')
    process.exit(1)
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  })

  console.log('🔗 Connected to Firebase production')
}

/**
 * Grant admin privileges to a user
 */
async function grantAdmin (email) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`)

    // Try to find user by email
    let user
    try {
      user = await admin.auth().getUserByEmail(email)
      console.log('✅ Found existing user:', user.email)
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('🔧 User not found, creating new user...')

        // Create the user
        user = await admin.auth().createUser({
          email,
          displayName: 'Admin User',
          emailVerified: true,
        })

        console.log('✅ Created new user:', user.email)
      } else {
        throw error
      }
    }

    // Check if user is already admin
    const existingUser = await admin.auth().getUser(user.uid)
    if (existingUser.customClaims?.admin) {
      console.log('⚠️  User is already an admin')
      return
    }

    // Set admin custom claims
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      adminSetAt: new Date().toISOString(),
      adminSetBy: 'SCRIPT_ADMIN_MANAGER',
      grantedBy: 'DIRECT_SCRIPT_ACCESS',
    })

    console.log('🎯 Admin claims set successfully!')

    // Log the admin creation
    const db = admin.firestore()
    await db.collection('adminLogs').add({
      targetUid: user.uid,
      targetEmail: user.email,
      action: 'ADMIN_GRANTED',
      performedBy: 'SCRIPT',
      performedByEmail: 'script@admin-manager',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        scriptVersion: '1.0.0',
        method: 'direct-script',
      },
    })

    console.log('📝 Admin grant logged to database')
    console.log(String.raw`\n🎉 Admin privileges granted successfully!`)
    console.log('📧 Admin email:', user.email)
    console.log('🆔 Admin UID:', user.uid)

    if (user.passwordHash === undefined) {
      console.log(String.raw`\n⚠️  Note: This user was created without a password.`)
      console.log('   They will need to use "Forgot Password" to set their password first.')
    }
  } catch (error) {
    console.error('❌ Error granting admin privileges:', error)
    if (error.code === 'auth/invalid-email') {
      console.error('   Invalid email format provided.')
    }
    process.exit(1)
  }
}

/**
 * Revoke admin privileges from a user
 */
async function revokeAdmin (email) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`)

    let user
    try {
      user = await admin.auth().getUserByEmail(email)
      console.log('✅ Found user:', user.email)
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('❌ User not found')
        return
      } else {
        throw error
      }
    }

    // Check if user is admin
    const existingUser = await admin.auth().getUser(user.uid)
    if (!existingUser.customClaims?.admin) {
      console.log('⚠️  User is not an admin')
      return
    }

    // Remove admin custom claims
    const updatedClaims = { ...existingUser.customClaims }
    delete updatedClaims.admin
    updatedClaims.adminRevokedAt = new Date().toISOString()
    updatedClaims.adminRevokedBy = 'SCRIPT_ADMIN_MANAGER'

    await admin.auth().setCustomUserClaims(user.uid, updatedClaims)

    console.log('🎯 Admin claims revoked successfully!')

    // Log the admin revocation
    const db = admin.firestore()
    await db.collection('adminLogs').add({
      targetUid: user.uid,
      targetEmail: user.email,
      action: 'ADMIN_REVOKED',
      performedBy: 'SCRIPT',
      performedByEmail: 'script@admin-manager',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        scriptVersion: '1.0.0',
        method: 'direct-script',
      },
    })

    console.log('📝 Admin revocation logged to database')
    console.log(String.raw`\n🎉 Admin privileges revoked successfully!`)
    console.log('📧 User email:', user.email)
    console.log('🆔 User UID:', user.uid)
  } catch (error) {
    console.error('❌ Error revoking admin privileges:', error)
    process.exit(1)
  }
}

/**
 * List all admin users
 */
async function listAdmins () {
  try {
    console.log('🔍 Searching for admin users...')

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

    if (admins.length === 0) {
      console.log('⚠️  No admin users found')
    } else {
      console.log(`\\n📋 Found ${admins.length} admin user(s):`)
      console.log(''.padEnd(80, '='))

      for (const [index, admin] of admins.entries()) {
        console.log(`${index + 1}. ${admin.email}`)
        console.log(`   UID: ${admin.uid}`)
        console.log(`   Display Name: ${admin.displayName || 'Not set'}`)
        console.log(`   Admin Since: ${admin.adminSetAt || 'Unknown'}`)
        console.log(`   Granted By: ${admin.adminSetBy || 'Unknown'}`)
        console.log(`   Status: ${admin.disabled ? '🚫 Disabled' : '✅ Active'}`)
        console.log('')
      }
    }
  } catch (error) {
    console.error('❌ Error listing admin users:', error)
    process.exit(1)
  }
}

/**
 * Check admin status of a specific user
 */
async function checkStatus (email) {
  try {
    console.log(`🔍 Checking admin status for: ${email}`)

    let user
    try {
      user = await admin.auth().getUserByEmail(email)
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('❌ User not found')
        return
      } else {
        throw error
      }
    }

    const isAdmin = !!user.customClaims?.admin

    console.log(String.raw`\n📊 User Status:`)
    console.log(`   Email: ${user.email}`)
    console.log(`   UID: ${user.uid}`)
    console.log(`   Display Name: ${user.displayName || 'Not set'}`)
    console.log(`   Admin: ${isAdmin ? '✅ Yes' : '❌ No'}`)

    if (isAdmin) {
      console.log(`   Admin Since: ${user.customClaims.adminSetAt || 'Unknown'}`)
      console.log(`   Granted By: ${user.customClaims.adminSetBy || 'Unknown'}`)
    }

    console.log(`   Account Status: ${user.disabled ? '🚫 Disabled' : '✅ Active'}`)
  } catch (error) {
    console.error('❌ Error checking user status:', error)
    process.exit(1)
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const action = process.argv[2]
  const email = process.argv[3]

  if (!action) {
    console.error('Usage: node scripts/manageAdmin.js <action> [email]')
    console.error('')
    console.error('Actions:')
    console.error('  grant <email>   - Grant admin privileges to a user')
    console.error('  revoke <email>  - Revoke admin privileges from a user')
    console.error('  list            - List all current admins')
    console.error('  status <email>  - Check admin status of a specific user')
    console.error('')
    console.error('Examples:')
    console.error('  node scripts/manageAdmin.js grant admin@yourschool.com')
    console.error('  node scripts/manageAdmin.js revoke user@example.com')
    console.error('  node scripts/manageAdmin.js list')
    console.error('  node scripts/manageAdmin.js status user@example.com')
    process.exit(1)
  }

  const runAction = async () => {
    try {
      switch (action) {
        case 'grant': {
          if (!email) {
            console.error('Email is required for grant action')
            process.exit(1)
          }
          await grantAdmin(email)
          break
        }

        case 'revoke': {
          if (!email) {
            console.error('Email is required for revoke action')
            process.exit(1)
          }
          await revokeAdmin(email)
          break
        }

        case 'list': {
          await listAdmins()
          break
        }

        case 'status': {
          if (!email) {
            console.error('Email is required for status action')
            process.exit(1)
          }
          await checkStatus(email)
          break
        }

        default: {
          console.error(`Unknown action: ${action}`)
          console.error('Valid actions: grant, revoke, list, status')
          process.exit(1)
        }
      }

      console.log(String.raw`\n✨ Script completed successfully`)
      process.exit(0)
    } catch (error) {
      console.error('❌ Script failed:', error)
      process.exit(1)
    }
  }

  runAction()
}

export { checkStatus, grantAdmin, listAdmins, revokeAdmin }
