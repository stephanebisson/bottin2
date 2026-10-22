#!/usr/bin/env node

/**
 * Find Unauthorized Accounts Script
 *
 * Lists the Firebase Auth accounts whose email is not in the parents collection.
 * Only parents can create an account (restrictSignUpToParents in functions/auth.js),
 * but before that blocking function existed anyone could sign up by calling the
 * Auth API directly. A verified unauthorized account can read the whole
 * directory; an unverified one can't read anything.
 *
 * Admins don't need a parent record (the admin scripts create them), so they are
 * listed separately, not as unauthorized.
 *
 * Read only: nothing is changed.
 *
 * Usage:
 *   pnpm users:unauthorized:dev
 *   pnpm users:unauthorized:prod
 *   NODE_ENV=production node scripts/find-unauthorized-accounts.js
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, deleteApp, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ENV = process.env.NODE_ENV || 'development'

const NO_EMAIL = '(no email)'

console.log(`🔧 Environment: ${ENV}`)

/**
 * Initialize Firebase Admin: service account in production, emulators otherwise
 */
function initializeFirebase () {
  if (ENV === 'production') {
    const serviceAccountPath = path.join(__dirname, '..', 'credentials', 'firebase-service-account.json')

    if (!fs.existsSync(serviceAccountPath)) {
      const errorMsg = [
        '❌ Error: firebase-service-account.json not found!',
        'Please download your service account key from Firebase Console:',
        'Project Settings > Service Accounts > Generate New Private Key',
        `Save it as: ${serviceAccountPath}`,
      ].join('\n')
      throw new Error(errorMsg)
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    })

    console.log(`🏭 Connected to production project: ${serviceAccount.project_id}`)
    return app
  }

  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'

  const app = initializeApp({
    projectId: 'bottin2-3b41d',
  })

  console.log('🧪 Connected to local emulators')
  return app
}

function normalizeEmail (email) {
  return email?.toLowerCase().trim() || ''
}

async function listAllUsers (auth) {
  const users = []
  let pageToken

  do {
    const result = await auth.listUsers(1000, pageToken)
    users.push(...result.users)
    pageToken = result.pageToken
  } while (pageToken)

  return users
}

function formatDate (value) {
  return value ? new Date(value).toISOString().slice(0, 16).replace('T', ' ') : 'Never'
}

/**
 * Print accounts one per line: verified status, email, creation, last sign-in, UID
 */
function printAccounts (accounts) {
  const emailWidth = Math.max(30, ...accounts.map(user => (user.email || NO_EMAIL).length))
  const header = `${'#'.padEnd(4)} ${'✓'.padEnd(3)} ${'Email'.padEnd(emailWidth)} ${'Created'.padEnd(17)} ${'Last sign in'.padEnd(17)} UID`
  const separator = '='.repeat(header.length + 25)

  console.log(separator)
  console.log(header)
  console.log(separator)

  for (const [index, user] of accounts.entries()) {
    console.log([
      `${index + 1}.`.padEnd(4),
      (user.emailVerified ? '✅' : '❌').padEnd(3),
      (user.email || NO_EMAIL).padEnd(emailWidth),
      formatDate(user.metadata.creationTime).padEnd(17),
      formatDate(user.metadata.lastSignInTime).padEnd(17),
      user.uid,
    ].join(' '))
  }

  console.log(separator)
}

async function findUnauthorizedAccounts () {
  const app = initializeFirebase()

  try {
    console.log('🔍 Comparing accounts with the parents collection...\n')

    // Only the email field: no need to read the parents' personal information
    const [users, parentsSnapshot] = await Promise.all([
      listAllUsers(getAuth(app)),
      getFirestore(app).collection('parents').select('email').get(),
    ])

    const parentEmails = new Set(parentsSnapshot.docs
      .map(doc => normalizeEmail(doc.get('email')))
      .filter(Boolean))

    console.log(`✅ ${users.length} accounts, ${parentsSnapshot.size} parents (${parentEmails.size} distinct emails)\n`)

    const unauthorized = []
    const adminsWithoutParent = []
    for (const user of users) {
      if (parentEmails.has(normalizeEmail(user.email))) {
        continue
      }
      if (user.customClaims?.admin) {
        adminsWithoutParent.push(user)
      } else {
        unauthorized.push(user)
      }
    }

    if (adminsWithoutParent.length > 0) {
      console.log(`🔐 ${adminsWithoutParent.length} admin accounts without a parent record (expected for admins created with the scripts):`)
      printAccounts(adminsWithoutParent)
      console.log()
    }

    if (unauthorized.length === 0) {
      console.log('✅ No unauthorized accounts: every non-admin account belongs to a parent.')
      return
    }

    // Verified first (they could read the directory), then oldest first
    unauthorized.sort((a, b) => Number(b.emailVerified) - Number(a.emailVerified)
      || new Date(a.metadata.creationTime) - new Date(b.metadata.creationTime))

    const verifiedCount = unauthorized.filter(user => user.emailVerified).length

    console.log(`🚨 ${unauthorized.length} unauthorized accounts:`)
    printAccounts(unauthorized)
    console.log(`\n✅ Verified: ${verifiedCount} (could read the directory) | ❌ Unverified: ${unauthorized.length - verifiedCount} (no access)`)
    console.log('Review and delete them in Firebase Console > Authentication > Users.')
  } finally {
    await deleteApp(app)
  }
}

findUnauthorizedAccounts().catch(error => {
  console.error('❌ Error finding unauthorized accounts:', error.message)
  process.exit(1)
})
