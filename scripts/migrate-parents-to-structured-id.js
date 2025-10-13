#!/usr/bin/env node

/**
 * Parent ID Migration Script
 *
 * Migrates parent documents from email-based IDs to structured IDs.
 * New ID format: FirstName_LastName_ABC123
 * - FirstName/LastName: Sanitized (a-zA-Z only)
 * - Random suffix: 6 alphanumeric characters
 *
 * Also updates all references in:
 * - students: parent1_email → parent1_id, parent2_email → parent2_id
 * - committees: members[].email → members[].parent_id
 * - classes: parent_rep (email → parent_id)
 *
 * Usage:
 *   Development: NODE_ENV=development node scripts/migrate-parents-to-structured-id.js [--dry-run]
 *   Production:  NODE_ENV=production node scripts/migrate-parents-to-structured-id.js
 */

import { readFileSync } from 'node:fs'
import dotenv from 'dotenv'
import admin from 'firebase-admin'
import { generateParentId } from './utils/parentIdGenerator.js'

dotenv.config()

// Configuration
const config = {
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'your-project-id',
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './credentials/firebase-service-account.json',
    useEmulator: process.env.NODE_ENV === 'development',
  },
  dryRun: process.argv.includes('--dry-run'),
  batchSize: 500, // Firestore batch limit
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

/**
 * Read all documents from a collection
 */
async function readCollection (db, collectionName) {
  try {
    console.log(`📖 Reading ${collectionName} collection...`)
    const snapshot = await db.collection(collectionName).get()
    const documents = []

    for (const doc of snapshot.docs) {
      documents.push({
        id: doc.id,
        data: doc.data(),
      })
    }

    console.log(`✅ Read ${documents.length} documents from ${collectionName}`)
    return documents
  } catch (error) {
    console.error(`❌ Failed to read ${collectionName}:`, error.message)
    throw error
  }
}

/**
 * Main migration function
 */
