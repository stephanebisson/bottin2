#!/usr/bin/env node

/**
 * Import Parents from CSV to Production Firebase
 *
 * Imports parents from a CSV file into the production parents collection.
 * CSV format: first_name,last_name,email,phone
 *
 * Usage:
 *   node scripts/import-parents-csv.js <path-to-csv-file>
 *   npm run import:parents path/to/parents.csv
 */

import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'
import { generateParentId } from './utils/parentIdGenerator.js'

// Configuration
const config = {
  firebase: {
    serviceAccountPath: './credentials/firebase-service-account.json',
    projectId: 'bottin2-3b41d',
  },
}

// Initialize Firebase Admin for production
async function initializeFirebase () {
  try {
    const serviceAccount = JSON.parse(
      readFileSync(config.firebase.serviceAccountPath, 'utf8'),
    )

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: config.firebase.projectId,
    })

    const db = admin.firestore()
    console.log('✅ Connected to production Firestore')
    return db
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message)
    throw error
  }
}

// Parse CSV file
function parseCSV (filePath) {
  try {
    const content = readFileSync(filePath, 'utf8')
    const lines = content.trim().split('\n')

    if (lines.length === 0) {
      throw new Error('CSV file is empty')
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

    // Validate header
    const requiredFields = ['first_name', 'last_name', 'email', 'phone']
    for (const field of requiredFields) {
      if (!header.includes(field)) {
        throw new Error(`Missing required column: ${field}`)
      }
    }

    // Parse data rows
    const parents = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) {
        continue // Skip empty lines
      }

      // Simple CSV parsing (handles quoted fields)
      const values = parseCSVLine(line)

      if (values.length !== header.length) {
        console.warn(`⚠️  Skipping row ${i + 1}: column count mismatch`)
        continue
      }

      const parent = {}
      for (const [j, element] of header.entries()) {
        parent[element] = values[j]
      }

      parents.push(parent)
    }

    console.log(`✅ Parsed ${parents.length} parents from CSV`)
    return parents
  } catch (error) {
    console.error('❌ Failed to parse CSV file:', error.message)
    throw error
  }
}

// Parse a single CSV line (handles quoted fields with commas)
function parseCSVLine (line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      // Check for escaped quote ("")
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Add last value
  values.push(current.trim())

  return values
}

// Validate parent data
function validateParent (parent, rowNumber) {
  const errors = []

  if (!parent.first_name || parent.first_name.trim() === '') {
    errors.push('first_name is required')
  }

  if (!parent.last_name || parent.last_name.trim() === '') {
    errors.push('last_name is required')
  }

  if (!parent.email || parent.email.trim() === '') {
    errors.push('email is required')
  } else if (!parent.email.includes('@')) {
    errors.push('email must be valid')
  }

  if (errors.length > 0) {
    console.warn(`⚠️  Row ${rowNumber}: ${errors.join(', ')}`)
    return false
  }

  return true
}

// Import parents to Firestore
async function importParents (db, parents) {
  if (parents.length === 0) {
    console.log('⚠️  No parents to import')
    return
  }

  try {
    const collectionRef = db.collection('parents')
    const batch = db.batch()

    let successCount = 0
    let errorCount = 0
    const errors = []

    console.log(`\n💾 Importing ${parents.length} parents...`)

    for (const [i, parent] of parents.entries()) {
      const rowNumber = i + 2 // +2 because of header row and 0-indexing

      // Validate parent
      if (!validateParent(parent, rowNumber)) {
        errorCount++
        continue
      }

      try {
        // Generate document ID using generateParentId
        const docId = generateParentId({
          first_name: parent.first_name,
          last_name: parent.last_name,
        })

        // Prepare parent data
        const parentData = {
          first_name: parent.first_name.trim(),
          last_name: parent.last_name.trim(),
          email: parent.email.trim().toLowerCase(),
          phone: parent.phone ? parent.phone.replace(/[^\d]/g, '') : '', // Keep only digits
          address: '',
          city: '',
          postal_code: '',
          interests: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const docRef = collectionRef.doc(docId)
        batch.set(docRef, parentData)

        successCount++
        console.log(`  ✓ Row ${rowNumber}: ${parent.first_name} ${parent.last_name} → ${docId}`)
      } catch (error) {
        errorCount++
        const errorMsg = `Row ${rowNumber}: ${parent.first_name} ${parent.last_name} - ${error.message}`
        errors.push(errorMsg)
        console.error(`  ✗ ${errorMsg}`)
      }
    }

    // Commit batch
    if (successCount > 0) {
      console.log(`\n📤 Committing batch write...`)
      await batch.commit()
      console.log(`✅ Successfully imported ${successCount} parents`)
    }

    if (errorCount > 0) {
      console.log(`\n⚠️  ${errorCount} parents failed to import`)
      if (errors.length > 0) {
        console.log('\nErrors:')
        for (const error of errors) {
          console.log(`  - ${error}`)
        }
      }
    }

    return { successCount, errorCount }
  } catch (error) {
    console.error('❌ Failed to import parents:', error.message)
    throw error
  }
}

// Main function
async function main () {
  try {
    // Get CSV file path from command line arguments
    const csvFilePath = process.argv[2]

    if (!csvFilePath) {
      console.error('❌ Please provide a CSV file path')
      console.error('\nUsage:')
      console.error('  node scripts/import-parents-csv.js <path-to-csv-file>')
      console.error('  npm run import:parents path/to/parents.csv')
      process.exit(1)
    }

    console.log(`📂 Reading CSV file: ${csvFilePath}`)

    // Parse CSV
    const parents = parseCSV(csvFilePath)

    if (parents.length === 0) {
      console.log('⚠️  No valid parents found in CSV')
      return
    }

    // Initialize Firebase
    const db = await initializeFirebase()

    // Import parents
    const result = await importParents(db, parents)

    console.log('\n🎉 Import completed!')
    console.log(`   Success: ${result.successCount}`)
    console.log(`   Errors: ${result.errorCount}`)
  } catch (error) {
    console.error('💥 Import failed:', error.message)
    process.exit(1)
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
