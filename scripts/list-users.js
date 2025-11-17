#!/usr/bin/env node

/**
 * List Users Script
 *
 * This script lists all Firebase Auth users with their metadata including email verification status.
 *
 * Usage:
 *   node scripts/list-users.js [options]
 *
 * Options:
 *   --emulator       - Use Firebase emulator instead of production
 *   --verified       - Show only verified users
 *   --unverified     - Show only unverified users
 *   --format=json    - Output as JSON
 *   --format=csv     - Output as CSV
 *
 * Examples:
 *   node scripts/list-users.js
 *   node scripts/list-users.js --emulator
 *   node scripts/list-users.js --unverified
 *   node scripts/list-users.js --format=csv > users.csv
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Parse command line arguments
const args = process.argv.slice(2)
const isEmulator = process.env.NODE_ENV === 'development' || args.includes('--emulator')
const showVerifiedOnly = args.includes('--verified')
const showUnverifiedOnly = args.includes('--unverified')
const formatArg = args.find(arg => arg.startsWith('--format='))
const outputFormat = formatArg ? formatArg.split('=')[1] : 'table'

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
    projectId: 'bottin2-3b41d',
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
 * List all users with their metadata
 */
async function listUsers () {
  try {
    console.log('🔍 Fetching all users...\n')

    const users = []
    let pageToken

    // Fetch all users (pagination)
    do {
      const listUsersResult = await admin.auth().listUsers(1000, pageToken)
      users.push(...listUsersResult.users)
      pageToken = listUsersResult.pageToken
    } while (pageToken)

    console.log(`✅ Found ${users.length} total users\n`)

    // Filter users based on verification status
    let filteredUsers = users
    if (showVerifiedOnly) {
      filteredUsers = users.filter(user => user.emailVerified)
      console.log(`✅ Showing ${filteredUsers.length} verified users\n`)
    } else if (showUnverifiedOnly) {
      filteredUsers = users.filter(user => !user.emailVerified)
      console.log(`⚠️  Showing ${filteredUsers.length} unverified users\n`)
    }

    // Prepare user data
    const userData = filteredUsers.map(user => ({
      uid: user.uid,
      email: user.email || 'N/A',
      displayName: user.displayName || 'N/A',
      emailVerified: user.emailVerified,
      disabled: user.disabled || false,
      createdAt: user.metadata.creationTime,
      lastSignIn: user.metadata.lastSignInTime || 'Never',
      isAdmin: user.customClaims?.admin || false,
      providers: user.providerData.map(p => p.providerId).join(', ') || 'N/A',
    }))

    // Output based on format
    if (outputFormat === 'json') {
      console.log(JSON.stringify(userData, null, 2))
    } else if (outputFormat === 'csv') {
      // CSV header
      console.log('UID,Email,Display Name,Email Verified,Disabled,Admin,Created At,Last Sign In,Providers')
      // CSV rows
      for (const user of userData) {
        console.log([
          user.uid,
          user.email,
          user.displayName,
          user.emailVerified,
          user.disabled,
          user.isAdmin,
          user.createdAt,
          user.lastSignIn,
          user.providers,
        ].map(v => `"${v}"`).join(','))
      }
    } else {
      // Table format (default) - one user per line
      if (userData.length === 0) {
        console.log('No users found.')
      } else {
        // Calculate column widths
        const maxEmailWidth = Math.max(30, ...userData.map(u => u.email.length))
        const maxNameWidth = Math.max(20, ...userData.map(u => u.displayName.length))

        // Print header
        const header = `${'#'.padEnd(4)} ${'✓'.padEnd(3)} ${'Email'.padEnd(maxEmailWidth)} ${'Display Name'.padEnd(maxNameWidth)} ${'Admin'.padEnd(6)} ${'Created'.padEnd(20)} ${'Last Sign In'.padEnd(20)}`
        const separator = '='.repeat(header.length)

        console.log(separator)
        console.log(header)
        console.log(separator)

        // Print each user on one line
        for (const [index, user] of userData.entries()) {
          const num = `${index + 1}.`.padEnd(4)
          const verifiedIcon = (user.emailVerified ? '✅' : '❌').padEnd(3)
          const email = user.email.padEnd(maxEmailWidth)
          const displayName = user.displayName.padEnd(maxNameWidth)
          const admin = (user.isAdmin ? 'Yes' : 'No').padEnd(6)
          const created = new Date(user.createdAt).toISOString().slice(0, 19).replace('T', ' ').padEnd(20)
          const lastSignIn = (user.lastSignIn === 'Never' ? 'Never' : new Date(user.lastSignIn).toISOString().slice(0, 19).replace('T', ' ')).padEnd(20)

          console.log(`${num} ${verifiedIcon} ${email} ${displayName} ${admin} ${created} ${lastSignIn}`)
        }

        console.log(separator)

        // Summary statistics
        const verifiedCount = userData.filter(u => u.emailVerified).length
        const unverifiedCount = userData.filter(u => !u.emailVerified).length
        const adminCount = userData.filter(u => u.isAdmin).length
        const disabledCount = userData.filter(u => u.disabled).length

        console.log(`\nTotal: ${userData.length} | ✅ Verified: ${verifiedCount} | ❌ Unverified: ${unverifiedCount} | 🔐 Admins: ${adminCount} | 🚫 Disabled: ${disabledCount}`)
      }
    }
  } catch (error) {
    console.error('❌ Error listing users:', error)
    process.exit(1)
  } finally {
    // Clean up
    await admin.app().delete()
  }
}

// Run the script
listUsers().catch(error => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})
