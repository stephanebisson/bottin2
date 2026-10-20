#!/usr/bin/env node

/**
 * Export Staff Script
 *
 * Exports the staff collection as plain text for the principal to check and
 * correct by email. Staff are listed in the same groups and order as the staff
 * page, numbered so corrections can refer to "#12", with empty fields shown.
 *
 * The email text goes to stdout and progress messages to stderr, so the text
 * can be saved straight to a file.
 *
 * Usage:
 *   pnpm -s export:staff:prod > personnel.txt
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
import { SCHOOL_LOCATION } from '../src/config/school.js'
import { SDG_INFO } from '../src/config/sdg.js'
import {
  GROUP_DISPLAY_NAMES,
  GROUP_SUBGROUP_MAPPING,
  isSubgroupValidForGroup,
  STAFF_GROUPS,
  SUBGROUP_DISPLAY_NAMES,
} from '../src/config/staffGroups.js'
import { getCurrentSchoolYear } from '../src/utils/schoolYear.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config()

const ENV = process.env.NODE_ENV || 'development'
const isDryRun = process.argv.includes('--dry-run')

// Shown for a field with no value, so the principal can see what's missing
const EMPTY = '(vide)'

// Progress messages go to stderr; stdout carries only the email text
const log = (...args) => console.error(...args)

log(`🔧 Environment: ${ENV}`)
log(`📋 Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`)

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

      log(`✅ Connected to production project: ${serviceAccount.project_id}`)
    } else {
      // Development: use emulator
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'

      app = initializeApp({
        projectId: 'bottin2-3b41d',
      })

      log('✅ Connected to local emulator')
    }

    return getFirestore(app)
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message)
    throw error
  }
}

/**
 * Format phone number for display, naming the school and daycare main lines
 */
function formatPhone (phone) {
  if (!phone) {
    return EMPTY
  }

  // Some phones are stored already formatted, so compare digits only
  const digits = phone.toString().replace(/\D/g, '')

  // Format as (XXX) XXX-XXXX if 10 digits
  const formatted = digits.length === 10
    ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : phone

  if (digits === SCHOOL_LOCATION.phone) {
    return `${formatted} (numéro de l'école)`
  }
  if (digits === SDG_INFO.phone) {
    return `${formatted} (numéro du service de garde)`
  }
  return formatted
}

/**
 * Teacher titles name their class by letter, e.g. "3e-4e (D)" -> "3e-4e (372-472)",
 * as on the staff page
 */
function displayTitle (title, classCodesByLetter) {
  return title.replace(/\(([A-Z])\)/g, (match, letter) => {
    const code = classCodesByLetter.get(letter)
    return code ? `(${code})` : match
  })
}

/**
 * Format one numbered staff member, one field per line
 */
function formatStaffMember (staff, number, classCodesByLetter) {
  // Last name is only optional for SDG educators, as in the staff editor
  const lastNameOptional = staff.group === 'SDG' && staff.subgroup === 'edu'
  const lastName = staff.last_name || (lastNameOptional ? '' : '(nom de famille vide)')
  const name = [staff.first_name || '(prénom vide)', lastName].filter(Boolean).join(' ')
  const indent = ' '.repeat(`${number}. `.length)

  return [
    `${number}. ${name}`,
    `${indent}Titre : ${staff.title ? displayTitle(staff.title, classCodesByLetter) : EMPTY}`,
    `${indent}Courriel : ${staff.email || EMPTY}`,
    `${indent}Téléphone : ${formatPhone(staff.phone)}`,
  ].join('\n')
}

/**
 * Generate sample data for dry-run mode
 */
function generateSampleData () {
  return {
    staffList: [
      {
        id: 'sample1',
        first_name: 'Claude',
        last_name: 'Tremblay',
        title: 'Directrice',
        email: 'claude.tremblay@example.com',
        phone: '5145551234',
        group: 'EF',
        subgroup: 'admin',
        order: 1,
      },
      {
        id: 'sample2',
        first_name: 'Claude',
        last_name: 'Gagnon',
        title: 'Secrétaire d\'école',
        email: '',
        phone: SCHOOL_LOCATION.phone,
        group: 'EF',
        subgroup: 'admin',
        order: 2,
      },
      {
        id: 'sample3',
        first_name: 'Claude',
        last_name: 'Roy',
        title: '3e-4e (D)',
        email: 'claude.roy@example.com',
        phone: '',
        group: 'EF',
        subgroup: 'teacher',
        order: 1,
      },
      {
        id: 'sample4',
        first_name: 'Claude',
        last_name: '',
        title: '171-271 - Les Oursins',
        email: '',
        phone: '',
        group: 'SDG',
        subgroup: 'edu',
        order: 1,
      },
    ],
    classCodesByLetter: new Map([['A', '171-271'], ['D', '372-472']]),
  }
}

