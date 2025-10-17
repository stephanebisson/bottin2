#!/usr/bin/env node

import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'

const app = initializeApp({ projectId: 'bottin2-3b41d' })
const db = getFirestore(app)

console.log('🔍 Checking Firestore data...\n')

const classesSnapshot = await db.collection('classes').get()
console.log(`📚 Classes collection: ${classesSnapshot.size} documents`)

const parentsSnapshot = await db.collection('parents').limit(5).get()
console.log(`👪 Parents collection: ${parentsSnapshot.size} documents (showing first 5)`)

parentsSnapshot.forEach(doc => {
  const data = doc.data()
  console.log(`  - ${doc.id}: ${data.firstName} ${data.lastName}`)
})

const studentsSnapshot = await db.collection('students').get()
console.log(`\n👨‍🎓 Students collection: ${studentsSnapshot.size} documents`)

console.log('\n✅ Data check complete!')
process.exit(0)
