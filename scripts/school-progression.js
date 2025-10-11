#!/usr/bin/env node

/**
 * School Progression Script
 *
 * Automatically moves all students up 1 level according to the following rules:
 * - Levels 1, 3, 5 (first level of class): Move to next level, keep same class
 * - Levels 2, 4 (second level of class): Move to next level, remove class assignment
 * - Level 6: Graduate and remove from system
 *
 * Usage:
 *   Development: NODE_ENV=development node scripts/school-progression.js [--dry-run]
 *   Production:  NODE_ENV=production node scripts/school-progression.js [--dry-run]
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

// Class level mapping from src/config/classLevels.js
const CLASS_LEVEL_MAPPING = {
  A: [1, 2],
  B: [1, 2],
  C: [3, 4],
  D: [3, 4],
  E: [5, 6],
  F: [5, 6],
}

/**
 * Check if a level is valid for a given class
 */
function isLevelValidForClass(classLetter, level) {
  if (!classLetter || typeof classLetter !== 'string') {
    return false
  }
  const upperClass = classLetter.toUpperCase()
  const validLevels = CLASS_LEVEL_MAPPING[upperClass] || []
  return validLevels.includes(level)
}

/**
 * Initialize Firebase Admin
 */
async function initializeFirebase() {
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
 * Create a backup of the students collection
 */
async function createBackup(db) {
  try {
    console.log('\n📦 Creating backup of students collection...')

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupRef = db.collection('backups').doc(`students_${timestamp}`)

    const studentsSnapshot = await db.collection('students').get()
    const studentsData = {}

    studentsSnapshot.docs.forEach(doc => {
      studentsData[doc.id] = doc.data()
    })

    await backupRef.set({
      collection: 'students',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      count: studentsSnapshot.size,
      data: studentsData,
    })

    console.log(`✅ Backup created: students_${timestamp}`)
    console.log(`   Backed up ${studentsSnapshot.size} students`)

    return `students_${timestamp}`
  } catch (error) {
    console.error('❌ Failed to create backup:', error.message)
    throw error
  }
}

/**
 * Determine progression action for a student
 */
function determineProgression(student) {
  const currentLevel = student.level
  const className = student.className
  const studentId = student.id
  const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim()

  // Validation: Check if student has valid class and level
  const warnings = []

  if (!className) {
    warnings.push(`⚠️  Student ${studentId} (${studentName}) has no class assignment`)
  } else if (!isLevelValidForClass(className, currentLevel)) {
    warnings.push(`⚠️  Student ${studentId} (${studentName}) level ${currentLevel} is invalid for class ${className}`)
  }

  // Determine action based on current level
  let action = {
    studentId,
    studentName,
    currentLevel,
    currentClass: className,
    newLevel: null,
    newClass: null,
    actionType: 'unknown',
    warnings,
  }

  switch (currentLevel) {
    case 1:
    case 3:
    case 5:
      // First level of class: Stay in same class, move to next level
      action.newLevel = currentLevel + 1
      action.newClass = className
      action.actionType = 'auto_progression'
      break

    case 2:
    case 4:
      // Second level of class: Move to next level, remove class assignment
      action.newLevel = currentLevel + 1
      action.newClass = null
      action.actionType = 'needs_assignment'
      break

    case 6:
      // Graduating: Remove from system
      action.actionType = 'graduating'
      break

    default:
      // Invalid level
      action.actionType = 'invalid_level'
      warnings.push(`⚠️  Student ${studentId} (${studentName}) has invalid level: ${currentLevel}`)
  }

  return action
}

/**
 * Apply progression changes to the database
 */
async function applyProgressionChanges(db, progressionActions) {
  console.log('\n💾 Applying progression changes to database...')

  const stats = {
    autoProgressed: 0,
    needsAssignment: 0,
    graduated: 0,
    invalidLevel: 0,
    errors: 0,
  }

  // Process in batches (Firestore batch limit is 500 operations)
  const BATCH_SIZE = 500
  let currentBatch = db.batch()
  let operationCount = 0

  for (const action of progressionActions) {
    try {
      const studentRef = db.collection('students').doc(action.studentId)

      switch (action.actionType) {
        case 'auto_progression':
          // Update student with new level, keep class
          currentBatch.update(studentRef, {
            level: action.newLevel,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          })
          stats.autoProgressed++
          operationCount++
          break

        case 'needs_assignment':
          // Update student with new level, remove class
          currentBatch.update(studentRef, {
            level: action.newLevel,
            className: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          })
          stats.needsAssignment++
          operationCount++
          break

        case 'graduating':
          // Delete graduating student
          currentBatch.delete(studentRef)
          stats.graduated++
          operationCount++
          break

        case 'invalid_level':
          stats.invalidLevel++
          console.log(`⚠️  Skipping student ${action.studentId} with invalid level ${action.currentLevel}`)
          break
      }

      // Commit batch if we've reached the limit
      if (operationCount >= BATCH_SIZE) {
        await currentBatch.commit()
        console.log(`   Committed batch of ${operationCount} operations`)
        currentBatch = db.batch()
        operationCount = 0
      }
    } catch (error) {
      console.error(`❌ Error processing student ${action.studentId}:`, error.message)
      stats.errors++
    }
  }

  // Commit any remaining operations
  if (operationCount > 0) {
    await currentBatch.commit()
    console.log(`   Committed final batch of ${operationCount} operations`)
  }

  return stats
}

/**
 * Main progression function
 */
async function progressStudents() {
  const environment = config.firebase.useEmulator ? 'Development (Emulator)' : 'Production'
  const mode = isDryRun ? 'DRY RUN' : 'LIVE'

  console.log('🚀 Starting School Progression Script...')
  console.log(`🔧 Environment: ${environment}`)
  console.log(`📋 Mode: ${mode}`)

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made to the database')
  }

  try {
    // Initialize Firebase
    const db = await initializeFirebase()

    // Create backup if not dry run and in production
    if (!isDryRun && !config.firebase.useEmulator) {
      await createBackup(db)
    } else if (!isDryRun) {
      console.log('\n⚠️  Skipping backup in development environment')
    }

    // Get all students
    console.log('\n📊 Fetching all students...')
    const studentsSnapshot = await db.collection('students').get()
    const students = studentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`✅ Found ${students.length} students`)

    // Analyze all students and determine progression actions
    console.log('\n🔍 Analyzing students and determining progression actions...')
    const progressionActions = students.map(student => determineProgression(student))

    // Display progression summary
    console.log('\n📈 Progression Summary:')
    console.log('=' .repeat(80))

    const stats = {
      autoProgression: progressionActions.filter(a => a.actionType === 'auto_progression').length,
      needsAssignment: progressionActions.filter(a => a.actionType === 'needs_assignment').length,
      graduating: progressionActions.filter(a => a.actionType === 'graduating').length,
      invalidLevel: progressionActions.filter(a => a.actionType === 'invalid_level').length,
    }

    console.log(`\n📊 Total students: ${students.length}`)
    console.log(`   ✅ Auto-progression (same class): ${stats.autoProgression}`)
    console.log(`   🔄 Needs class assignment: ${stats.needsAssignment}`)
    console.log(`   🎓 Graduating (will be removed): ${stats.graduating}`)
    console.log(`   ⚠️  Invalid level (skipped): ${stats.invalidLevel}`)

    // Display detailed actions by type
    console.log('\n📋 Detailed Actions:')
    console.log('-'.repeat(80))

    // Auto-progression
    if (stats.autoProgression > 0) {
      console.log('\n✅ Auto-Progression (staying in same class):')
      progressionActions
        .filter(a => a.actionType === 'auto_progression')
        .forEach(action => {
          console.log(`   ${action.studentName} (${action.studentId})`)
          console.log(`      Class ${action.currentClass}: Level ${action.currentLevel} → ${action.newLevel}`)
        })
    }

    // Needs assignment
    if (stats.needsAssignment > 0) {
      console.log('\n🔄 Needs Class Assignment (moving to new class):')
      progressionActions
        .filter(a => a.actionType === 'needs_assignment')
        .forEach(action => {
          console.log(`   ${action.studentName} (${action.studentId})`)
          console.log(`      Class ${action.currentClass}: Level ${action.currentLevel} → ${action.newLevel} (class: null)`)
        })
    }

    // Graduating
    if (stats.graduating > 0) {
      console.log('\n🎓 Graduating (will be removed from system):')
      progressionActions
        .filter(a => a.actionType === 'graduating')
        .forEach(action => {
          console.log(`   ${action.studentName} (${action.studentId})`)
          console.log(`      Class ${action.currentClass}, Level ${action.currentLevel}`)
        })
    }

    // Invalid levels
    if (stats.invalidLevel > 0) {
      console.log('\n⚠️  Invalid Levels (will be skipped):')
      progressionActions
        .filter(a => a.actionType === 'invalid_level')
        .forEach(action => {
          console.log(`   ${action.studentName} (${action.studentId})`)
          console.log(`      Class ${action.currentClass}, Level ${action.currentLevel}`)
        })
    }

    // Display all warnings
    const allWarnings = progressionActions.flatMap(a => a.warnings)
    if (allWarnings.length > 0) {
      console.log('\n⚠️  Warnings:')
      allWarnings.forEach(warning => console.log(`   ${warning}`))
    }

    // Apply changes if not dry run
    if (!isDryRun) {
      console.log('\n' + '='.repeat(80))
      console.log('⚠️  APPLYING CHANGES - This cannot be undone!')
      console.log('='.repeat(80))

      const applyStats = await applyProgressionChanges(db, progressionActions)

      console.log('\n✅ Progression completed successfully!')
      console.log('\n📊 Final Statistics:')
      console.log(`   Students auto-progressed: ${applyStats.autoProgressed}`)
      console.log(`   Students needing assignment: ${applyStats.needsAssignment}`)
      console.log(`   Students graduated: ${applyStats.graduated}`)
      console.log(`   Students skipped (invalid): ${applyStats.invalidLevel}`)
      if (applyStats.errors > 0) {
        console.log(`   ⚠️  Errors: ${applyStats.errors}`)
      }
    } else {
      console.log('\n' + '='.repeat(80))
      console.log('✅ DRY RUN COMPLETE - No changes were made')
      console.log('   Run without --dry-run to apply these changes')
      console.log('='.repeat(80))
    }

  } catch (error) {
    console.error('\n💥 Script failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  progressStudents()
    .then(() => {
      console.log('\n🎉 Script completed successfully!')
      process.exit(0)
    })
    .catch(error => {
      console.error('Script failed:', error)
      process.exit(1)
    })
}

export { progressStudents }