async function migrateParentIds (db) {
  console.log('\n📊 Phase 1: Reading existing data...')

  // Read all collections
  const parents = await readCollection(db, 'parents')
  const students = await readCollection(db, 'students')
  const committees = await readCollection(db, 'committees')
  const classes = await readCollection(db, 'classes')

  console.log('\n🔄 Phase 2: Generating new parent IDs...')

  // Generate new IDs and build mapping
  const emailToNewId = new Map()
  const newParents = []

  for (const parent of parents) {
    const oldId = parent.id // This is the email
    const email = parent.data.email

    // Generate new structured ID
    const newId = generateParentId(parent.data)

    // Check for collision (should be extremely rare)
    let finalId = newId
    let collisionCount = 0
    while (newParents.some(p => p.newId === finalId)) {
      finalId = generateParentId(parent.data)
      collisionCount++
      if (collisionCount > 10) {
        throw new Error(`Too many ID collisions for parent: ${oldId}`)
      }
    }

    emailToNewId.set(oldId, finalId)
    emailToNewId.set(email, finalId) // Also map the email field value

    newParents.push({
      oldId,
      newId: finalId,
      email,
      data: parent.data,
    })

    console.log(`  ${oldId} → ${finalId}`)
  }

  console.log(`✅ Generated ${newParents.length} new parent IDs`)

  console.log('\n🔄 Phase 3: Updating references in students collection...')

  const updatedStudents = []
  let studentUpdateCount = 0

  for (const student of students) {
    const updates = {}
    let hasChanges = false

    // Update parent1_email → parent1_id
    if (student.data.parent1_email) {
      const newParentId = emailToNewId.get(student.data.parent1_email)
      if (newParentId) {
        updates.parent1_id = newParentId
        hasChanges = true
        studentUpdateCount++
      } else {
        console.warn(`  ⚠️  Student ${student.id}: parent1_email "${student.data.parent1_email}" not found in parent mapping`)
      }
    }

    // Update parent2_email → parent2_id
    if (student.data.parent2_email) {
      const newParentId = emailToNewId.get(student.data.parent2_email)
      if (newParentId) {
        updates.parent2_id = newParentId
        hasChanges = true
        studentUpdateCount++
      } else {
        console.warn(`  ⚠️  Student ${student.id}: parent2_email "${student.data.parent2_email}" not found in parent mapping`)
      }
    }

    if (hasChanges) {
      updatedStudents.push({
        id: student.id,
        updates,
        deleteFields: ['parent1_email', 'parent2_email'],
      })
    }
  }

  console.log(`✅ Found ${updatedStudents.length} students to update (${studentUpdateCount} parent references)`)

  console.log('\n🔄 Phase 4: Updating references in committees collection...')

  const updatedCommittees = []
  let committeeUpdateCount = 0

  for (const committee of committees) {
    if (!committee.data.members || committee.data.members.length === 0) {
      continue
    }

    const updatedMembers = committee.data.members.map(member => {
      // If member has email that matches a parent, add parent_id field
      if (member.email && emailToNewId.has(member.email)) {
        const parentId = emailToNewId.get(member.email)
        committeeUpdateCount++
        return {
          ...member,
          parent_id: parentId,
        }
      }
      return member
    })

    // Only update if we found parent references
    if (committeeUpdateCount > 0) {
      updatedCommittees.push({
        id: committee.id,
        updates: {
          members: updatedMembers,
        },
      })
    }
  }

  console.log(`✅ Found ${updatedCommittees.length} committees to update (${committeeUpdateCount} member references)`)

  console.log('\n🔄 Phase 5: Updating references in classes collection...')

  const updatedClasses = []
  let classUpdateCount = 0

  for (const classDoc of classes) {
    if (classDoc.data.parent_rep) {
      const newParentId = emailToNewId.get(classDoc.data.parent_rep)
      if (newParentId) {
        updatedClasses.push({
          id: classDoc.id,
          updates: {
            parent_rep: newParentId,
          },
        })
        classUpdateCount++
        console.log(`  Class ${classDoc.id}: ${classDoc.data.parent_rep} → ${newParentId}`)
      } else {
        console.warn(`  ⚠️  Class ${classDoc.id}: parent_rep "${classDoc.data.parent_rep}" not found in parent mapping`)
      }
    }
  }

  console.log(`✅ Found ${updatedClasses.length} classes to update`)

  // Summary
  console.log('\n📊 Migration Summary:')
  console.log(`  Parents to migrate: ${newParents.length}`)
  console.log(`  Students to update: ${updatedStudents.length} (${studentUpdateCount} references)`)
  console.log(`  Committees to update: ${updatedCommittees.length} (${committeeUpdateCount} references)`)
  console.log(`  Classes to update: ${updatedClasses.length}`)

  if (config.dryRun) {
    console.log('\n🏃 DRY RUN MODE - No changes will be written to Firestore')
    return {
      newParents,
      updatedStudents,
      updatedCommittees,
      updatedClasses,
      emailToNewId,
    }
  }

  // Confirm production migrations
  if (!config.firebase.useEmulator) {
    console.log('\n⚠️  WARNING: This will modify PRODUCTION data!')
    console.log(`   ${newParents.length} parents will be migrated`)
    console.log(`   ${updatedStudents.length} students will be updated`)
    console.log(`   ${updatedCommittees.length} committees will be updated`)
    console.log(`   ${updatedClasses.length} classes will be updated`)
    console.log('\nPress Ctrl+C to cancel, or wait 10 seconds to continue...')
    await new Promise(resolve => setTimeout(resolve, 10000))
    console.log('🔥 Proceeding with production migration...')
  }

  console.log('\n💾 Phase 6: Writing changes to Firestore...')

  // Execute migration in batches
  let batch = db.batch()
  let operationCount = 0
  let batchCount = 0

  // Helper to commit batch if needed
  const commitBatchIfNeeded = async () => {
    if (operationCount >= config.batchSize) {
      batchCount++
      console.log(`  Committing batch ${batchCount} (${operationCount} operations)...`)
      await batch.commit()
      batch = db.batch()
      operationCount = 0
    }
  }

  // 1. Create new parent documents
  console.log('  Creating new parent documents...')
  for (const parent of newParents) {
    const newDocRef = db.collection('parents').doc(parent.newId)
    batch.set(newDocRef, parent.data)
    operationCount++
    await commitBatchIfNeeded()
  }

  // 2. Update students
  console.log('  Updating student documents...')
  for (const student of updatedStudents) {
    const docRef = db.collection('students').doc(student.id)

    // Update new fields and delete old fields
    const updateData = { ...student.updates }
    for (const field of student.deleteFields) {
      updateData[field] = admin.firestore.FieldValue.delete()
    }

    batch.update(docRef, updateData)
    operationCount++
    await commitBatchIfNeeded()
  }

  // 3. Update committees
  console.log('  Updating committee documents...')
  for (const committee of updatedCommittees) {
    const docRef = db.collection('committees').doc(committee.id)
    batch.update(docRef, committee.updates)
    operationCount++
    await commitBatchIfNeeded()
  }

  // 4. Update classes
  console.log('  Updating class documents...')
  for (const classDoc of updatedClasses) {
    const docRef = db.collection('classes').doc(classDoc.id)
    batch.update(docRef, classDoc.updates)
    operationCount++
    await commitBatchIfNeeded()
  }

  // 5. Delete old parent documents (with old email-based IDs)
  console.log('  Deleting old parent documents...')
  for (const parent of newParents) {
    const oldDocRef = db.collection('parents').doc(parent.oldId)
    batch.delete(oldDocRef)
    operationCount++
    await commitBatchIfNeeded()
  }

  // Commit final batch
  if (operationCount > 0) {
    batchCount++
    console.log(`  Committing final batch ${batchCount} (${operationCount} operations)...`)
    await batch.commit()
  }

  console.log(`✅ Committed ${batchCount} batches`)

  return {
    newParents,
    updatedStudents,
    updatedCommittees,
    updatedClasses,
    emailToNewId,
  }
}

// Main function
async function main () {
  console.log('🚀 Starting Parent ID Migration...')
  console.log(`🔧 Environment: ${config.firebase.useEmulator ? 'Development (Emulator)' : 'Production'}`)
  console.log(`🏃 Dry run: ${config.dryRun ? 'YES' : 'NO'}`)

  try {
    // Initialize Firebase
    const db = await initializeFirebase()

    // Run the migration
    const result = await migrateParentIds(db)

    console.log('\n✅ Migration completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('  1. Update DTOs (StudentDTO, ParentDTO)')
    console.log('  2. Update repositories (ParentRepository, StudentRepository)')
    console.log('  3. Update Cloud Functions')
    console.log('  4. Update sheets-sync.js')
    console.log('  5. Update UI components')

    process.exit(0)
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Export for testing
export { migrateParentIds }

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
