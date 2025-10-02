const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const { onRequest } = require('firebase-functions/v2/https')
const { FUNCTIONS_REGION } = require('./config')

// Get Firestore instance
const db = admin.firestore()

/**
 * Start the school year progression workflow
 * Analyzes all students and stages progression changes
 */
exports.startSchoolProgressionV2 = onRequest({
  region: FUNCTIONS_REGION,
  cors: {
    origin: [
      'https://bottin-etoile-filante.org',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    console.log('=== startSchoolProgressionV2 called ===')

    // Verify user is authenticated and is admin
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' })
    }

    const idToken = authHeader.split('Bearer ')[1]
    let decodedToken

    try {
      decodedToken = await admin.auth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { schoolYear, adminEmail } = req.body

    if (!schoolYear || !adminEmail) {
      return res.status(400).json({
        error: 'School year and admin email are required',
      })
    }

    // Create workflow ID
    const currentYear = new Date().getFullYear()
    const workflowId = `school_progression_${currentYear}`

    // Check if workflow already exists
    const existingWorkflowDoc = await db.collection('workflows').doc(workflowId).get()
    if (existingWorkflowDoc.exists) {
      const existingData = existingWorkflowDoc.data()
      return res.status(409).json({
        error: `A school progression workflow already exists for ${currentYear}. Please complete or cancel the current workflow before starting a new one.`,
        currentWorkflow: existingData,
      })
    }

    // Get all current students
    const studentsSnapshot = await db.collection('students').get()
    const students = studentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log(`Analyzing ${students.length} students for progression`)

    // Analyze students and stage changes
    const batch = db.batch()
    const workflowRef = db.collection('workflows').doc(workflowId)

    const stats = {
      totalStudents: students.length,
      autoProgression: 0,
      needsClassAssignment: 0,
      graduating: 0,
    }

    // Create main workflow document
    batch.set(workflowRef, {
      id: workflowId,
      type: 'school_progression',
      schoolYear,
      status: 'active',
      phase: 'analysis_complete',
      startedAt: FieldValue.serverTimestamp(),
      adminEmail,
      stats,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Process each student and create staged changes
    for (const student of students) {
      const currentLevel = Number.parseInt(student.level) || 0
      let changeType = 'unknown'
      let newLevel = currentLevel
      let newClass = student.className
      let requiresAssignment = false

      // Determine progression logic
      switch (currentLevel) {
        case 1:
        case 3:
        case 5: {
        // Auto-progression: stay in same class, go to next level
          newLevel = currentLevel + 1
          changeType = 'auto_progression'
          stats.autoProgression++

          break
        }
        case 2:
        case 4: {
        // Manual assignment needed: move to new class and next level
          newLevel = currentLevel + 1
          newClass = null // Will be assigned by admin
          requiresAssignment = true
          changeType = 'needs_assignment'
          stats.needsClassAssignment++

          break
        }
        case 6: {
        // Graduation: remove student
          changeType = 'graduating'
          stats.graduating++

          break
        }
        default: {
        // Invalid level
          changeType = 'invalid_level'
          console.warn(`Student ${student.id} has invalid level: ${currentLevel}`)
        }
      }

      // Create staged change document
      const changeRef = workflowRef.collection('changes').doc(student.id)
      batch.set(changeRef, {
        studentId: student.id,
        studentName: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
        currentLevel,
        currentClass: student.className,
        newLevel,
        newClass,
        changeType,
        requiresAssignment,
        processed: false,
        createdAt: FieldValue.serverTimestamp(),
      })

      // If assignment needed, create assignment document
      if (requiresAssignment) {
        const assignmentRef = workflowRef.collection('assignments').doc(student.id)
        batch.set(assignmentRef, {
          studentId: student.id,
          studentName: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
          currentLevel,
          currentClass: student.className,
          newLevel,
          assignedClass: null,
          assigned: false,
          assignedAt: null,
          assignedBy: null,
          createdAt: FieldValue.serverTimestamp(),
        })
      }
    }

    // Update stats in workflow document
    batch.update(workflowRef, { stats })

    // Commit all changes
    await batch.commit()

    console.log(`School progression workflow ${workflowId} created successfully`)
    console.log('Stats:', stats)

    res.status(200).json({
      message: 'School progression workflow started successfully',
      workflowId,
      stats,
    })
  } catch (error) {
    console.error('Failed to start school progression:', error)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
})

/**
 * Assign a class to a student who needs manual assignment
 */
exports.assignTransitionClassV2 = onRequest({
  region: FUNCTIONS_REGION,
  cors: {
    origin: [
      'https://bottin-etoile-filante.org',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    // Verify user is authenticated and is admin
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' })
    }

    const idToken = authHeader.split('Bearer ')[1]
    let decodedToken

    try {
      decodedToken = await admin.auth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { workflowId, studentId, assignedClass } = req.body

    if (!workflowId || !studentId || !assignedClass) {
      return res.status(400).json({
        error: 'Workflow ID, student ID, and assigned class are required',
      })
    }

    const workflowRef = db.collection('workflows').doc(workflowId)
    const assignmentRef = workflowRef.collection('assignments').doc(studentId)
    const changeRef = workflowRef.collection('changes').doc(studentId)

    // Update assignment document
    await assignmentRef.update({
      assignedClass,
      assigned: true,
      assignedAt: FieldValue.serverTimestamp(),
      assignedBy: decodedToken.email,
    })

    // Update staged change document
    await changeRef.update({
      newClass: assignedClass,
      updatedAt: FieldValue.serverTimestamp(),
    })

    res.status(200).json({
      message: 'Class assignment completed successfully',
      studentId,
      assignedClass,
    })
  } catch (error) {
    console.error('Failed to assign class:', error)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
})

/**
 * Add a new level 1 student to the workflow
 */
exports.addNewStudentV2 = onRequest({
  region: FUNCTIONS_REGION,
  cors: {
    origin: [
      'https://bottin-etoile-filante.org',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    // Verify user is authenticated and is admin
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' })
    }

    const idToken = authHeader.split('Bearer ')[1]
    let decodedToken

    try {
      decodedToken = await admin.auth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { workflowId, student, parent1, parent2, useExistingParent1, useExistingParent2 } = req.body

    if (!workflowId || !student || !parent1) {
      return res.status(400).json({
        error: 'Workflow ID, student info, and at least one parent are required',
      })
    }

    // Validate required student fields
    if (!student.first_name || !student.last_name || !student.className) {
      return res.status(400).json({
        error: 'Student first name, last name, and class are required',
      })
    }

    // Validate parent 1 fields (different validation for existing vs new)
    if (useExistingParent1) {
      if (!parent1.email) {
        return res.status(400).json({
          error: 'Existing parent must have an email',
        })
      }
    } else {
      if (!parent1.first_name || !parent1.last_name || !parent1.email) {
        return res.status(400).json({
          error: 'New parent first name, last name, and email are required',
        })
      }
    }

    // Validate parent 2 fields if provided
    if (parent2) {
      if (useExistingParent2) {
        if (!parent2.email) {
          return res.status(400).json({
            error: 'Existing parent 2 must have an email',
          })
        }
      } else {
        // For new parent 2, email is required but other fields can be optional
        if (!parent2.email) {
          return res.status(400).json({
            error: 'Parent 2 email is required',
          })
        }
      }
    }

    const workflowRef = db.collection('workflows').doc(workflowId)

    // Generate unique ID for new student
    const newStudentId = `new_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const newStudentRef = workflowRef.collection('new_students').doc(newStudentId)

    // Create new student document
    await newStudentRef.set({
      id: newStudentId,
      student: {
        ...student,
        level: 1, // New students always start at level 1
        parent1_email: parent1.email,
        parent2_email: parent2?.email || null,
      },
      parent1: {
        ...parent1,
        isExisting: useExistingParent1 || false,
      },
      parent2: parent2
        ? {
            ...parent2,
            isExisting: useExistingParent2 || false,
          }
        : null,
      addedBy: decodedToken.email,
      addedAt: FieldValue.serverTimestamp(),
    })

    res.status(200).json({
      message: 'New student added successfully',
      studentId: newStudentId,
    })
  } catch (error) {
    console.error('Failed to add new student:', error)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
})

/**
 * Mark students as departing from school before graduation
 */
exports.markStudentsDepartingV2 = onRequest({
  region: FUNCTIONS_REGION,
  cors: {
    origin: [
      'https://bottin-etoile-filante.org',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    // Verify user is authenticated and is admin
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' })
    }

    const idToken = authHeader.split('Bearer ')[1]
    let decodedToken

    try {
      decodedToken = await admin.auth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { workflowId, departingStudents } = req.body

    if (!workflowId || !departingStudents || !Array.isArray(departingStudents)) {
      return res.status(400).json({
        error: 'Workflow ID and departing students array are required',
      })
    }

    const workflowRef = db.collection('workflows').doc(workflowId)
    const batch = db.batch()

    // Add each departing student to the departing_students subcollection
    for (const student of departingStudents) {
      const departingRef = workflowRef.collection('departing_students').doc(student.studentId)
      batch.set(departingRef, {
        studentId: student.studentId,
        studentName: student.studentName,
        currentLevel: student.currentLevel,
        currentClass: student.currentClass,
        departureReason: student.departureReason || '',
        markedBy: decodedToken.email,
        markedAt: FieldValue.serverTimestamp(),
      })

      // Update the corresponding change document to mark as departing
      const changeRef = workflowRef.collection('changes').doc(student.studentId)
      batch.update(changeRef, {
        changeType: 'departing',
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    await batch.commit()

    res.status(200).json({
      message: 'Students marked as departing successfully',
      count: departingStudents.length,
    })
  } catch (error) {
    console.error('Failed to mark students as departing:', error)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
})

/**
 * Remove a student from the departing list
 */
exports.removeDepartingStudentV2 = onRequest({
  region: FUNCTIONS_REGION,
  cors: {
    origin: [
      'https://bottin-etoile-filante.org',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    // Verify user is authenticated and is admin
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' })
    }

    const idToken = authHeader.split('Bearer ')[1]
    let decodedToken

    try {
      decodedToken = await admin.auth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { workflowId, studentId } = req.body

    if (!workflowId || !studentId) {
      return res.status(400).json({
        error: 'Workflow ID and student ID are required',
      })
    }

    const workflowRef = db.collection('workflows').doc(workflowId)
    const batch = db.batch()

    // Remove from departing_students subcollection
    const departingRef = workflowRef.collection('departing_students').doc(studentId)
    batch.delete(departingRef)

    // Get the original change document to restore its original state
    const changeRef = workflowRef.collection('changes').doc(studentId)
    const changeDoc = await changeRef.get()

    if (changeDoc.exists) {
      const changeData = changeDoc.data()
      let originalChangeType = 'unknown'

      // Determine original progression logic based on current level
      const currentLevel = changeData.currentLevel
      switch (currentLevel) {
        case 1:
        case 3:
        case 5: {
          originalChangeType = 'auto_progression'

          break
        }
        case 2:
        case 4: {
          originalChangeType = 'needs_assignment'

          break
        }
        case 6: {
          originalChangeType = 'graduating'

          break
        }
      // No default
      }

      // Restore the original change type
      batch.update(changeRef, {
        changeType: originalChangeType,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    await batch.commit()

    res.status(200).json({
      message: 'Student removed from departing list successfully',
      studentId,
    })
  } catch (error) {
    console.error('Failed to remove departing student:', error)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
})

/**
 * Get the current status of a school progression workflow
 */
exports.getProgressionStatusV2 = onRequest({
  region: FUNCTIONS_REGION,
  cors: {
    origin: [
      'https://bottin-etoile-filante.org',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
}, async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' })
  }

  try {
    // Verify user is authenticated and is admin
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' })
    }

    const idToken = authHeader.split('Bearer ')[1]
    let decodedToken

    try {
      decodedToken = await admin.auth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Get current school progression workflow
    const currentYear = new Date().getFullYear()
    const workflowId = `school_progression_${currentYear}`

    const workflowDoc = await db.collection('workflows').doc(workflowId).get()

    if (!workflowDoc.exists) {
      return res.status(200).json({
        current: null,
        history: [],
      })
    }

    const workflowData = workflowDoc.data()

    // Get subcollections
    const [changesSnapshot, assignmentsSnapshot, newStudentsSnapshot, departingSnapshot] = await Promise.all([
      workflowDoc.ref.collection('changes').get(),
      workflowDoc.ref.collection('assignments').get(),
      workflowDoc.ref.collection('new_students').get(),
      workflowDoc.ref.collection('departing_students').get(),
    ])

    // Process changes
    const changes = changesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }))

    // Process assignments
    const assignments = assignmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      assignedAt: doc.data().assignedAt?.toDate?.()?.toISOString() || null,
    }))

    // Process new students
    const newStudents = newStudentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      addedAt: doc.data().addedAt?.toDate?.()?.toISOString() || null,
    }))

    // Process departing students
    const departingStudents = departingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      markedAt: doc.data().markedAt?.toDate?.()?.toISOString() || null,
    }))

    const currentWorkflow = {
      ...workflowData,
      id: workflowDoc.id,
      startedAt: workflowData.startedAt?.toDate?.()?.toISOString() || null,
      updatedAt: workflowData.updatedAt?.toDate?.()?.toISOString() || null,
      completedAt: workflowData.completedAt?.toDate?.()?.toISOString() || null,
      changes,
      assignments,
      newStudents,
      departingStudents,
    }

    // Get workflow history (school progression workflows only)
    const historySnapshot = await db.collection('workflows')
      .where('type', '==', 'school_progression')
      .orderBy('startedAt', 'desc')
      .limit(10)
      .get()

    const history = historySnapshot.docs
      .filter(doc => doc.id !== workflowId) // Exclude current workflow
      .map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          startedAt: data.startedAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
          completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
        }
      })

    res.status(200).json({
      current: currentWorkflow,
      history,
    })
  } catch (error) {
    console.error('Failed to get progression status:', error)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
})

/**
 * Apply all staged progression changes to the live database
 */
exports.applyProgressionChangesV2 = onRequest({
  region: FUNCTIONS_REGION,
  cors: {
    origin: [
      'https://bottin-etoile-filante.org',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    // Verify user is authenticated and is admin
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' })
    }

    const idToken = authHeader.split('Bearer ')[1]
    let decodedToken

    try {
      decodedToken = await admin.auth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { workflowId } = req.body

    if (!workflowId) {
      return res.status(400).json({
        error: 'Workflow ID is required',
      })
    }

    const workflowRef = db.collection('workflows').doc(workflowId)
    const workflowDoc = await workflowRef.get()

    if (!workflowDoc.exists) {
      return res.status(404).json({
        error: 'Workflow not found',
      })
    }

    // Get all subcollections
    const [changesSnapshot, newStudentsSnapshot, departingSnapshot] = await Promise.all([
      workflowRef.collection('changes').get(),
      workflowRef.collection('new_students').get(),
      workflowRef.collection('departing_students').get(),
    ])

    const batch = db.batch()
    const auditEntries = []

    const stats = {
      studentsProgressed: 0,
      studentsGraduated: 0,
      studentsDeparted: 0,
      newStudentsAdded: 0,
      parentsAdded: 0,
      parentsRemoved: 0,
    }

    // Process existing student changes
    for (const changeDoc of changesSnapshot.docs) {
      const change = changeDoc.data()

      if (change.changeType === 'graduating') {
        // Remove graduating student
        const studentRef = db.collection('students').doc(change.studentId)
        batch.delete(studentRef)
        stats.studentsGraduated++

        auditEntries.push({
          type: 'student_graduated',
          studentId: change.studentId,
          studentName: change.studentName,
          timestamp: FieldValue.serverTimestamp(),
        })
      } else if (change.changeType === 'departing') {
        // Remove departing student (left before graduation)
        const studentRef = db.collection('students').doc(change.studentId)
        batch.delete(studentRef)
        stats.studentsDeparted++

        // Find the departure reason from departing students collection
        const departingDoc = departingSnapshot.docs.find(doc => doc.id === change.studentId)
        const departureReason = departingDoc?.data()?.departureReason || 'Not specified'

        auditEntries.push({
          type: 'student_departed',
          studentId: change.studentId,
          studentName: change.studentName,
          currentLevel: change.currentLevel,
          currentClass: change.currentClass,
          departureReason,
          timestamp: FieldValue.serverTimestamp(),
        })
      } else if (change.newClass && change.newLevel) {
        // Update student with new level and class
        const studentRef = db.collection('students').doc(change.studentId)
        batch.update(studentRef, {
          level: change.newLevel,
          className: change.newClass,
          updatedAt: FieldValue.serverTimestamp(),
        })
        stats.studentsProgressed++

        auditEntries.push({
          type: 'student_progressed',
          studentId: change.studentId,
          studentName: change.studentName,
          oldLevel: change.currentLevel,
          newLevel: change.newLevel,
          oldClass: change.currentClass,
          newClass: change.newClass,
          timestamp: FieldValue.serverTimestamp(),
        })
      }
    }

    // Process new students
    for (const newStudentDoc of newStudentsSnapshot.docs) {
      const newStudentData = newStudentDoc.data()

      // Add student
      const studentRef = db.collection('students').doc()
      batch.set(studentRef, {
        ...newStudentData.student,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      stats.newStudentsAdded++

      // Handle parent 1 (only add if not existing)
      if (!newStudentData.parent1.isExisting) {
        const parent1Ref = db.collection('parents').doc()
        const parent1Data = { ...newStudentData.parent1 }
        delete parent1Data.isExisting
        batch.set(parent1Ref, {
          ...parent1Data,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
        stats.parentsAdded++
      }

      // Handle parent 2 if exists (only add if not existing)
      if (newStudentData.parent2 && !newStudentData.parent2.isExisting) {
        const parent2Ref = db.collection('parents').doc()
        const parent2Data = { ...newStudentData.parent2 }
        delete parent2Data.isExisting
        batch.set(parent2Ref, {
          ...parent2Data,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
        stats.parentsAdded++
      }

      auditEntries.push({
        type: 'student_added',
        studentName: `${newStudentData.student.first_name} ${newStudentData.student.last_name}`,
        className: newStudentData.student.className,
        parentEmails: [
          newStudentData.parent1.email,
          newStudentData.parent2?.email,
        ].filter(Boolean),
        parent1Type: newStudentData.parent1.isExisting ? 'existing' : 'new',
        parent2Type: newStudentData.parent2 ? (newStudentData.parent2.isExisting ? 'existing' : 'new') : null,
        timestamp: FieldValue.serverTimestamp(),
      })
    }

    // Check for orphaned parents (parents whose all children graduated)
    const graduatingStudents = changesSnapshot.docs
      .filter(doc => doc.data().changeType === 'graduating')
      .map(doc => doc.data().studentId)
      .filter(id => id && typeof id === 'string') // Filter out invalid/undefined IDs

    if (graduatingStudents.length > 0) {
      console.log(`Processing ${graduatingStudents.length} graduating students for orphaned parent check`)

      // Get all students to check for orphaned parents
      const allStudentsSnapshot = await db.collection('students').get()
      const remainingStudents = allStudentsSnapshot.docs
        .filter(doc => !graduatingStudents.includes(doc.id))
        .map(doc => doc.data())

      // Get all parent emails from remaining students
      const remainingParentEmails = new Set()
      for (const student of remainingStudents) {
        if (student.parent1_email) {
          remainingParentEmails.add(student.parent1_email)
        }
        if (student.parent2_email) {
          remainingParentEmails.add(student.parent2_email)
        }
      }

      // Get graduating students' parent emails
      // Handle Firestore 'in' query limitations (max 10 items per query)
      const orphanedParentEmails = new Set()

      if (graduatingStudents.length > 0) {
        // Process in batches of 10 (Firestore 'in' limit)
        for (let i = 0; i < graduatingStudents.length; i += 10) {
          const batch = graduatingStudents.slice(i, i + 10)

          try {
            const graduatingStudentsSnapshot = await db.collection('students')
              .where(admin.firestore.FieldPath.documentId(), 'in', batch)
              .get()

            for (const doc of graduatingStudentsSnapshot.docs) {
              const student = doc.data()
              if (student.parent1_email && !remainingParentEmails.has(student.parent1_email)) {
                orphanedParentEmails.add(student.parent1_email)
              }
              if (student.parent2_email && !remainingParentEmails.has(student.parent2_email)) {
                orphanedParentEmails.add(student.parent2_email)
              }
            }
          } catch (error) {
            console.error(`Error querying graduating students batch ${i / 10 + 1}:`, error)
            console.error('Batch contents:', batch)
            // Continue with next batch rather than failing completely
          }
        }
      }

      // Remove orphaned parents
      if (orphanedParentEmails.size > 0) {
        const parentsSnapshot = await db.collection('parents')
          .where('email', 'in', Array.from(orphanedParentEmails))
          .get()

        for (const doc of parentsSnapshot.docs) {
          batch.delete(doc.ref)
          stats.parentsRemoved++

          const parent = doc.data()
          auditEntries.push({
            type: 'parent_removed',
            parentEmail: parent.email,
            parentName: `${parent.first_name} ${parent.last_name}`,
            reason: 'All children graduated',
            timestamp: FieldValue.serverTimestamp(),
          })
        }
      }
    }

    // Update workflow status
    batch.update(workflowRef, {
      status: 'completed',
      phase: 'changes_applied',
      completedAt: FieldValue.serverTimestamp(),
      stats: {
        ...workflowDoc.data().stats,
        ...stats,
      },
    })

    // Add audit entries
    for (const [index, entry] of auditEntries.entries()) {
      const auditRef = workflowRef.collection('audit').doc(`entry_${Date.now()}_${index}`)
      batch.set(auditRef, entry)
    }

    // Commit all changes
    await batch.commit()

    console.log('School progression changes applied successfully:', stats)

    res.status(200).json({
      message: 'School progression changes applied successfully',
      stats,
    })
  } catch (error) {
    console.error('Failed to apply progression changes:', error)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
})
