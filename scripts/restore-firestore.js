import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config()

const ENV = process.env.NODE_ENV || 'development'
const DRY_RUN = process.argv.includes('--dry-run')

console.log(`🔧 Environment: ${ENV}`)
if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE - No data will be written\n')
}

// Initialize Firebase Admin
let app
if (ENV === 'production') {
  // Production: use service account
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

  console.log(`📦 Connected to production project: ${serviceAccount.project_id}`)
} else {
  // Development: use emulator
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'

  app = initializeApp({
    projectId: 'bottin2-3b41d',
  })

  console.log('🧪 Connected to local emulator')
}

const db = getFirestore(app)

/**
 * Deserialize JSON data back to Firestore format
 */
function deserializeFirestoreData (data) {
  if (data === null || data === undefined) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(item => deserializeFirestoreData(item))
  }

  if (typeof data === 'object') {
    // Check if it's a serialized timestamp
    if (data._type === 'timestamp' && data._value) {
      return Timestamp.fromDate(new Date(data._value))
    }

    const deserialized = {}
    for (const [key, value] of Object.entries(data)) {
      deserialized[key] = deserializeFirestoreData(value)
    }
    return deserialized
  }

  return data
}

/**
 * Recursively restore a collection including all subcollections
 */
async function restoreCollection (collectionData, collectionRef, collectionPath = '') {
  let docsRestored = 0

  for (const [docId, docContent] of Object.entries(collectionData)) {
    try {
      const docRef = collectionRef.doc(docId)
      const docData = deserializeFirestoreData(docContent._data)

      if (!DRY_RUN) {
        await docRef.set(docData)
      }

      docsRestored++
      console.log(`  ✓ ${collectionPath}/${docId}`)

      // Restore subcollections if any
      if (docContent._subcollections && Object.keys(docContent._subcollections).length > 0) {
        for (const [subcolId, subcolData] of Object.entries(docContent._subcollections)) {
          const subcolRef = docRef.collection(subcolId)
          const subDocsRestored = await restoreCollection(
            subcolData,
            subcolRef,
            `${collectionPath}/${docId}/${subcolId}`,
          )
          docsRestored += subDocsRestored
        }
      }
    } catch (error) {
      console.error(`  ❌ Error restoring ${collectionPath}/${docId}:`, error.message)
    }
  }

  return docsRestored
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
 * List available backups
 */
function listBackups () {
  const backupsDir = path.join(__dirname, '..', 'backups')

  if (!fs.existsSync(backupsDir)) {
    console.log('📂 No backups directory found')
    return []
  }

  const files = fs.readdirSync(backupsDir)
  const jsonBackups = files
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const filepath = path.join(backupsDir, f)
      const stats = fs.statSync(filepath)
      return {
        name: f,
        path: filepath,
        size: (stats.size / (1024 * 1024)).toFixed(2),
        modified: stats.mtime,
      }
    })
    .toSorted((a, b) => b.modified - a.modified)

  return jsonBackups
}

/**
 * Main restore function
 */
async function restoreFirestore () {
  try {
    // Get backup file from command line or show list
    const backupFile = process.argv.find(arg => arg.endsWith('.json'))

    if (!backupFile) {
      console.log('\n📋 Available backups:\n')
      const backups = listBackups()

      if (backups.length === 0) {
        throw new Error('No backup files found in backups/ directory\n\nUsage: npm run restore:prod <backup-file.json>')
      }

      for (const [index, backup] of backups.entries()) {
        console.log(
          `${index + 1}. ${backup.name} (${backup.size} MB, ${backup.modified.toLocaleString()})`,
        )
      }

      throw new Error('Usage: npm run restore:prod backups/<backup-file.json>')
    }

    // Resolve backup file path
    let backupPath
    if (path.isAbsolute(backupFile)) {
      backupPath = backupFile
    } else if (backupFile.startsWith('backups/')) {
      backupPath = path.join(__dirname, '..', backupFile)
    } else {
      backupPath = path.join(__dirname, '..', 'backups', backupFile)
    }

    if (!fs.existsSync(backupPath)) {
      throw new Error(`❌ Backup file not found: ${backupPath}`)
    }

    console.log(`\n📄 Loading backup: ${path.basename(backupPath)}`)

    // Load backup data
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'))

    console.log('\n📊 Backup information:')
    console.log(`  Created: ${backupData._metadata.timestamp}`)
    console.log(`  Environment: ${backupData._metadata.environment}`)
    console.log(`  Project: ${backupData._metadata.projectId}`)
    console.log(`  Collections: ${Object.keys(backupData._collections).length}`)

    // Safety check for production
    if (ENV === 'production' && !DRY_RUN) {
      console.log('\n⚠️  WARNING: You are about to restore data to PRODUCTION!')
      console.log('⚠️  This will OVERWRITE existing documents with the same IDs!')
      const answer = await askQuestion('\nType "RESTORE" to continue: ')

      if (answer !== 'RESTORE') {
        throw new Error('❌ Restore cancelled')
      }
    }

    console.log('\n🚀 Starting Firestore restore...\n')

    let totalDocsRestored = 0

    for (const [collectionId, collectionData] of Object.entries(backupData._collections)) {
      console.log(`📖 Restoring collection: ${collectionId}`)
      const collectionRef = db.collection(collectionId)
      const docsRestored = await restoreCollection(collectionData, collectionRef, collectionId)
      totalDocsRestored += docsRestored
    }

    if (DRY_RUN) {
      console.log('\n✅ Dry run completed!')
      console.log(`📝 Would restore ${totalDocsRestored} documents`)
      console.log('Run without --dry-run to actually restore data')
    } else {
      console.log('\n✅ Restore completed successfully!')
      console.log(`📝 Restored ${totalDocsRestored} documents`)
    }
  } catch (error) {
    console.error('\n❌ Restore failed:', error.message)
    console.error(error)
    throw error
  }
}

// Run restore
restoreFirestore()
