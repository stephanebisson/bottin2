#!/usr/bin/env node

/**
 * Stale Parents Script
 *
 * Lists the parents who have not submitted the update form this school year
 * (lastUpdated is empty or before July 1) and, for each, what the old
 * /workflows collection says about previous years: whether the update email
 * was sent and whether they submitted the form, and when.
 *
 * The old workflows were stored as /workflows/parent_updates_{year}, with one
 * /participants/{email} document per parent holding parentId, emailSent,
 * emailSentAt, formSubmitted, submittedAt, optedOut and, when the other
 * parent confirmed the same address, confirmedByPartner.
 * Participants are matched to parents by parentId, or by email when the
 * parentId no longer exists.
 *
 * Read-only, unless run with --fix: then each parent whose last submission in
 * the old workflows is more recent than their lastUpdated (or whose lastUpdated
 * is empty) gets lastUpdated set to that submission date, and a
 * 'restore_previous_submission' entry is added to /actionLogs with the
 * submission's school year in its details.
 *
 * Usage:
 *   pnpm parents:stale:prod
 *   pnpm parents:stale:dev
 *   pnpm parents:stale:prod:fix
 *   pnpm parents:stale:dev:fix
 */

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { cert, deleteApp, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { ParentDTO } from '../src/dto/ParentDTO.js'
import { getCurrentSchoolYear, isInCurrentSchoolYear } from '../src/utils/schoolYear.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ENV = process.env.NODE_ENV || 'development'
const FIX = process.argv.includes('--fix')

console.log(`🔧 Environment: ${ENV}`)
if (FIX) {
  console.log('✏️  FIX MODE - lastUpdated will be set from previous submissions\n')
}

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

  return app
}

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

function toMillis (value) {
  if (!value) {
    return 0
  }
  return value.toMillis ? value.toMillis() : new Date(value).getTime() || 0
}

/**
 * Firestore Timestamp, Date or string to YYYY-MM-DD, or null
 */
