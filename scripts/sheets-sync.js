#!/usr/bin/env node

/**
 * Google Sheets to Firebase Sync Script
 *
 * This script reads data from a Google Sheet and syncs it to a Firestore collection.
 * It can work with both the Firebase emulator (development) and production.
 *
 * Usage:
 *   Development: NODE_ENV=development node scripts/sheets-sync.js
 *   Production:  NODE_ENV=production node scripts/sheets-sync.js
 */

import { readFileSync } from 'node:fs'
import dotenv from 'dotenv'
import admin from 'firebase-admin'
import { google } from 'googleapis'

dotenv.config()

// Configuration
const config = {
  // Google Sheets configuration
  sheets: {
    id: process.env.GOOGLE_SHEET_ID || 'your-sheet-id-here',
    serviceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './credentials/google-service-account.json',
    // Define multiple tabs to sync
    tabs: [
      {
        name: 'Parents',
        range: 'Parents!B1:BQ1000',
        collection: 'parents',
        // Column mapping: sheet column name → firestore field name
        fieldMapping: {
          'Prénom': 'first_name',
          'Nom de famille de parent': 'last_name',
          'Cellulaire': 'phone',
          'Courriel': 'email',
          'Adresse': 'address',
          'Ville': 'city',
          'Code postale': 'postal_code',
          // Interest checkboxes (columns AP-BQ)
          'Cinéma': 'cinema',
          'Musique': 'musique',
          'Photos': 'photos',
          'Arts Plastiques': 'arts_plastiques',
          'Architecture': 'architecture',
          'Théâtre': 'theatre',
          'Danse': 'danse',
          'Résidence pour personnes âgées': 'residence_personnes_agees',
          'Banque alimentaire': 'banque_alimentaire',
          'Éco-quartier': 'eco_quartier',
          'Maison verte': 'maison_verte',
          'Jardin communautaire': 'jardin_communautaire',
          'Cuisine': 'cuisine',
          'Couture': 'couture',
          'Tricot': 'tricot',
          'Menuiserie': 'menuiserie',
          'Jardinage': 'jardinage',
          'Jeux de société': 'jeux_de_societe',
          'Échecs': 'echecs',
          'Traduction': 'traduction',
          'Langues vivantes': 'langues_vivantes',
          'Développement international': 'developpement_international',
          'Histoire': 'histoire',
          'Voyages': 'voyages',
          'Littérature': 'litterature',
          'Sports extérieurs': 'sports_exterieurs',
          'Sports intérieurs': 'sports_interieurs',
          'Yoga': 'yoga',
        },
        transformFunction: 'transformParents', // Optional custom transform
      },
      {
        name: 'Students',
        range: 'Élèves!A1:J1000',
        collection: 'students',
        fieldMapping: {
          'Prénom': 'first_name',
          'Nom de famille': 'last_name',
          'Classe': 'className',
          'Grade': 'level',
          'Parent 1': 'parent1',
          'Parent 2': 'parent2',
        },
        transformFunction: 'transformStudents',
      },
      {
        name: 'Staff',
        range: 'Personnel de l\'école!A1:I1000',
        collection: 'staff',
        fieldMapping: {
          'Prénom': 'first_name',
          'Nom de famille': 'last_name',
          'Titre': 'title',
          'Courriel': 'email',
          'Téléphone': 'phone',
          'Table pour bottin': 'directory_table',
          'Rôle-CE': 'ce_role',
          'Hierarchy-CE': 'ce_hierarchy',
        },
        // No transformFunction = uses generic mapping only
      },
      {
        name: 'Classes',
        range: 'Classes!A1:H1000',
        collection: 'classes',
        fieldMapping: {
          'Classe': 'classLetter',
          'Enseignant(e)': 'teacher',
          'Nom de classe': 'className',
          'Code': 'classCode',
          'Réprésenant(e) de classe 1': 'student_rep_1',
          'Réprésenant(e) de classe 2': 'student_rep_2',
          'Répresentant(e) Parent': 'parent_rep',
        },
        transformFunction: 'transformClasses',
      },
      {
        name: 'Committees',
        range: 'Comités!A1:I1000',
        collection: 'committees',
        // No fieldMapping - custom parsing in transform function
        transformFunction: 'transformCommittees',
      },
      {
        name: 'CE_Committees',
        range: 'CE!A1:I50',
        collection: 'committees',
        // No fieldMapping - custom parsing in transform function
        transformFunction: 'transformCECommittees',
      },
      {
        name: 'Fondation_Committee',
        range: 'Fondation!A1:E20',
        collection: 'committees',
        // No fieldMapping - custom parsing in transform function
        transformFunction: 'transformFondationCommittee',
      },
    ],
  },

  // Firebase configuration
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'your-project-id',
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './credentials/firebase-service-account.json',
    useEmulator: process.env.NODE_ENV === 'development',
  },
}

