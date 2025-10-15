#!/usr/bin/env node

/**
 * Firestore Document ID Migration Script
 *
 * This script migrates a document from one ID to another within Firestore.
 * It reads the source document, writes it under the new path, and deletes the original
 * document, all within a single transaction to ensure data consistency.
 *
 * Usage:
 *   Development: NODE_ENV=development node scripts/migrate-document-id.js <oldPath> <newPath>
 *   Production:  NODE_ENV=production node scripts/migrate-document-id.js <oldPath> <newPath>
 *
 * Examples:
 *   Top-level documents:
 *     node scripts/migrate-document-id.js parents/old@email.com parents/new@email.com
 *     npm run migrate:dev -- parents/old@email.com parents/new@email.com
 *     npm run migrate:prod -- parents/old@email.com parents/new@email.com
 *
 *   Subcollection documents:
 *     node scripts/migrate-document-id.js parents/parent@email.com/students/oldId parents/parent@email.com/students/newId
 *     npm run migrate:dev -- parents/parent@email.com/students/oldId parents/parent@email.com/students/newId
 */

import { readFileSync } from 'node:fs'
import dotenv from 'dotenv'
import admin from 'firebase-admin'

dotenv.config()

// Configuration
const config = {
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'your-project-id',
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './credentials/firebase-service-account.json',
    useEmulator: process.env.NODE_ENV === 'development',
  },
}

// Initialize Firebase Admin
async function initializeFirebase () {
  try {
    const firebaseConfig = {
      projectId: config.firebase.projectId,
    }

    // Add service account credentials for production
    if (!config.firebase.useEmulator) {
      const serviceAccount = JSON.parse(
        readFileSync(config.firebase.serviceAccountPath, 'utf8'),
      )
      firebaseConfig.credential = admin.credential.cert(serviceAccount)
    }

    admin.initializeApp(firebaseConfig)

    const db = admin.firestore()

    // Connect to emulator if in development
    if (config.firebase.useEmulator) {
      db.settings({
        host: 'localhost:8080',
        ssl: false,
      })
      console.log('🔧 Connected to Firestore emulator')
    } else {
      console.log('🔥 Connected to production Firestore')
    }

    return db
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message)
    throw error
  }
}

// Parse document path into collection and document ID
function parsePath (path) {
  const parts = path.split('/')

  // Firestore document paths must have an even number of segments
  // Top-level: collection/doc (2 segments)
  // Subcollection: collection/doc/subcollection/subdoc (4 segments)
  // Nested: collection/doc/subcollection/subdoc/nested/nesteddoc (6 segments), etc.
  if (parts.length < 2 || parts.length % 2 !== 0) {
    throw new Error(
      `Invalid document path: "${path}". `
      + `Expected format: "collection/documentId" or "collection/doc/subcollection/subdoc" (even number of segments)`,
    )
  }

  // Return the collection path (all parts except last) and document ID (last part)
  return {
    collectionPath: parts.slice(0, -1).join('/'),
    documentId: parts.at(-1),
    fullPath: path,
  }
}

// Migrate document from old path to new path
async function migrateDocument (db, oldPath, newPath) {
  console.log(`🔄 Starting migration: ${oldPath} → ${newPath}`)

  try {
    // Parse paths
    const oldDoc = parsePath(oldPath)
    const newDoc = parsePath(newPath)

    // Validate that we're not trying to migrate to the same path
    if (oldPath === newPath) {
      throw new Error('Old path and new path cannot be the same')
    }

    console.log(`📍 Source: ${oldDoc.fullPath}`)
    console.log(`📍 Target: ${newDoc.fullPath}`)

    // Get document references using the full path
    const oldDocRef = db.doc(oldDoc.fullPath)
    const newDocRef = db.doc(newDoc.fullPath)

    // Run the migration in a transaction
    const result = await db.runTransaction(async transaction => {
      // Read the source document
      const sourceDoc = await transaction.get(oldDocRef)

      if (!sourceDoc.exists) {
        throw new Error(`Source document does not exist: ${oldPath}`)
      }

      console.log('📖 Source document found')

      // Check if target document already exists
      const targetDoc = await transaction.get(newDocRef)
      if (targetDoc.exists) {
        throw new Error(`Target document already exists: ${newPath}`)
      }

      console.log('✅ Target path is available')

      // Get the document data
      const data = sourceDoc.data()
      console.log(`📦 Document contains ${Object.keys(data).length} fields`)

      // Write to new location
      transaction.set(newDocRef, data)
      console.log('💾 Document written to new location')

      // Delete from old location
      transaction.delete(oldDocRef)
      console.log('🗑️  Document deleted from old location')

      return {
        oldPath,
        newPath,
        fieldCount: Object.keys(data).length,
        data,
      }
    })

    console.log('\n✅ Migration completed successfully!')
    console.log(`📊 Migrated document with ${result.fieldCount} fields`)
    console.log(`🔗 Old path: ${result.oldPath}`)
    console.log(`🔗 New path: ${result.newPath}`)

    return result
  } catch (error) {
    console.error(`❌ Migration failed: ${error.message}`)
    throw error
  }
}

// Validate command line arguments
function validateArguments () {
  const args = process.argv.slice(2)

  if (args.length !== 2) {
    console.error('❌ Invalid number of arguments')
    console.error('')
    console.error('Usage:')
    console.error('  node scripts/migrate-document-id.js <oldPath> <newPath>')
    console.error('')
    console.error('Examples (top-level):')
    console.error('  node scripts/migrate-document-id.js parents/old@email.com parents/new@email.com')
    console.error('  node scripts/migrate-document-id.js students/oldId students/newId')
    console.error('')
    console.error('Examples (subcollections):')
    console.error('  node scripts/migrate-document-id.js parents/parent@email.com/students/oldId parents/parent@email.com/students/newId')
    console.error('')
    console.error('Via npm scripts:')
    console.error('  npm run migrate:dev -- parents/old@email.com parents/new@email.com')
    console.error('  npm run migrate:prod -- parents/parent@email.com/students/oldId parents/parent@email.com/students/newId')
    process.exit(1)
  }

  const [oldPath, newPath] = args

  // Basic validation
  if (!oldPath || !newPath) {
    console.error('❌ Both old and new paths must be provided')
    process.exit(1)
  }

  if (oldPath === newPath) {
    console.error('❌ Old and new paths cannot be the same')
    process.exit(1)
  }

  try {
    parsePath(oldPath)
    parsePath(newPath)
  } catch (error) {
    console.error(`❌ ${error.message}`)
    process.exit(1)
  }

  return { oldPath, newPath }
}

// Main migration function
async function main () {
  console.log('🚀 Starting Firestore Document ID Migration...')
  console.log(`🔧 Environment: ${config.firebase.useEmulator ? 'Development (Emulator)' : 'Production'}`)

  try {
    // Validate arguments
    const { oldPath, newPath } = validateArguments()

    // Confirm production migrations
    if (!config.firebase.useEmulator) {
      console.log('')
      console.log('⚠️  WARNING: This will modify PRODUCTION data!')
      console.log(`   Source: ${oldPath}`)
      console.log(`   Target: ${newPath}`)
      console.log('')
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...')
      await new Promise(resolve => setTimeout(resolve, 5000))
      console.log('🔥 Proceeding with production migration...')
    }

    // Initialize Firebase
    const db = await initializeFirebase()

    // Run the migration
    await migrateDocument(db, oldPath, newPath)

    console.log('\n🎉 Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message)
    process.exit(1)
  }
}

// Export for testing
export { initializeFirebase, migrateDocument, parsePath }

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
