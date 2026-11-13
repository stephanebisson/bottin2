#!/usr/bin/env node

/**
 * Data Consistency Check Script
 *
 * Reads students and parents and reports data that looks inconsistent, for an
 * admin to review and fix in the app. Read-only: it never writes to Firestore.
 *
 * Checks:
 * - Child and parent last names that are close but not the same (likely typos),
 *   or the same except for accents or capital letters
 * - The same city spelled several ways
 * - Names typed all in lowercase or all in capitals
 * - Initials in last names ("B. Dallaire")
 *
 * Partial addresses are not reported: parents may choose to share only part of theirs.
 *
 * Usage:
 *   pnpm check:data:prod
 *   pnpm check:data:dev
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { ParentDTO } from '../src/dto/ParentDTO.js'
import { StudentDTO } from '../src/dto/StudentDTO.js'
import { normalizeText } from '../src/utils/search.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ENV = process.env.NODE_ENV || 'development'

console.log(`🔧 Environment: ${ENV}`)

/**
 * Initialize Firebase Admin: service account in production, emulator otherwise
 */
function initializeFirebase () {
  let app
  if (ENV === 'production') {
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
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'

    app = initializeApp({
      projectId: 'bottin2-3b41d',
    })

    console.log('✅ Connected to local emulator')
  }

  return getFirestore(app)
}

/**
 * Number of single-character edits (insert, delete, replace) to turn a into b
 */
function editDistance (a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    previous = current
  }
  return previous[b.length]
}

/**
 * The words of a last name: compound names like "Dutra Legault" or "Haskell-Sheper"
 * share a word with each parent's name
 */
function nameWords (lastName) {
  return (lastName || '').split(/[\s-]+/).filter(Boolean)
}

// Words this short are left out of the typo comparison: "Di", "St", "B."
const MIN_TYPO_WORD_LENGTH = 4

/**
 * How two last names differ, or null when they share a word exactly or are unrelated
 * @returns {null | 'accents' | 'typo'} 'accents' when a word differs only by accents or
 *   capital letters, 'typo' when a word is one or two letters away
 */
function compareLastNames (childLastName, parentLastName) {
  const childWords = nameWords(childLastName)
  const parentWords = nameWords(parentLastName)
  const pairs = childWords.flatMap(childWord => parentWords.map(parentWord => [childWord, parentWord]))

  if (pairs.some(([childWord, parentWord]) => childWord === parentWord)) {
    return null
  }
  if (pairs.some(([childWord, parentWord]) => normalizeText(childWord) === normalizeText(parentWord))) {
    return 'accents'
  }

  const isTypo = pairs.some(([childWord, parentWord]) => {
    const a = normalizeText(childWord)
    const b = normalizeText(parentWord)
    if (Math.min(a.length, b.length) < MIN_TYPO_WORD_LENGTH) {
      return false
    }
    // One edit for short words, two for longer ones
    return editDistance(a, b) <= (Math.min(a.length, b.length) >= 7 ? 2 : 1)
  })
  return isTypo ? 'typo' : null
}

/**
 * Check: child and parent last names that are close but not the same
 */
function checkParentChildLastNames ({ students, parentsById }) {
  const findings = []
  const reported = new Set()

  for (const student of students) {
    for (const parentId of [student.parent1_id, student.parent2_id]) {
      const parent = parentId && parentsById.get(parentId)
      if (!parent) {
        continue
      }

      const difference = compareLastNames(student.last_name, parent.last_name)
      // Siblings share parents: report each pair of spellings once
      const key = `${student.last_name}|${parent.id}`
      if (!difference || reported.has(key)) {
        continue
      }
      reported.add(key)

      findings.push(
        `${difference === 'accents' ? 'Accents or capitals differ' : 'Possible typo'}: `
        + `child "${student.last_name}" (${student.fullName}) / parent "${parent.last_name}" (${parent.fullName})`,
      )
    }
  }

  return findings
}

/**
 * Check: the same city spelled several ways ("Montréal", "Montreal", "MONTRÉAL", "Montrel")
 * Cities are grouped when they match ignoring accents, capitals and punctuation, or are one
 * letter apart; each spelling other than the most common one of its group is reported.
 * Missing cities are fine: parents may share only part of their address.
 */
