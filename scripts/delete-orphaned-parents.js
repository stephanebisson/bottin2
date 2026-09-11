#!/usr/bin/env node

/**
 * Delete Orphaned Parents Script
 *
 * Removes parent records that have no associated students.
 * A parent is considered orphaned if their ID is not referenced by any student's
 * parent1_id or parent2_id field.
 *
 * Usage:
 *   Development: NODE_ENV=development node scripts/delete-orphaned-parents.js [--dry-run]
 *   Production:  NODE_ENV=production node scripts/delete-orphaned-parents.js [--dry-run]
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

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run')

/**
 * Initialize Firebase Admin
 */
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

/**
 * Find orphaned parents - parents with no associated students
 */
async function findOrphanedParents (db) {
  console.log('\n📊 Fetching all parents and students...')

  // Get all parents
  const parentsSnapshot = await db.collection('parents').get()
  const parents = parentsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }))

  // Get all students
  const studentsSnapshot = await db.collection('students').get()
  const students = studentsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }))

  console.log(`✅ Found ${parents.length} parents`)
  console.log(`✅ Found ${students.length} students`)

  // Build a Set of all parent IDs that are referenced by students
  console.log('\n🔍 Building parent reference map...')
  const referencedParentIds = new Set()

  for (const student of students) {
    if (student.parent1_id) {
      referencedParentIds.add(student.parent1_id)
    }
    if (student.parent2_id) {
      referencedParentIds.add(student.parent2_id)
    }
  }

  console.log(`✅ Found ${referencedParentIds.size} unique parent references in student records`)

  // Find parents that are NOT in the referenced set
  const orphanedParents = parents.filter(parent => !referencedParentIds.has(parent.id))

  console.log(`✅ Found ${orphanedParents.length} orphaned parents (not referenced by any student)`)

  return {
    orphanedParents,
    totalParents: parents.length,
    referencedParents: referencedParentIds.size,
  }
}

/**
 * Delete orphaned parents from the database
 */
async function deleteOrphanedParents (db, orphanedParents) {
  console.log('\n💾 Deleting orphaned parents from database...')

  const stats = {
    deleted: 0,
    errors: 0,
  }

  // Process in batches (Firestore batch limit is 500 operations)
  const BATCH_SIZE = 500
  let currentBatch = db.batch()
  let operationCount = 0

  for (const parent of orphanedParents) {
    try {
      const parentRef = db.collection('parents').doc(parent.id)
      currentBatch.delete(parentRef)
      stats.deleted++
      operationCount++

      // Commit batch if we've reached the limit
      if (operationCount >= BATCH_SIZE) {
        await currentBatch.commit()
        console.log(`   Committed batch of ${operationCount} deletions`)
        currentBatch = db.batch()
        operationCount = 0
      }
    } catch (error) {
      console.error(`❌ Error deleting parent ${parent.id}:`, error.message)
      stats.errors++
    }
  }

  // Commit any remaining operations
  if (operationCount > 0) {
    await currentBatch.commit()
    console.log(`   Committed final batch of ${operationCount} deletions`)
  }

  return stats
}

/**
 * Main function to delete orphaned parents
 */
async function deleteOrphaned () {
  const environment = config.firebase.useEmulator ? 'Development (Emulator)' : 'Production'
  const mode = isDryRun ? 'DRY RUN' : 'LIVE'

  console.log('🚀 Starting Delete Orphaned Parents Script...')
  console.log(`🔧 Environment: ${environment}`)
  console.log(`📋 Mode: ${mode}`)

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made to the database')
  }

  try {
    // Initialize Firebase
    const db = await initializeFirebase()

    // Find orphaned parents
    const { orphanedParents, totalParents, referencedParents } = await findOrphanedParents(db)

    // Display summary
    console.log('\n📈 Summary:')
    console.log('='.repeat(80))
    console.log(`\n📊 Total parents in database: ${totalParents}`)
    console.log(`   ✅ Parents referenced by students: ${referencedParents}`)
    console.log(`   🗑️  Orphaned parents (no students): ${orphanedParents.length}`)

    // Display detailed list of orphaned parents
    if (orphanedParents.length > 0) {
      console.log('\n🗑️  Orphaned Parents to be Deleted:')
      console.log('-'.repeat(80))

      for (const parent of orphanedParents) {
        const name = [parent.first_name, parent.last_name]
          .filter(Boolean)
          .join(' ') || 'Unknown'
        const email = parent.email || 'no email'
        console.log(`   ${name} (${email})`)
      }
    }

    // Delete orphaned parents if not dry run
    if (isDryRun) {
      console.log('\n' + '='.repeat(80))
      console.log('✅ DRY RUN COMPLETE - No changes were made')
      if (orphanedParents.length > 0) {
        console.log('   Run without --dry-run to delete these orphaned parents')
      }
      console.log('='.repeat(80))
    } else {
      if (orphanedParents.length === 0) {
        console.log('\n✅ No orphaned parents to delete!')
      } else {
        console.log('\n' + '='.repeat(80))
        console.log('⚠️  DELETING ORPHANED PARENTS - This cannot be undone!')
        console.log('='.repeat(80))

        const deleteStats = await deleteOrphanedParents(db, orphanedParents)

        console.log('\n✅ Deletion completed successfully!')
        console.log('\n📊 Final Statistics:')
        console.log(`   Parents deleted: ${deleteStats.deleted}`)
        if (deleteStats.errors > 0) {
          console.log(`   ⚠️  Errors: ${deleteStats.errors}`)
        }
      }
    }
  } catch (error) {
    console.error('\n💥 Script failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  deleteOrphaned()
    .then(() => {
      console.log('\n🎉 Script completed successfully!')
      process.exit(0)
    })
    .catch(error => {
      console.error('Script failed:', error)
      process.exit(1)
    })
}

// eslint-disable-next-line unicorn/no-exports-in-scripts
export { deleteOrphaned }