function formatDate (value) {
  if (!value) {
    return null
  }
  const date = value.toDate ? value.toDate() : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

/**
 * Read every participant of every old workflow
 */
async function loadParticipants (db) {
  const workflowsSnapshot = await db.collection('workflows').get()
  const participants = []
  for (const workflowDoc of workflowsSnapshot.docs) {
    const workflow = workflowDoc.data()
    const participantsSnapshot = await workflowDoc.ref.collection('participants').get()
    console.log(`📁 Workflow ${workflowDoc.id} (${workflow.schoolYear || 'no school year'}, ${workflow.status || 'no status'}): ${participantsSnapshot.size} participants`)
    for (const participantDoc of participantsSnapshot.docs) {
      participants.push({
        workflowId: workflowDoc.id,
        schoolYear: workflow.schoolYear || workflowDoc.id,
        email: participantDoc.id,
        ...participantDoc.data(),
      })
    }
  }
  return participants
}

/**
 * One line describing a parent's participation in one old workflow
 */
function describeParticipation (participant) {
  const parts = []
  if (participant.formSubmitted) {
    const submittedAt = formatDate(participant.submittedAt)
    parts.push(`✅ submitted${submittedAt ? ` ${submittedAt}` : ''}`)
    if (participant.confirmedByPartner) {
      parts.push(`(address confirmed by ${participant.confirmedByPartner})`)
    }
  } else {
    parts.push('❌ not submitted')
  }
  if (participant.emailSent) {
    const emailSentAt = formatDate(participant.emailSentAt)
    parts.push(`email sent${emailSentAt ? ` ${emailSentAt}` : ''}`)
  } else {
    parts.push('email not sent')
  }
  if (participant.optedOut) {
    parts.push('opted out')
  }
  return `${participant.schoolYear}: ${parts.join(', ')}`
}

/**
 * Parents whose latest previous submission is more recent than their lastUpdated
 */
function findSubmissionsToRestore (entries) {
  return entries
    .map(({ parent, history }) => ({
      parent,
      submission: history
        .filter(participant => participant.formSubmitted && participant.submittedAt)
        .toSorted((a, b) => toMillis(b.submittedAt) - toMillis(a.submittedAt))[0],
    }))
    .filter(({ parent, submission }) => submission && toMillis(submission.submittedAt) > toMillis(parent.lastUpdated))
}

/**
 * Set lastUpdated from the latest previous submission and log it
 */
async function restorePreviousSubmissions (db, toFix) {
  if (toFix.length === 0) {
    console.log('\n✅ Nothing to fix: every parent\'s lastUpdated is already as recent as their last submission')
    return
  }

  console.log(`\n✏️  ${toFix.length} parents to set lastUpdated from a previous submission:`)
  for (const { parent, submission } of toFix) {
    console.log(`   - ${parent.fullName}: ${formatDate(parent.lastUpdated) || 'empty'} → ${formatDate(submission.submittedAt)} (${submission.schoolYear})`)
  }

  if (ENV === 'production') {
    console.log(`\n⚠️  WARNING: You are about to update ${toFix.length} parents in PRODUCTION!`)
    const answer = await askQuestion('\nType "UPDATE" to continue: ')

    if (answer !== 'UPDATE') {
      throw new Error('Update cancelled')
    }
  }

  const schoolYear = getCurrentSchoolYear()
  const writer = db.bulkWriter()
  for (const { parent, submission } of toFix) {
    writer.update(db.collection('parents').doc(parent.id), {
      lastUpdated: submission.submittedAt,
      updatedAt: new Date(),
    })
    writer.create(db.collection('actionLogs').doc(), {
      actionType: 'restore_previous_submission',
      actor: 'script:find-stale-parents',
      entityType: 'parent',
      entityId: parent.id,
      entityName: parent.fullName,
      schoolYear,
      timestamp: new Date(),
      details: {
        submittedAt: submission.submittedAt,
        submittedSchoolYear: submission.schoolYear,
        workflowId: submission.workflowId,
        previousLastUpdated: parent.lastUpdated || null,
        ...(submission.confirmedByPartner ? { confirmedByPartner: submission.confirmedByPartner } : {}),
      },
    })
  }
  await writer.close()

  console.log(`\n✅ Updated ${toFix.length} parents and logged each one`)
}

async function findStaleParents () {
  const app = initializeFirebase()
  try {
    const db = getFirestore(app)

    const [parentsSnapshot, participants] = await Promise.all([
      db.collection('parents').get(),
      loadParticipants(db),
    ])
    const parents = parentsSnapshot.docs.map(doc => new ParentDTO({ id: doc.id, ...doc.data() }))

    const byParentId = new Map()
    const byEmail = new Map()
    for (const participant of participants) {
      if (participant.parentId) {
        byParentId.set(participant.parentId, [...(byParentId.get(participant.parentId) || []), participant])
      }
      const email = String(participant.email || '').trim().toLowerCase()
      if (email) {
        byEmail.set(email, [...(byEmail.get(email) || []), participant])
      }
    }

    const stale = parents
      .filter(parent => !isInCurrentSchoolYear(parent.lastUpdated))
      .toSorted((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'fr'))

    console.log(`\n📊 ${parents.length} parents, ${stale.length} have not submitted the update form in ${getCurrentSchoolYear()}`)

    const groups = { submittedBefore: [], neverSubmitted: [], notInWorkflows: [] }
    for (const parent of stale) {
      const history = byParentId.get(parent.id) || byEmail.get(parent.email.toLowerCase()) || []
      history.sort((a, b) => String(a.schoolYear).localeCompare(String(b.schoolYear)))
      const entry = { parent, history }
      if (history.length === 0) {
        groups.notInWorkflows.push(entry)
      } else if (history.some(participant => participant.formSubmitted)) {
        groups.submittedBefore.push(entry)
      } else {
        groups.neverSubmitted.push(entry)
      }
    }

    const sections = [
      ['🟢 Submitted in a previous year', groups.submittedBefore],
      ['🟠 In previous workflows but never submitted', groups.neverSubmitted],
      ['⚪ Not in any previous workflow', groups.notInWorkflows],
    ]
    for (const [title, entries] of sections) {
      console.log(`\n${title}: ${entries.length}`)
      for (const { parent, history } of entries) {
        const flags = [
          parent.email || 'no email',
          parent.lastUpdated ? `lastUpdated ${formatDate(parent.lastUpdated)}` : 'lastUpdated empty',
          parent.optedOut ? 'opted out' : null,
        ].filter(Boolean).join(', ')
        console.log(`   - ${parent.fullName || `${parent.first_name} ${parent.last_name}`} (${flags})`)
        for (const participant of history) {
          console.log(`        ${describeParticipation(participant)}`)
        }
      }
    }

    const toFix = findSubmissionsToRestore(groups.submittedBefore)
    if (FIX) {
      await restorePreviousSubmissions(db, toFix)
    } else if (toFix.length > 0) {
      console.log(`\n${toFix.length} parents have a previous submission more recent than their lastUpdated: run with --fix to update them`)
    } else {
      console.log('\n✅ Nothing to fix: every parent\'s lastUpdated is already as recent as their last submission')
    }
  } catch (error) {
    console.error('\n💥 Script failed:', error.message)
    process.exit(1)
  } finally {
    await deleteApp(app)
  }
}

findStaleParents()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
