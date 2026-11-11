#!/usr/bin/env node

/**
 * Export Parent Emails Script
 *
 * Exports the email of every parent, one per line, sorted and without
 * duplicates (two parents can share an email). Parents without an email are
 * left out.
 *
 * The emails go to stdout and progress messages to stderr, so the list can be
 * saved straight to a file.
 *
 * Usage:
 *   pnpm -s export:parents:emails:prod > courriels.txt
 *   pnpm -s export:parents:emails:dev
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { ParentDTO } from '../src/dto/ParentDTO.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ENV = process.env.NODE_ENV || 'development'

// Progress messages go to stderr; stdout carries only the emails
const log = (...args) => console.error(...args)

log(`🔧 Environment: ${ENV}`)

/**
 * Initialize Firebase Admin: service account in production, emulator otherwise
 */
function initializeFirebase () {
  let app
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

    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    })

    log(`✅ Connected to production project: ${serviceAccount.project_id}`)
  } else {
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'

    app = initializeApp({
      projectId: 'bottin2-3b41d',
    })

    log('✅ Connected to local emulator')
  }

  return getFirestore(app)
}

/**
 * Main export function
 */
async function exportParentEmails () {
  try {
    const db = initializeFirebase()

    log('📥 Fetching parents from database...')
    const snapshot = await db.collection('parents').get()

    // The DTO trims and lowercases emails and drops invalid ones
    const parents = snapshot.docs.map(doc => new ParentDTO({ id: doc.id, ...doc.data() }))
    const emails = [...new Set(parents.map(parent => parent.email).filter(Boolean))]
      .toSorted((a, b) => a.localeCompare(b))

    if (emails.length > 0) {
      // Wait for stdout to flush before the process exits
      await new Promise(resolve => process.stdout.write(`${emails.join('\n')}\n`, resolve))
    }

    const withoutEmail = parents.filter(parent => !parent.email).length
    log(`\n📊 ${parents.length} parents: ${emails.length} unique emails, ${withoutEmail} without email`)
  } catch (error) {
    console.error('\n💥 Export failed:', error.message)
    process.exit(1)
  }
}

exportParentEmails()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