// Initialize Google Sheets API
async function initializeSheets () {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: config.sheets.serviceAccountPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    console.log('✅ Google Sheets API initialized')
    return sheets
  } catch (error) {
    console.error('❌ Failed to initialize Google Sheets API:', error.message)
    throw error
  }
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

// Read data from Google Sheets for a specific tab
async function readSheetData (sheets, tab) {
  try {
    console.log(`📊 Reading data from tab: ${tab.name}`)
    console.log(`📋 Range: ${tab.range}`)

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.sheets.id,
      range: tab.range,
    })

    const rows = response.data.values

    if (!rows || rows.length === 0) {
      console.log(`⚠️  No data found in tab: ${tab.name}`)
      return []
    }

    console.log(`✅ Successfully read ${rows.length} rows from tab: ${tab.name}`)
    return rows
  } catch (error) {
    console.error(`❌ Failed to read data from tab ${tab.name}:`, error.message)
    throw error
  }
}

// Transform data using field mapping and optional custom function
function transformData (rows, tab) {
  if (rows.length === 0) {
    return []
  }

  // Assume first row contains headers
  const headers = rows[0]
  const data = rows.slice(1)

  const documents = data.map(row => {
    const doc = {}

    for (const [colIndex, header] of headers.entries()) {
      const value = row[colIndex] || ''

      // Use field mapping if provided, otherwise generate field name
      let fieldName
      if (tab.fieldMapping) {
        if (tab.fieldMapping[header]) {
          fieldName = tab.fieldMapping[header]
          doc[fieldName] = value
        }
      } else {
        // Fallback to auto-generated field name
        fieldName = header.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        doc[fieldName] = value
      }
    }

    return doc
  })

  // Apply custom transform function if specified
  if (tab.transformFunction) {
    const transformFunction = getTransformFunction(tab.transformFunction)
    // For committees, pass raw rows since it needs custom parsing
    if (tab.transformFunction === 'transformCommittees' || tab.transformFunction === 'transformCECommittees' || tab.transformFunction === 'transformFondationCommittee') {
      return transformFunction(rows, tab) // Pass raw rows for custom parsing
    }
    return transformFunction(documents, tab) // Pass documents for other transforms
  }

  return documents
}

// Custom transform function for Parents (receives already-mapped documents)
function transformParents (documents) {
  // Define all interest field names that correspond to the checkbox columns
  const interestFields = [
    'cinema', 'musique', 'photos', 'arts_plastiques', 'architecture',
    'theatre', 'danse', 'residence_personnes_agees', 'banque_alimentaire',
    'eco_quartier', 'maison_verte', 'jardin_communautaire', 'cuisine',
    'couture', 'tricot', 'menuiserie', 'jardinage', 'jeux_de_societe',
    'echecs', 'traduction', 'langues_vivantes', 'developpement_international',
    'histoire', 'voyages', 'litterature', 'sports_exterieurs',
    'sports_interieurs', 'yoga',
  ]

  return documents.map(doc => {
    // keep only digits from phone number
    if (doc.phone) {
      doc.phone = doc.phone.replace(/[^\d]/g, '')
    }

    // Process interests: convert TRUE checkboxes to array of interest names
    doc.interests = interestFields.filter(field => doc[field] === 'TRUE')

    // Remove individual checkbox fields to clean up document
    for (const field of interestFields) {
      delete doc[field]
    }

    return doc
  })
}

