import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'

/**
 * Class Repository - Data access layer for class operations
 * Handles fetching class and staff information for dropdowns and displays
 */
export class ClassRepository {
  constructor () {
    this.classesCollectionName = 'classes'
    this.staffCollectionName = 'staff'
    this.classesCollectionRef = collection(db, this.classesCollectionName)
    this.staffCollectionRef = collection(db, this.staffCollectionName)
  }

  /**
   * Get all classes with teacher information
   * @returns {Promise<Array>} Array of class objects with teacher details
   */
  async getAllClassesWithTeachers () {
    try {
      console.log('ClassRepository: Loading all classes with teacher info...')

      // Get all classes
      const classesSnapshot = await getDocs(this.classesCollectionRef)
      const classes = []

      // Get all staff for teacher lookup
      const staffSnapshot = await getDocs(this.staffCollectionRef)
      const staffLookup = new Map()

      for (const doc of staffSnapshot.docs) {
        const data = doc.data()
        staffLookup.set(doc.id, data)
        // Also index by email for email-based teacher references
        if (data.email) {
          staffLookup.set(data.email, data)
        }
      }

      // Process each class
      for (const classDoc of classesSnapshot.docs) {
        const classData = classDoc.data()
        let teacherInfo = null

        // Look up teacher information
        if (classData.teacher) {
          teacherInfo = staffLookup.get(classData.teacher)

          // If not found by ID, try by email (some teachers referenced by email)
          if (!teacherInfo && classData.teacher.includes('@')) {
            teacherInfo = staffLookup.get(classData.teacher)
          }
        }

        const classItem = {
          id: classDoc.id,
          classLetter: classData.classLetter,
          className: classData.className,
          classCode: classData.classCode,
          teacher: classData.teacher,
          teacherName: teacherInfo ? `${teacherInfo.first_name} ${teacherInfo.last_name}` : 'Unknown Teacher',
          teacherFirstName: teacherInfo?.first_name || '',
          teacherLastName: teacherInfo?.last_name || '',
          teacherEmail: teacherInfo?.email || classData.teacher,
          parent_rep: classData.parent_rep,
        }

        classes.push(classItem)
      }

      // Sort by class letter
      classes.sort((a, b) => a.classLetter.localeCompare(b.classLetter))

      console.log(`ClassRepository: Loaded ${classes.length} classes with teacher info`)
      return classes
    } catch (error) {
      console.error('ClassRepository: Error loading classes with teachers:', error)
      throw new Error(`Failed to load classes: ${error.message}`)
    }
  }

  /**
   * Get simplified class options for dropdowns
   * @returns {Promise<Array>} Array of { value: classLetter, text: "A - Teacher Name" }
   */
  async getClassDropdownOptions () {
    try {
      const classes = await this.getAllClassesWithTeachers()

      return classes.map(classItem => ({
        value: classItem.classLetter,
        text: `${classItem.classLetter} - ${classItem.teacherName}`,
        teacher: classItem.teacherName,
        classLetter: classItem.classLetter,
      }))
    } catch (error) {
      console.error('ClassRepository: Error getting class dropdown options:', error)
      throw new Error(`Failed to get class options: ${error.message}`)
    }
  }

  /**
   * Get a single class by letter/ID
   * @param {string} classLetter - The class letter (A, B, C, etc.)
   * @returns {Promise<Object|null>} Class object with teacher info or null if not found
   */
  async getClassByLetter (classLetter) {
    try {
      console.log(`ClassRepository: Loading class ${classLetter}...`)

      const docRef = doc(db, this.classesCollectionName, classLetter)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        console.log(`ClassRepository: Class ${classLetter} not found`)
        return null
      }

      const classData = docSnap.data()
      let teacherInfo = null

      // Look up teacher information
      if (classData.teacher) {
        try {
          const teacherRef = doc(db, this.staffCollectionName, classData.teacher)
          const teacherSnap = await getDoc(teacherRef)

          if (teacherSnap.exists()) {
            teacherInfo = teacherSnap.data()
          }
        } catch (error) {
          console.warn(`Failed to load teacher info for class ${classLetter}:`, error)
        }
      }

      const classItem = {
        id: docSnap.id,
        classLetter: classData.classLetter,
        className: classData.className,
        classCode: classData.classCode,
        teacher: classData.teacher,
        teacherName: teacherInfo ? `${teacherInfo.first_name} ${teacherInfo.last_name}` : 'Unknown Teacher',
        teacherFirstName: teacherInfo?.first_name || '',
        teacherLastName: teacherInfo?.last_name || '',
        teacherEmail: teacherInfo?.email || classData.teacher,
        parent_rep: classData.parent_rep,
      }

      console.log(`ClassRepository: Loaded class ${classItem.classLetter} - ${classItem.teacherName}`)
      return classItem
    } catch (error) {
      console.error(`ClassRepository: Error loading class ${classLetter}:`, error)
      throw new Error(`Failed to load class ${classLetter}: ${error.message}`)
    }
  }

  /**
   * Update a class document
   * @param {string} classLetter - The class letter (document ID)
   * @param {Object} updates - Object containing fields to update
   * @param {string} [updates.className] - Class name (e.g., "1A")
   * @param {string} [updates.parent_rep] - Parent representative document ID
   * @param {string} [updates.student_rep_1] - Student representative 1 document ID
   * @param {string} [updates.student_rep_2] - Student representative 2 document ID
   * @returns {Promise<Object>} Updated class object
   */
  async update (classLetter, updates) {
    try {
      console.log(`ClassRepository: Updating class ${classLetter}...`, updates)

      const docRef = doc(db, this.classesCollectionName, classLetter)

      // First check if document exists
      const docSnap = await getDoc(docRef)
      if (!docSnap.exists()) {
        throw new Error(`Class ${classLetter} not found`)
      }

      // Prepare update data - only include provided fields
      const updateData = {}
      if (updates.className !== undefined) {
        updateData.className = updates.className
      }
      if (updates.parent_rep !== undefined) {
        updateData.parent_rep = updates.parent_rep
      }
      if (updates.student_rep_1 !== undefined) {
        updateData.student_rep_1 = updates.student_rep_1
      }
      if (updates.student_rep_2 !== undefined) {
        updateData.student_rep_2 = updates.student_rep_2
      }

      // Import updateDoc here
      const { updateDoc } = await import('firebase/firestore')

      // Update the document
      await updateDoc(docRef, updateData)

      console.log(`ClassRepository: Successfully updated class ${classLetter}`)

      // Return the updated class
      return await this.getClassByLetter(classLetter)
    } catch (error) {
      console.error(`ClassRepository: Error updating class ${classLetter}:`, error)
      throw new Error(`Failed to update class ${classLetter}: ${error.message}`)
    }
  }
}
