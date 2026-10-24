#!/usr/bin/env node

/**
 * Remove Expired Tokens Script
 *
 * Deletes the update tokens (/tokens) that no longer work: their school year's
 * update deadline has passed (UPDATE_DEADLINE in functions/schoolYear.js), or
 * they have no school year. Same rule as resolveParent in functions/parentUpdate.js.
 *
 * Usage:
 *   pnpm tokens:cleanup:dev:dry-run
 *   pnpm tokens:cleanup:prod:dry-run
 *   pnpm tokens:cleanup:prod
 *   NODE_ENV=production node scripts/remove-expired-tokens.js [--dry-run]
 *
 * Options:
 *   --dry-run  List the expired tokens without deleting them
 */

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { cert, deleteApp, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { isPastUpdateDeadline } from '../functions/schoolYear.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ENV = process.env.NODE_ENV || 'development'
const DRY_RUN = process.argv.includes('--dry-run')

const NO_SCHOOL_YEAR = '(no school year)'

console.log(`🔧 Environment: ${ENV}`)
if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE - No data will be deleted\n')
}

/**
 * Initialize Firebase Admin: service account in production, emulator otherwise
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

  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'

  const app = initializeApp({
    projectId: 'bottin2-3b41d',
  })

  console.log('🧪 Connected to local emulator')
  return app
}

/**
 * Prompt user for confirmation
 */
function askQuestion (query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close()
      resolve(answer)
    })
  })
}

// Same rule as resolveParent in functions/parentUpdate.js
function isExpired (token) {
  return !token.schoolYear || isPastUpdateDeadline(token.schoolYear)
}

function formatDate (timestamp) {
  return timestamp?.toDate ? timestamp.toDate().toISOString().slice(0, 10) : 'unknown'
}

async function removeExpiredTokens () {
  const app = initializeFirebase()
  const db = getFirestore(app)

  try {
    console.log('🔍 Looking for expired tokens...\n')

    const snapshot = await db.collection('tokens').get()
    const expired = snapshot.docs.filter(doc => isExpired(doc.data()))

    console.log(`✅ ${snapshot.size} tokens: ${expired.length} expired, ${snapshot.size - expired.length} still valid\n`)

    if (expired.length === 0) {
      console.log('✅ Nothing to remove.')
      return
    }

    const countBySchoolYear = new Map()
    for (const doc of expired) {
      const schoolYear = doc.get('schoolYear') || NO_SCHOOL_YEAR
      countBySchoolYear.set(schoolYear, (countBySchoolYear.get(schoolYear) || 0) + 1)
    }

    console.log('📅 Expired tokens by school year:')
    for (const [schoolYear, count] of [...countBySchoolYear].toSorted(([a], [b]) => a.localeCompare(b))) {
      console.log(`  ${schoolYear}: ${count}`)
    }

    console.log('\n🗑️  Expired tokens:')
    for (const doc of expired) {
      const { parentId, schoolYear, createdAt } = doc.data()
      // Only the start of the token: even expired, the full value is a credential
      console.log(`  ${doc.id.slice(0, 8)}...  ${(schoolYear || NO_SCHOOL_YEAR).padEnd(16)}  created ${formatDate(createdAt)}  parent ${parentId}`)
    }

    if (DRY_RUN) {
      console.log(`\n✅ Dry run completed! Would delete ${expired.length} tokens`)
      console.log('Run without --dry-run to actually delete them')
      return
    }

    // Safety check for production
    if (ENV === 'production') {
      console.log(`\n⚠️  WARNING: You are about to delete ${expired.length} tokens from PRODUCTION!`)
      const answer = await askQuestion('\nType "DELETE" to continue: ')

      if (answer !== 'DELETE') {
        throw new Error('Deletion cancelled')
      }
    }

    const writer = db.bulkWriter()
    for (const doc of expired) {
      writer.delete(doc.ref)
    }
    await writer.close()

    console.log(`\n✅ Deleted ${expired.length} expired tokens`)
  } finally {
    await deleteApp(app)
  }
}

removeExpiredTokens().catch(error => {
  console.error('\n❌ Removing expired tokens failed:', error.message)
  process.exit(1)
})
