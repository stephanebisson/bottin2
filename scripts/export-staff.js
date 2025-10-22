#!/usr/bin/env node

/**
 * Export Staff Script
 *
 * Exports staff collection data in an email-friendly format for updates.
 * Output is organized by group/subgroup and formatted for easy editing in email.
 *
 * Usage:
 *   NODE_ENV=development node scripts/export-staff.js [--dry-run]
 *   NODE_ENV=production node scripts/export-staff.js [--dry-run]
 *
 * Options:
 *   --dry-run  Preview the output without connecting to database (shows format only)
 */

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
const isDryRun = process.argv.includes('--dry-run')

console.log(`🔧 Environment: ${ENV}`)
console.log(`📋 Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`)

/**
 * Initialize Firebase Admin
 */
function initializeFirebase () {
  try {
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

      console.log(`✅ Connected to production project: ${serviceAccount.project_id}`)
    } else {
      // Development: use emulator
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'

      app = initializeApp({
        projectId: 'bottin2-3b41d',
      })

      console.log('✅ Connected to local emulator')
    }

    return getFirestore(app)
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message)
    throw error
  }
}

/**
 * Format phone number for display
 */
function formatPhone (phone) {
  if (!phone || phone.length === 0) {
    return ''
  }

  // Format as (XXX) XXX-XXXX if 10 digits
  if (phone.length === 10) {
    return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`
  }

  return phone
}

/**
 * Format staff member for email-friendly output
 */
function formatStaffMember (staff) {
  const lines = []

  lines.push(`Nom: ${staff.first_name} ${staff.last_name}`)
  lines.push(`Titre: ${staff.title || ''}`)
  lines.push(`Courriel: ${staff.email || ''}`)
  lines.push(`Téléphone: ${formatPhone(staff.phone)}`)

  return lines.join('\n')
}

/**
 * Generate sample data for dry-run mode
 */
function generateSampleData () {
  return [
    {
      id: 'sample1',
      first_name: 'Jane',
      last_name: 'Smith',
      title: 'Principal',
      email: 'jane.smith@example.com',
      phone: '5145551234',
      group: 'Administration',
      subgroup: '',
      order: 1,
    },
    {
      id: 'sample2',
      first_name: 'John',
      last_name: 'Doe',
      title: 'Vice Principal',
      email: 'john.doe@example.com',
      phone: '5145555678',
      group: 'Administration',
      subgroup: '',
      order: 2,
    },
    {
      id: 'sample3',
      first_name: 'Marie',
      last_name: 'Tremblay',
      title: 'Enseignante',
      email: 'marie.tremblay@example.com',
      phone: '5145559876',
      group: 'Teachers',
      subgroup: 'Grade 1-2',
      order: 1,
    },
  ]
}

/**
 * Organize staff by group and subgroup
 */
function organizeStaffByGroups (staffList) {
  const organized = {}

  for (const staff of staffList) {
    const group = staff.group || 'Other'
    const subgroup = staff.subgroup || ''

    if (!organized[group]) {
      organized[group] = {}
    }

    if (!organized[group][subgroup]) {
      organized[group][subgroup] = []
    }

    organized[group][subgroup].push(staff)
  }

  // Sort staff within each subgroup by order, then by last name
  for (const group of Object.keys(organized)) {
    for (const subgroup of Object.keys(organized[group])) {
      organized[group][subgroup].sort((a, b) => {
        if (a.order !== b.order) {
          return a.order - b.order
        }
        return (a.last_name || '').localeCompare(b.last_name || '')
      })
    }
  }

  return organized
}

/**
 * Generate email-friendly output
 */
function generateOutput (organizedStaff) {
  const lines = []

  lines.push('='.repeat(70))
  lines.push('RÉPERTOIRE DU PERSONNEL')
  lines.push('='.repeat(70))
  lines.push('')
  lines.push('Veuillez mettre à jour les informations ci-dessous et répondre à ce courriel.')
  lines.push('')
  lines.push('='.repeat(70))
  lines.push('')

  // Sort groups alphabetically
  const sortedGroups = Object.keys(organizedStaff).sort()

  for (const group of sortedGroups) {
    lines.push(`--- ${group.toUpperCase()} ---`)
    lines.push('')

    const subgroups = organizedStaff[group]
    const sortedSubgroups = Object.keys(subgroups).sort()

    for (const subgroup of sortedSubgroups) {
      if (subgroup) {
        lines.push(`  [${subgroup}]`)
        lines.push('')
      }

      const staffMembers = subgroups[subgroup]

      for (const staff of staffMembers) {
        lines.push(formatStaffMember(staff))
        lines.push('')
      }
    }

    lines.push('')
  }

  lines.push('='.repeat(70))
  lines.push('FIN DU RÉPERTOIRE DU PERSONNEL')
  lines.push('='.repeat(70))

  return lines.join('\n')
}

/**
 * Main export function
 */
async function exportStaff () {
  try {
    console.log('\n🚀 Starting Staff Export...\n')

    let staffList

    if (isDryRun) {
      console.log('⚠️  DRY RUN MODE - Using sample data\n')
      staffList = generateSampleData()
    } else {
      // Initialize Firebase and fetch staff
      const db = initializeFirebase()

      console.log('📥 Fetching staff from database...')
      const staffRef = db.collection('staff')
      const snapshot = await staffRef.get()

      console.log(`📊 Found ${snapshot.size} staff members\n`)

      if (snapshot.size === 0) {
        console.log('⚠️  No staff members found in database')
        return
      }

      staffList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
    }

    // Organize staff by groups
    const organizedStaff = organizeStaffByGroups(staffList)

    // Generate output
    const output = generateOutput(organizedStaff)

    // Display output
    console.log('\n' + '='.repeat(70))
    console.log('OUTPUT (Copy below this line for email)')
    console.log('='.repeat(70) + '\n')
    console.log(output)
    console.log('\n' + '='.repeat(70))
    console.log('END OF OUTPUT')
    console.log('='.repeat(70))

    console.log('\n✅ Export completed successfully!')

    if (isDryRun) {
      console.log('\n⚠️  This was a DRY RUN with sample data')
      console.log('   Remove --dry-run to export real data from the database')
    } else {
      console.log(`\n📊 Exported ${staffList.length} staff members`)
    }
  } catch (error) {
    console.error('\n💥 Export failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the script
exportStaff()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
