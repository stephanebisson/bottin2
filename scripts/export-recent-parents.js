#!/usr/bin/env node

/**
 * Export Recent Parents from Production Firebase
 *
 * Downloads all parents from the production parents collection
 * created on or after October 12, 2025 and outputs them as CSV.
 *
 * Usage:
 *   node scripts/export-recent-parents.js
 */

import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'

// Configuration
const config = {
  firebase: {
    serviceAccountPath: './credentials/firebase-service-account.json',
    projectId: 'bottin2-3b41d',
  },
  // Filter date: October 12, 2025 at 00:00:00
  filterDate: new Date('2025-10-12T00:00:00.000Z'),
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
    console.error('✅ Connected to production Firestore')
    return db
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message)
    throw error
  }
}

// Convert array of objects to CSV string
function convertToCSV (data) {
  if (data.length === 0) {
    return ''
  }

  // Get all unique keys from all objects
  const allKeys = new Set()
  for (const obj of data) {
    for (const key of Object.keys(obj)) {
      allKeys.add(key)
    }
  }

  const headers = Array.from(allKeys)

  // Escape CSV field (handle commas, quotes, newlines)
  const escapeField = field => {
    if (field === null || field === undefined) {
      return ''
    }
    const str = String(field)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // Build CSV rows
  const csvRows = []

  // Header row
  csvRows.push(headers.map(h => escapeField(h)).join(','))

  // Data rows
  for (const obj of data) {
    const row = headers.map(header => escapeField(obj[header]))
    csvRows.push(row.join(','))
  }

  return csvRows.join('\n')
}

// Fetch parents created on or after the filter date
async function fetchRecentParents (db) {
  try {
    const parentsRef = db.collection('parents')

    console.error(`🔍 Querying parents created on or after ${config.filterDate.toISOString()}`)

    // Query for parents with createdAt >= filterDate
    const snapshot = await parentsRef
      .where('createdAt', '>=', config.filterDate)
      .get()

    console.error(`📊 Found ${snapshot.size} parents`)

    const parents = []
    for (const doc of snapshot.docs) {
      const data = doc.data()

      // Only export selected fields
      const parentData = {
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
      }

      parents.push(parentData)
    }

    return parents
  } catch (error) {
    console.error('❌ Failed to fetch parents:', error.message)
    throw error
  }
}

// Main function
async function main () {
  try {
    // Initialize Firebase
    const db = await initializeFirebase()

    // Fetch recent parents
    const parents = await fetchRecentParents(db)

    if (parents.length === 0) {
      console.error('⚠️  No parents found matching the criteria')
      return
    }

    // Convert to CSV
    const csv = convertToCSV(parents)

    // Output CSV to stdout (console.log for actual output, console.error for status messages)
    console.log(csv)

    console.error(`✅ Successfully exported ${parents.length} parents`)
  } catch (error) {
    console.error('💥 Export failed:', error.message)
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