// Custom transform function for Students (receives already-mapped documents)
function transformStudents (documents) {
  // Get the parents data that was processed earlier
  const parentsData = global.importedParents || []

  return documents.map(doc => {
    // Add student-specific transformations
    if (doc.level) {
      doc.level = Number.parseInt(doc.level)
    }

    // Lookup parent emails by name and remove parent name fields
    if (doc.parent1) {
      const parent1 = findParentByName(parentsData, doc.parent1)
      doc.parent1_email = parent1 ? parent1.email : null
      delete doc.parent1 // Remove parent name
    }

    if (doc.parent2) {
      const parent2 = findParentByName(parentsData, doc.parent2)
      doc.parent2_email = parent2 ? parent2.email : null
      delete doc.parent2 // Remove parent name
    }

    return doc
  })
}

// Helper function to find parent by name
function findParentByName (parents, searchName) {
  if (!searchName || parents.length === 0) {
    return null
  }

  const cleanSearchName = searchName.trim().toLowerCase()

  return parents.find(parent => {
    const fullName = `${parent.first_name} ${parent.last_name}`.toLowerCase()
    const reverseFullName = `${parent.last_name} ${parent.first_name}`.toLowerCase()

    return fullName === cleanSearchName
      || reverseFullName === cleanSearchName
      || parent.first_name.toLowerCase() === cleanSearchName
      || parent.last_name.toLowerCase() === cleanSearchName
  })
}

// Custom transform function for Teachers (receives already-mapped documents)
function transformTeachers (documents) {
  return documents.map(doc => {
    // Add teacher-specific transformations
    if (doc.subject) {
      doc.subjects_array = doc.subject.split(',').map(s => s.trim())
    }

    if (doc.room_number) {
      doc.room_floor = Math.floor(Number.parseInt(doc.room_number) / 100) || 1
    }

    return doc
  })
}

// Custom transform function for Classes (receives already-mapped documents)
function transformClasses (documents) {
  // Get the students, parents, and staff data that were processed earlier
  const studentsData = global.importedStudents || []
  const parentsData = global.importedParents || []
  const staffData = global.importedStaff || []

  return documents.map(doc => {
    // Standardize classLetter format (uppercase)
    if (doc.classLetter) {
      doc.classLetter = doc.classLetter.toString().toUpperCase().trim()
    }

    // Lookup teacher email or document ID by name
    if (doc.teacher) {
      const teacher = findStaffByName(staffData, doc.teacher)
      // Use email if available, otherwise use document ID
      doc.teacher = teacher ? (teacher.email || teacher._docId) : null
    }

    // Lookup student document IDs by name for representatives
    if (doc.student_rep_1) {
      const student1 = findStudentByName(studentsData, doc.student_rep_1)
      doc.student_rep_1 = student1 ? student1._docId : null
    }

    if (doc.student_rep_2) {
      const student2 = findStudentByName(studentsData, doc.student_rep_2)
      doc.student_rep_2 = student2 ? student2._docId : null
    }

    // Lookup parent email (which is also their document ID) by name
    if (doc.parent_rep) {
      const parent = findParentByName(parentsData, doc.parent_rep)
      doc.parent_rep = parent ? parent.email : null // Replace name with email
    }

    return doc
  })
}

// Helper function to find student by name
function findStudentByName (students, searchName) {
  if (!searchName || students.length === 0) {
    return null
  }

  const cleanSearchName = searchName.trim().toLowerCase()

  return students.find(student => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
    const reverseFullName = `${student.last_name} ${student.first_name}`.toLowerCase()

    return fullName === cleanSearchName
      || reverseFullName === cleanSearchName
      || student.first_name.toLowerCase() === cleanSearchName
      || student.last_name.toLowerCase() === cleanSearchName
  })
}

// Helper function to find staff by name
function findStaffByName (staff, searchName) {
  if (!searchName || staff.length === 0) {
    return null
  }

  const cleanSearchName = searchName.trim().toLowerCase()

  return staff.find(staffMember => {
    const fullName = `${staffMember.first_name} ${staffMember.last_name}`.toLowerCase()
    const reverseFullName = `${staffMember.last_name} ${staffMember.first_name}`.toLowerCase()

    return fullName === cleanSearchName
      || reverseFullName === cleanSearchName
      || staffMember.first_name.toLowerCase() === cleanSearchName
      || staffMember.last_name.toLowerCase() === cleanSearchName
  })
}

