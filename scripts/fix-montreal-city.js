#!/usr/bin/env node

/**
 * Fix Montréal City Script
 *
 * Sets the city of every parent who wrote a variation of Montréal ("Montreal",
 * "MONTRÉAL", "montreal", "Montrel"...) to "Montréal". A variation matches
 * "montreal" ignoring accents, capitals and punctuation, or is one letter away
 * from it. Only the city changes; the syncParentDirectory function copies it to
 * /parentDirectory.
 *
 * Usage:
 *   pnpm parents:fix-montreal:dev:dry-run
 *   pnpm parents:fix-montreal:dev
 *   pnpm parents:fix-montreal:prod:dry-run
 *   pnpm parents:fix-montreal:prod
 *
 * Options:
 *   --dry-run  List the parents that would change without writing anything
 */

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { cert, deleteApp, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { ParentDTO } from '../src/dto/ParentDTO.js'
import { normalizeText } from '../src/utils/search.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ENV = process.env.NODE_ENV || 'development'
const DRY_RUN = process.argv.includes('--dry-run')

const MONTREAL = 'Montréal'

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

/**
 * Number of single-character edits (insert, delete, replace) to turn a into b
 */
function editDistance (a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    previous = current
  }
  return previous[b.length]
}

/**
 * Whether a city is a variation of Montréal: "Montreal", "MONTRÉAL", "Montrel"...
 */
function isMontrealVariation (city) {
  const letters = normalizeText(city).replace(/[^a-z]/g, '')
  return editDistance(letters, 'montreal') <= 1
}

async function fixMontrealCity () {
  const app = initializeFirebase()
  const db = getFirestore(app)

  try {
    console.log('📥 Fetching parents...')
    const snapshot = await db.collection('parents').get()

    // Compared with the stored city: the DTO trims it, which would hide "Montréal " with a space
    const toFix = snapshot.docs
      .map(doc => ({ doc, storedCity: doc.data().city, parent: new ParentDTO({ id: doc.id, ...doc.data() }) }))
      .filter(({ storedCity, parent }) => parent.city && storedCity !== MONTREAL && isMontrealVariation(parent.city))

    if (toFix.length === 0) {
      console.log(`\n✅ Every parent in Montréal already has "${MONTREAL}"`)
      return
    }

    console.log(`\n📋 ${toFix.length} of ${snapshot.size} parents to change to "${MONTREAL}":`)
    for (const { storedCity, parent } of toFix) {
      console.log(`   - ${parent.fullName}: "${storedCity}"`)
    }

    if (DRY_RUN) {
      console.log('\nRun without --dry-run to update them')
      return
    }

    if (ENV === 'production') {
      console.log(`\n⚠️  WARNING: You are about to update ${toFix.length} parents in PRODUCTION!`)
      const answer = await askQuestion('\nType "UPDATE" to continue: ')

      if (answer !== 'UPDATE') {
        throw new Error('Update cancelled')
      }
    }

    const writer = db.bulkWriter()
    for (const { doc, parent } of toFix) {
      // Through the DTO, so the city is sanitized like any other parent write
      writer.update(doc.ref, { city: parent.withUpdates({ city: MONTREAL }).city, updatedAt: new Date() })
    }
    await writer.close()

    console.log(`\n✅ Updated ${toFix.length} parents to "${MONTREAL}"`)
  } finally {
    await deleteApp(app)
  }
}

fixMontrealCity().catch(error => {
  console.error('\n❌ Fixing the city failed:', error.message)
  process.exit(1)
})
