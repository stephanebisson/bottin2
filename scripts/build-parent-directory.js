#!/usr/bin/env node

/**
 * Build Parent Directory Script
 *
 * Rewrites /parentDirectory from /parents: the copy of each parent that
 * non-admins read, without contact information until the parent confirms it
 * with the update form. The syncParentDirectory function keeps it in sync
 * afterwards; run this once after deploying that function, before deploying the
 * Firestore rules that stop non-admins reading /parents. Also removes directory
 * entries whose parent no longer exists.
 *
 * Usage:
 *   pnpm parents:directory:dev
 *   pnpm parents:directory:prod:dry-run
 *   pnpm parents:directory:prod
 *   NODE_ENV=production node scripts/build-parent-directory.js [--dry-run]
 *
 * Options:
 *   --dry-run  Show the counts without writing anything
 */

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { cert, deleteApp, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { toDirectoryEntry } from '../functions/parentDirectory.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ENV = process.env.NODE_ENV || 'development'
const DRY_RUN = process.argv.includes('--dry-run')

console.log(`🔧 Environment: ${ENV}`)
if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE - No data will be written\n')
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

async function buildParentDirectory () {
  const app = initializeFirebase()
  const db = getFirestore(app)

  try {
    const [parentsSnap, directorySnap] = await Promise.all([
      db.collection('parents').get(),
      db.collection('parentDirectory').get(),
    ])
    const parentIds = new Set(parentsSnap.docs.map(doc => doc.id))
    const orphans = directorySnap.docs.filter(doc => !parentIds.has(doc.id))
    const confirmed = parentsSnap.docs.filter(doc => doc.get('lastUpdated')).length

    console.log(`✅ ${parentsSnap.size} parents: ${confirmed} with contact information shown, ${parentsSnap.size - confirmed} hidden`)
    console.log(`🗑️  ${orphans.length} directory entries without a parent\n`)

    if (DRY_RUN) {
      console.log('✅ Dry run completed! Run without --dry-run to write the directory')
      return
    }

    // Safety check for production
    if (ENV === 'production') {
      console.log(`⚠️  WARNING: You are about to rewrite ${parentsSnap.size} directory entries in PRODUCTION!`)
      const answer = await askQuestion('\nType "BUILD" to continue: ')

      if (answer !== 'BUILD') {
        throw new Error('Build cancelled')
      }
    }

    const writer = db.bulkWriter()
    for (const doc of parentsSnap.docs) {
      writer.set(db.collection('parentDirectory').doc(doc.id), toDirectoryEntry(doc.data()))
    }
    for (const doc of orphans) {
      writer.delete(doc.ref)
    }
    await writer.close()

    console.log(`\n✅ Wrote ${parentsSnap.size} directory entries, removed ${orphans.length}`)
  } finally {
    await deleteApp(app)
  }
}

buildParentDirectory().catch(error => {
  console.error('\n❌ Building the parent directory failed:', error.message)
  process.exit(1)
})