// Custom transform function for Committees (receives raw rows, no field mapping)
function transformCommittees (rows) {
  // Get the parents data for email lookup
  const parentsData = global.importedParents || []

  if (rows.length === 0) {
    return []
  }

  const committees = new Map() // Use Map to group by committee name
  let currentCommittee = null

  // Process each row to understand section-based structure
  for (const row of rows) {
    // Skip empty rows
    if (!row || row.length < 3) {
      continue
    }

    const parentName = row[0] // Column A
    const email = row[2] // Column C

    // Check if this is a committee header row
    if (parentName === 'Nom complète du parent' && row[4]) {
      // This is a header row, the committee name is in column E (index 4)
      currentCommittee = row[4]
      continue
    }

    // Check for committee header pattern: committee name in both column A and E
    if (parentName && row[4] && parentName === row[4] && !parentName.includes('@')) {
      currentCommittee = parentName
      continue
    }

    // Check for other committee header patterns (committee name in other columns)
    if (!parentName || parentName === 'Nom complète du parent') {
      // Look for committee names in other columns for header rows
      for (let col = 4; col < row.length; col++) {
        if (row[col] && row[col].trim() && !row[col].includes('@') && row[col] !== 'TRUE' && row[col] !== 'FALSE') {
          // Only switch committee if we're not already processing a committee with no members yet
          const potentialCommittee = row[col].trim()
          if (!currentCommittee || (committees.has(currentCommittee) && committees.get(currentCommittee).members.length > 0)) {
            currentCommittee = potentialCommittee
          }
          break
        }
      }
      continue
    }

    // If we have a current committee and a parent name, this is a member row
    if (currentCommittee && parentName && parentName !== currentCommittee) {
      // Find parent email from imported parents data
      const parent = findParentByName(parentsData, parentName)
      const parentEmail = parent ? parent.email : email // Use found email or fallback to sheet email

      // Skip if we can't determine parent email
      if (!parentEmail) {
        continue
      }

      // Initialize committee if not exists
      if (!committees.has(currentCommittee)) {
        committees.set(currentCommittee, {
          name: currentCommittee,
          members: [],
        })
      }

      // Add member to committee (avoid duplicates)
      const committee = committees.get(currentCommittee)
      const existingMember = committee.members.find(m => m.email === parentEmail)

      if (!existingMember) {
        committee.members.push({
          email: parentEmail,
          member_type: 'parent',
          role: 'Member',
        })
      }
    }
  }

  const result = Array.from(committees.values())

  // Also include committees with no members (like Ateliers) if they were found as headers
  const allCommitteeNames = new Set()
  for (const row of rows) {
    if (!row || row.length < 3) {
      continue
    }

    const parentName = row[0]
    // Look for committee name patterns
    if (parentName && row[4] && parentName === row[4] && !parentName.includes('@')) {
      allCommitteeNames.add(parentName)
    }
  }

  // Add any missing committees (committees with no members)
  for (const committeeName of allCommitteeNames) {
    if (!committees.has(committeeName)) {
      result.push({
        name: committeeName,
        members: [],
      })
    }
  }

  // Convert Map to array of committee documents
  return result
}