/**
 * Sort by order field, then alphabetically by name, as on the staff page
 */
function sortMembers (members) {
  return members.toSorted((a, b) => {
    const orderA = a.order || 99
    const orderB = b.order || 99
    if (orderA !== orderB) {
      return orderA - orderB
    }
    const nameA = `${a.last_name}, ${a.first_name}`.toLowerCase()
    const nameB = `${b.last_name}, ${b.first_name}`.toLowerCase()
    return nameA.localeCompare(nameB)
  })
}

/**
 * Organize staff into groups and subgroups, in the staff page's order
 */
function organizeStaffByGroups (staffList) {
  const sections = []

  for (const group of STAFF_GROUPS) {
    const subgroups = GROUP_SUBGROUP_MAPPING[group]
      .map(subgroup => ({
        name: SUBGROUP_DISPLAY_NAMES[subgroup],
        members: sortMembers(staffList.filter(staff => staff.group === group && staff.subgroup === subgroup)),
      }))
      .filter(subgroup => subgroup.members.length > 0)

    if (subgroups.length > 0) {
      sections.push({ name: GROUP_DISPLAY_NAMES[group], subgroups })
    }
  }

  // Staff without a valid group/subgroup, so nobody is left out of the review
  const otherStaff = staffList.filter(staff => !isSubgroupValidForGroup(staff.group, staff.subgroup))
  if (otherStaff.length > 0) {
    sections.push({ name: 'Autre personnel', subgroups: [{ name: null, members: sortMembers(otherStaff) }] })
  }

  return sections
}

/**
 * Generate the email text
 */
function generateOutput (sections, staffCount, classCodesByLetter) {
  const exportDate = new Date().toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })

  const lines = [
    `Liste du personnel – bottin ${getCurrentSchoolYear()}`,
    `Données du ${exportDate} · ${staffCount} personnes`,
    '',
    'Pour corriger :',
    '- Écrivez vos corrections directement dans le texte, ou indiquez le numéro de la personne (ex. « 12 : nouveau courriel … »).',
    `- « ${EMPTY} » veut dire que l'information est absente : ajoutez-la si vous la connaissez.`,
    '- Indiquez les personnes qui ne font plus partie de l\'équipe.',
    '- Ajoutez les nouvelles personnes à la fin.',
    '',
  ]

  // Numbered across the whole list so each number points to one person
  let number = 0

  for (const section of sections) {
    lines.push('', `=== ${section.name.toLocaleUpperCase('fr-CA')} ===`, '')

    for (const subgroup of section.subgroups) {
      if (subgroup.name) {
        lines.push(`--- ${subgroup.name} (${subgroup.members.length}) ---`, '')
      }

      for (const staff of subgroup.members) {
        number++
        lines.push(formatStaffMember(staff, number, classCodesByLetter), '')
      }
    }
  }

  lines.push(
    '',
    '=== NOUVELLES PERSONNES ===',
    '',
    'Nom :',
    'Titre :',
    'Courriel :',
    'Téléphone :',
  )

  return lines.join('\n')
}

/**
 * Main export function
 */
async function exportStaff () {
  try {
    log('\n🚀 Starting Staff Export...\n')

    let staffList
    let classCodesByLetter

    if (isDryRun) {
      log('⚠️  DRY RUN MODE - Using sample data\n')
      const sample = generateSampleData()
      staffList = sample.staffList
      classCodesByLetter = sample.classCodesByLetter
    } else {
      // Initialize Firebase and fetch staff, plus classes to name teachers' classes
      const db = initializeFirebase()

      log('📥 Fetching staff from database...')
      const [staffSnapshot, classesSnapshot] = await Promise.all([
        db.collection('staff').get(),
        db.collection('classes').get(),
      ])

      log(`📊 Found ${staffSnapshot.size} staff members\n`)

      if (staffSnapshot.size === 0) {
        log('⚠️  No staff members found in database')
        return
      }

      staffList = staffSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      classCodesByLetter = new Map(classesSnapshot.docs.map(doc => [doc.get('classLetter'), doc.get('classCode')]))
    }

    const sections = organizeStaffByGroups(staffList)
    const output = generateOutput(sections, staffList.length, classCodesByLetter)

    // Wait for stdout to flush before the process exits
    await new Promise(resolve => process.stdout.write(`${output}\n`, resolve))

    log('\n✅ Export completed successfully!')

    if (isDryRun) {
      log('\n⚠️  This was a DRY RUN with sample data')
      log('   Remove --dry-run to export real data from the database')
    } else {
      log(`\n📊 Exported ${staffList.length} staff members`)
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