function checkCitySpellings ({ parents }) {
  const comparable = city => normalizeText(city).replace(/[^a-z]/g, '')

  // Parents by exact spelling
  const parentsByCity = new Map()
  for (const parent of parents) {
    if (parent.city) {
      parentsByCity.set(parent.city, [...(parentsByCity.get(parent.city) ?? []), parent])
    }
  }

  // Most common spelling first, so each group is named after it
  const spellings = [...parentsByCity.keys()].toSorted((a, b) => parentsByCity.get(b).length - parentsByCity.get(a).length)
  const groups = []
  for (const spelling of spellings) {
    const group = groups.find(([main]) => {
      const a = comparable(main)
      const b = comparable(spelling)
      return a === b || (Math.min(a.length, b.length) >= 5 && editDistance(a, b) <= 1)
    })
    if (group) {
      group.push(spelling)
    } else {
      groups.push([spelling])
    }
  }

  return groups.flatMap(([main, ...variants]) => variants.map(variant => {
    const variantParents = parentsByCity.get(variant)
    return `"${variant}" (${variantParents.map(parent => parent.fullName).join(', ')}): `
      + `${parentsByCity.get(main).length} parents write "${main}"`
  }))
}

/**
 * Check: names typed all in lowercase or all in capitals ("patrick", "DUPONT")
 */
function checkNameCapitals ({ students, parents }) {
  const people = [
    ...students.map(student => ({ person: student, kind: 'Student' })),
    ...parents.map(parent => ({ person: parent, kind: 'Parent' })),
  ]

  return people.flatMap(({ person, kind }) => {
    const badFields = [['first_name', 'first name'], ['last_name', 'last name']]
      .filter(([field]) => {
        const letters = (person[field] || '').replace(/\P{L}/gu, '')
        return letters.length > 1 && (letters === letters.toLowerCase() || letters === letters.toUpperCase())
      })
      .map(([, label]) => label)

    return badFields.length > 0
      ? [`${kind} "${person.fullName}": ${badFields.join(' and ')} not capitalized`]
      : []
  })
}

/**
 * Check: an initial in a last name ("B. Dallaire"), which sorts the person under that letter
 */
function checkInitialsInLastNames ({ students, parents }) {
  const people = [
    ...students.map(student => ({ person: student, kind: 'Student' })),
    ...parents.map(parent => ({ person: parent, kind: 'Parent' })),
  ]

  return people
    .filter(({ person }) => nameWords(person.last_name).some(word => /^\p{L}\.?$/u.test(word)))
    .map(({ person, kind }) => `${kind} "${person.fullName}": last name "${person.last_name}" contains an initial`)
}

// Each check gets the loaded data and returns one line per finding
const CHECKS = [
  { title: 'Child and parent last names', run: checkParentChildLastNames },
  { title: 'City spellings', run: checkCitySpellings },
  { title: 'Name capitals', run: checkNameCapitals },
  { title: 'Initials in last names', run: checkInitialsInLastNames },
]

async function checkData () {
  try {
    const db = initializeFirebase()

    console.log('📥 Fetching students and parents...')
    const [studentsSnapshot, parentsSnapshot] = await Promise.all([
      db.collection('students').get(),
      db.collection('parents').get(),
    ])

    const students = studentsSnapshot.docs.map(doc => new StudentDTO({ id: doc.id, ...doc.data() }))
    const parents = parentsSnapshot.docs.map(doc => new ParentDTO({ id: doc.id, ...doc.data() }))
    const data = {
      students,
      parents,
      parentsById: new Map(parents.map(parent => [parent.id, parent])),
    }
    console.log(`📊 ${students.length} students, ${parents.length} parents`)

    let total = 0
    for (const check of CHECKS) {
      const findings = check.run(data)
      total += findings.length
      console.log(`\n🔎 ${check.title}: ${findings.length === 0 ? '✅ nothing found' : `${findings.length} found`}`)
      for (const finding of findings) {
        console.log(`   - ${finding}`)
      }
    }

    console.log(`\n${total === 0 ? '✅ No inconsistencies found' : `⚠️  ${total} possible inconsistencies to review`}`)
  } catch (error) {
    console.error('\n💥 Check failed:', error.message)
    process.exit(1)
  }
}

checkData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