// Transform function for CE committees (parents and staff)
function transformCECommittees (rows) {
  if (!rows || rows.length === 0) {
    return []
  }

  // Create lookup maps for parents and staff
  const parentsData = global.importedParents || []

  // Create email-based lookup maps
  const parentsLookup = new Map(parentsData.map(p => [p.email, p]))

  const committees = []
  let currentCommittee = null
  let currentMembers = []
  let isStaffCommittee = false

  for (const row of rows) {
    if (!row || row.length === 0) {
      continue
    }

    const firstCell = row[0]?.toString().trim()

    // Check for committee headers
    if (firstCell && firstCell.includes('Comité d\'Établissement')) {
      // Save previous committee if exists
      if (currentCommittee && currentMembers.length > 0) {
        committees.push({
          name: currentCommittee,
          members: currentMembers,
        })
      }

      // Start new committee
      currentCommittee = firstCell
      currentMembers = []
      isStaffCommittee = firstCell.toLowerCase().includes('enseignant') || firstCell.toLowerCase().includes('équipe enseignants')
      continue
    }

    // Skip header rows (Rôle-CE, Nom complète, etc.)
    if (firstCell === 'Rôle-CE' || firstCell === 'Nom complèt' || firstCell === 'Nom complète du parent') {
      continue
    }

    // Skip empty rows or rows with just spaces/notes
    if (!firstCell || firstCell.toLowerCase().includes('maybe') || firstCell.toLowerCase().includes('repaq')) {
      continue
    }

    // Process member rows - role is in first column
    if (currentCommittee && firstCell) {
      const role = firstCell
      const name = row[1]?.toString().trim()
      const email = row[3]?.toString().trim()

      if (name && email) {
        if (isStaffCommittee) {
          currentMembers.push({
            email,
            role,
            member_type: 'staff',
            active: true, // assume active unless specified otherwise
          })
        } else {
          // Look up parent by email to ensure it exists in our parent data
          const parentData = parentsLookup.get(email)
          const parentEmail = parentData?.email || email

          currentMembers.push({
            email: parentEmail,
            role,
            member_type: 'parent',
            active: true, // assume active unless specified otherwise
          })
        }
      }
    }
  }

  // Save the last committee
  if (currentCommittee && currentMembers.length > 0) {
    committees.push({
      name: currentCommittee,
      members: currentMembers,
    })
  }

  console.log(`🔄 Found ${committees.length} CE committees`)
  for (const committee of committees) {
    console.log(`  - ${committee.name}: ${committee.members.length} members`)
  }

  return committees
}

// Transform function for Fondation committee
function transformFondationCommittee (rows) {
  if (!rows || rows.length <= 1) {
    return []
  } // Need at least header + 1 data row

  const members = []

  // Skip row 0 (header) and process data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) {
      continue
    }

    const role = row[0]?.toString().trim() // Column A
    const email = row[3]?.toString().trim() // Column D

    // Only add members with both role and email
    if (role && email) {
      members.push({
        email,
        role,
        member_type: 'parent',
        active: true, // assume all Fondation members are active
      })
    }
  }

  console.log(`🔄 Found Fondation committee with ${members.length} members`)

  // Return single committee document
  return [{
    name: 'Fondation',
    members,
  }]
}

// Get transform function by name
function getTransformFunction (functionName) {
  const transformFunctions = {
    transformParents,
    transformStudents,
    transformTeachers,
    transformClasses,
    transformCommittees,
    transformCECommittees,
    transformFondationCommittee,
  }

  return transformFunctions[functionName]
}

// Write data to Firestore
async function writeToFirestore (db, documents, collectionName) {
  if (documents.length === 0) {
    console.log(`⚠️  No documents to write to ${collectionName}`)
    return
  }

  try {
    const collectionRef = db.collection(collectionName)

    // Clear existing data (optional - remove if you want to append)
    console.log(`🗑️  Clearing existing data from ${collectionName}...`)
    const snapshot = await collectionRef.get()
    const batch = db.batch()

    for (const doc of snapshot.docs) {
      batch.delete(doc.ref)
    }

    await batch.commit()

    // Write new data
    console.log(`💾 Writing ${documents.length} documents to ${collectionName}...`)

    const writeBatch = db.batch()
    let emailCount = 0
    let autoIdCount = 0
    const documentsWithIds = [] // Track documents with their IDs

    for (const doc of documents) {
      let docId

      // Use custom document ID logic based on collection
      if ((collectionName === 'parents' || collectionName === 'staff') && doc.email && doc.email.trim()) {
        // Sanitize email for Firestore document ID
        const sanitizedEmail = doc.email.trim()
          .replace(/[/[\]]/g, '_') // Replace invalid characters with underscore
          .replace(/\s+/g, '_') // Replace spaces with underscore

        // Check if sanitized email is still valid (not empty after sanitization)
        if (sanitizedEmail && sanitizedEmail.length > 0) {
          docId = sanitizedEmail
          emailCount++
        } else {
          docId = undefined // Fall back to auto-generated ID
          autoIdCount++
        }
      } else if (collectionName === 'classes' && doc.classLetter && doc.classLetter.trim()) {
        // Use classLetter as document ID for classes
        docId = doc.classLetter.trim()
      } else if (collectionName === 'committees' && doc.name && doc.name.trim()) {
        // Use committee name as document ID for committees
        docId = doc.name.trim()
      } else {
        if (collectionName === 'parents' || collectionName === 'staff') {
          autoIdCount++
        }
        // Auto-generate ID for other collections or if classLetter/email is missing
        docId = undefined
      }

      const docRef = docId ? collectionRef.doc(docId) : collectionRef.doc()

      // Store document with its ID for reference
      const docWithId = { ...doc, _docId: docRef.id }
      documentsWithIds.push(docWithId)

      writeBatch.set(docRef, doc)
    }

    // Store students data globally for classes lookup
    if (collectionName === 'students') {
      global.importedStudents = documentsWithIds
      console.log(`📝 Stored ${documentsWithIds.length} students with IDs for classes lookup`)
    }

    // Store staff data globally for classes lookup
    if (collectionName === 'staff') {
      global.importedStaff = documentsWithIds
      console.log(`📝 Stored ${documentsWithIds.length} staff members for classes lookup`)
    }

    if (collectionName === 'parents' || collectionName === 'staff') {
      console.log(`📧 Using emails as IDs: ${emailCount}, Auto-generated IDs: ${autoIdCount}`)
    }

    await writeBatch.commit()
    console.log(`✅ Successfully wrote ${documents.length} documents to collection: ${collectionName}`)
  } catch (error) {
    console.error(`❌ Failed to write to collection ${collectionName}:`, error.message)
    throw error
  }
}

