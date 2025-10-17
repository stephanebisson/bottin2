import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config()

const ENV = process.env.NODE_ENV || 'development'

console.log(`🔧 Environment: ${ENV}`)

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
 * Recursively backup a collection including all subcollections
 */
async function backupCollection (collectionRef, collectionPath = '') {
  const data = {}

  try {
    const snapshot = await collectionRef.get()

    console.log(`  📁 ${collectionPath || collectionRef.id}: ${snapshot.size} documents`)

    for (const doc of snapshot.docs) {
      const docData = doc.data()
      const docPath = collectionPath ? `${collectionPath}/${doc.id}` : doc.id

      // Convert Firestore Timestamps to ISO strings for JSON serialization
      const serializedData = serializeFirestoreData(docData)

      data[doc.id] = {
        _data: serializedData,
        _subcollections: {},
      }

      // Get all subcollections for this document
      const subcollections = await doc.ref.listCollections()

      if (subcollections.length > 0) {
        console.log(`    📂 ${docPath} has ${subcollections.length} subcollection(s)`)

        for (const subcollection of subcollections) {
          const subcollectionData = await backupCollection(
            subcollection,
            `${docPath}/${subcollection.id}`,
          )
          data[doc.id]._subcollections[subcollection.id] = subcollectionData
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error backing up ${collectionPath}:`, error.message)
  }

  return data
}

/**
 * Serialize Firestore data types to JSON-compatible format
 */
function serializeFirestoreData (data) {
  if (data === null || data === undefined) {
    return data
  }

  if (data instanceof Date || (data && typeof data.toDate === 'function')) {
    // Firestore Timestamp
    return {
      _type: 'timestamp',
      _value: data.toDate ? data.toDate().toISOString() : data.toISOString(),
    }
  }

  if (Array.isArray(data)) {
    return data.map(item => serializeFirestoreData(item))
  }

  if (typeof data === 'object') {
    const serialized = {}
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeFirestoreData(value)
    }
    return serialized
  }

  return data
}

/**
 * Main backup function
 */
async function backupFirestore () {
  try {
    console.log('\n🚀 Starting Firestore backup...\n')

    const backup = {
      _metadata: {
        timestamp: new Date().toISOString(),
        environment: ENV,
        projectId: app.options.projectId,
      },
      _collections: {},
    }

    // Get all root collections
    const collections = await db.listCollections()
    console.log(`📚 Found ${collections.length} root collection(s)\n`)

    for (const collection of collections) {
      console.log(`📖 Backing up collection: ${collection.id}`)
      backup._collections[collection.id] = await backupCollection(collection)
    }

    // Create backups directory if it doesn't exist
    const backupsDir = path.join(__dirname, '..', 'backups')
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true })
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const filename = `${timestamp}-${ENV}-backup.json`
    const filepath = path.join(backupsDir, filename)

    // Write backup to file
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf8')

    // Calculate file size
    const stats = fs.statSync(filepath)
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2)

    console.log('\n✅ Backup completed successfully!')
    console.log(`📄 File: ${filename}`)
    console.log(`📊 Size: ${fileSizeInMB} MB`)
    console.log(`📂 Location: ${filepath}`)

    // Count total documents
    let totalDocs = 0
    function countDocs (data) {
      for (const doc of Object.values(data)) {
        totalDocs++
        if (doc._subcollections) {
          for (const subcol of Object.values(doc._subcollections)) {
            countDocs(subcol)
          }
        }
      }
    }

    for (const collection of Object.values(backup._collections)) {
      countDocs(collection)
    }

    console.log(`📝 Total documents: ${totalDocs}`)
  } catch (error) {
    console.error('\n❌ Backup failed:', error.message)
    console.error(error)
    throw error
  }
}

// Run backup
backupFirestore()
