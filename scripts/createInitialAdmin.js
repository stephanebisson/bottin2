#!/usr/bin/env node

/**
 * Initial Admin Setup Script
 *
 * This script creates the first admin user for the system.
 * It should only be run once during initial setup.
 *
 * Usage:
 *   node scripts/createInitialAdmin.js <email>
 *
 * Example:
 *   node scripts/createInitialAdmin.js admin@yourschool.com
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

async function createInitialAdmin (email) {
  try {
    console.log('🔍 Looking for user with email:', email)

    // First, check if any admins already exist
    const existingAdmins = await findExistingAdmins()
    if (existingAdmins.length > 0) {
      console.log('⚠️  Admin users already exist:')
      for (const admin of existingAdmins) {
        console.log(`   - ${admin.email} (${admin.uid})`)
      }
      console.log('   Initial setup has already been completed.')
      return
    }

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
          displayName: 'Initial Admin',
          emailVerified: true,
        })

        console.log('✅ Created new user:', user.email)
      } else {
        throw error
      }
    }

    // Set admin custom claims
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      adminSetAt: new Date().toISOString(),
      adminSetBy: 'SYSTEM_INITIAL_SETUP',
      initialAdmin: true,
    })

    console.log('🎯 Admin claims set successfully!')

    // Log the admin creation
    const db = admin.firestore()
    await db.collection('adminLogs').add({
      targetUid: user.uid,
      targetEmail: user.email,
      action: 'INITIAL_ADMIN_CREATED',
      performedBy: 'SYSTEM',
      performedByEmail: 'system@initial-setup',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        initialSetup: true,
        scriptVersion: '1.0.0',
      },
    })

    console.log('📝 Admin creation logged to database')

    console.log('\n🎉 Initial admin setup complete!')
    console.log('📧 Admin email:', user.email)
    console.log('🆔 Admin UID:', user.uid)
    console.log('\nNext steps:')
    console.log('1. The user can now sign in to the application')
    console.log('2. They will have access to the /admin route')
    console.log('3. They can grant admin access to other users through the admin panel')

    if (user.passwordHash === undefined) {
      console.log('\n⚠️  Note: This user was created without a password.')
      console.log('   They will need to use "Forgot Password" to set their password first.')
    }
  } catch (error) {
    console.error('❌ Error creating initial admin:', error)

    if (error.code === 'auth/email-already-exists') {
      console.error('   The email already exists. Try using the existing user.')
    } else if (error.code === 'auth/invalid-email') {
      console.error('   Invalid email format provided.')
    }

    process.exit(1)
  }
}

async function findExistingAdmins () {
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
        })
      }
    }

    nextPageToken = listUsersResult.pageToken
  } while (nextPageToken)

  return admins
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const email = process.argv[2]

  if (!email) {
    console.error('Usage: node scripts/createInitialAdmin.js <email>')
    console.error('Example: node scripts/createInitialAdmin.js admin@yourschool.com')
    process.exit(1)
  }

  createInitialAdmin(email)
    .then(() => {
      console.log('\n✨ Script completed successfully')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}

export { createInitialAdmin }