// Main sync function
async function syncSheetsToFirestore () {
  console.log('🚀 Starting Google Sheets to Firebase sync...')
  console.log(`🔧 Environment: ${config.firebase.useEmulator ? 'Development (Emulator)' : 'Production'}`)
  console.log(`📋 Processing ${config.sheets.tabs.length} tabs`)

  try {
    // Initialize services
    const sheets = await initializeSheets()
    const db = await initializeFirebase()

    // Collect all committee documents from multiple tabs
    const allCommitteeDocuments = []
    const processedCollections = new Set()

    // Process each tab
    for (const tab of config.sheets.tabs) {
      console.log(`\n📂 Processing tab: ${tab.name}`)

      try {
        // Read data from this tab
        const rows = await readSheetData(sheets, tab)

        // Transform data using field mapping and optional custom function
        const documents = transformData(rows, tab)

        console.log(`🔄 Transformed ${documents.length} documents with field mapping${tab.transformFunction ? ` + ${tab.transformFunction}` : ''}`)

        // Store parents and staff data globally for lookups
        if (tab.collection === 'parents') {
          global.importedParents = documents
          console.log(`📝 Stored ${documents.length} parents for student lookup`)
        }
        if (tab.collection === 'staff') {
          global.importedStaff = documents
          console.log(`📝 Stored ${documents.length} staff for committee lookup`)
        }

        // Handle committees collection specially - collect all committee documents
        if (tab.collection === 'committees') {
          allCommitteeDocuments.push(...documents)
          console.log(`📝 Collected ${documents.length} committee documents from ${tab.name}`)
          continue
        }

        // Write to the specified collection for non-committee collections
        await writeToFirestore(db, documents, tab.collection, tab)

        console.log(`✅ Successfully synced ${tab.name} → ${tab.collection}`)
        processedCollections.add(tab.collection)
      } catch (tabError) {
        console.error(`❌ Failed to process tab ${tab.name}:`, tabError.message)
        // Continue with other tabs instead of failing completely
        continue
      }
    }

    // Write all committee documents together
    if (allCommitteeDocuments.length > 0) {
      console.log(`\n💾 Writing all ${allCommitteeDocuments.length} committee documents...`)
      await writeToFirestore(db, allCommitteeDocuments, 'committees', { name: 'All Committees' })
      console.log(`✅ Successfully synced all committees → committees`)
    }

    console.log('\n🎉 Sync completed successfully!')
  } catch (error) {
    console.error('💥 Sync failed:', error.message)
    process.exit(1)
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  syncSheetsToFirestore()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Script failed:', error)
      process.exit(1)
    })
}

export { syncSheetsToFirestore }
