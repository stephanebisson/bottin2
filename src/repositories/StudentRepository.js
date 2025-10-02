import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { StudentDTO } from '@/dto/StudentDTO.js'
import { db } from '@/firebase'

/**
 * Student Repository - Clean data access layer for student operations
 * Handles all Firestore interactions and returns StudentDTO objects
 */
export class StudentRepository {
  constructor () {
    this.collectionName = 'students'
    this.collectionRef = collection(db, this.collectionName)
  }

  /**
   * Get all students with automatic validation and DTO conversion
   */
  async getAll () {
    try {
      console.log('StudentRepository: Loading all students...')
      const snapshot = await getDocs(this.collectionRef)

      const students = StudentDTO.fromFirestoreSnapshot(snapshot)
      console.log(`StudentRepository: Loaded ${students.length} valid students`)

      return students
    } catch (error) {
      console.error('StudentRepository: Error loading all students:', error)
      throw new Error(`Failed to load students: ${error.message}`)
    }
  }

  /**
   * Get all students (alias for getAll for consistency with legacy code)
   */
  async getActive () {
    // Since imported students don't have isActive field, return all students
    return await this.getAll()
  }

  /**
   * Get students by class name
   */
  async getByClassName (className) {
    try {
      console.log(`StudentRepository: Loading students for class ${className}...`)
      const q = query(
        this.collectionRef,
        where('className', '==', className),
      )
      const snapshot = await getDocs(q)

      const students = StudentDTO.fromFirestoreSnapshot(snapshot)
      console.log(`StudentRepository: Loaded ${students.length} students for class ${className}`)

      return students
    } catch (error) {
      console.error(`StudentRepository: Error loading students for class ${className}:`, error)
      throw new Error(`Failed to load students for class ${className}: ${error.message}`)
    }
  }

  /**
   * Get students by level
   */
  async getByLevel (level) {
    try {
      console.log(`StudentRepository: Loading students for level ${level}...`)
      const q = query(
        this.collectionRef,
        where('level', '==', level),
      )
      const snapshot = await getDocs(q)

      const students = StudentDTO.fromFirestoreSnapshot(snapshot)
      console.log(`StudentRepository: Loaded ${students.length} students for level ${level}`)

      return students
    } catch (error) {
      console.error(`StudentRepository: Error loading students for level ${level}:`, error)
      throw new Error(`Failed to load students for level ${level}: ${error.message}`)
    }
  }

  /**
   * Get single student by ID
   */
  async getById (id) {
    try {
      console.log(`StudentRepository: Loading student ${id}...`)
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        console.log(`StudentRepository: Student ${id} not found`)
        return null
      }

      const student = StudentDTO.fromFirestore(docSnap)
      console.log(`StudentRepository: Loaded student ${student.fullName}`)

      return student
    } catch (error) {
      console.error(`StudentRepository: Error loading student ${id}:`, error)
      throw new Error(`Failed to load student ${id}: ${error.message}`)
    }
  }

  /**
   * Save student (create or update)
   */
  async save (studentDTO) {
    if (!(studentDTO instanceof StudentDTO)) {
      throw new TypeError('StudentRepository: Expected StudentDTO instance')
    }

    if (!studentDTO.isValid()) {
      const errors = studentDTO.getValidationErrors()
      throw new Error(`StudentRepository: Invalid student data: ${errors.join(', ')}`)
    }

    try {
      const firestoreData = studentDTO.toFirestore()

      if (studentDTO.id) {
        // Update existing student
        console.log(`StudentRepository: Updating student ${studentDTO.id} (${studentDTO.fullName})...`)
        const docRef = doc(db, this.collectionName, studentDTO.id)
        await updateDoc(docRef, firestoreData)
        console.log(`StudentRepository: Updated student ${studentDTO.fullName}`)
        return studentDTO.id
      } else {
        // Create new student
        console.log(`StudentRepository: Creating new student ${studentDTO.fullName}...`)
        const docRef = await addDoc(this.collectionRef, firestoreData)
        console.log(`StudentRepository: Created student ${studentDTO.fullName} with ID ${docRef.id}`)
        return docRef.id
      }
    } catch (error) {
      console.error('StudentRepository: Error saving student:', error)
      throw new Error(`Failed to save student ${studentDTO.fullName}: ${error.message}`)
    }
  }

  /**
   * Create new student
   */
  async create (studentData) {
    const studentDTO = new StudentDTO(studentData)
    const id = await this.save(studentDTO)

    // Return the student with the new ID
    return await this.getById(id)
  }

  /**
   * Update existing student
   */
  async update (id, updates) {
    const existingStudent = await this.getById(id)
    if (!existingStudent) {
      throw new Error(`Student with ID ${id} not found`)
    }

    const updatedStudent = existingStudent.withUpdates(updates)
    await this.save(updatedStudent)

    return await this.getById(id)
  }

  /**
   * Delete student - permanently remove from database
   * Use with caution!
   */
  async delete (id) {
    try {
      console.log(`StudentRepository: Deleting student ${id}...`)
      const docRef = doc(db, this.collectionName, id)
      await deleteDoc(docRef)
      console.log(`StudentRepository: Deleted student ${id}`)
    } catch (error) {
      console.error(`StudentRepository: Error deleting student ${id}:`, error)
      throw new Error(`Failed to delete student ${id}: ${error.message}`)
    }
  }

  /**
   * Search students by text (searches name, grade, emails)
   */
  async search (searchText) {
    if (!searchText || searchText.trim().length === 0) {
      return []
    }

    try {
      console.log(`StudentRepository: Searching students for "${searchText}"...`)

      // For now, we'll load all students and filter client-side
      // In production, you might want to use Algolia or similar for better search
      const students = await this.getAll()

      const searchLower = searchText.toLowerCase().trim()
      const filtered = students.filter(student =>
        student.getSearchableText().includes(searchLower),
      )

      console.log(`StudentRepository: Found ${filtered.length} students matching "${searchText}"`)
      return filtered
    } catch (error) {
      console.error(`StudentRepository: Error searching students:`, error)
      throw new Error(`Failed to search students: ${error.message}`)
    }
  }

  /**
   * Get all students and populate parent data for each
   * @param {ParentRepository} parentRepository - Repository to fetch parent data
   * @returns {Promise<Array<{student: StudentDTO, parents: ParentDTO[]}>>} Students with populated parent data
   */
  async getAllWithParents (parentRepository) {
    try {
      console.log('StudentRepository: Loading all students with parent data...')
      const students = await this.getAll()

      // Get all unique parent emails
      const parentEmails = new Set()
      for (const student of students) {
        for (const email of student.parentForeignKeys) {
          parentEmails.add(email)
        }
      }

      console.log(`StudentRepository: Found ${parentEmails.size} unique parent emails to lookup`)

      // Bulk load all parents
      const parentLookup = new Map()
      const parentLoadPromises = Array.from(parentEmails).map(async email => {
        try {
          const parent = await parentRepository.getById(email)
          if (parent) {
            parentLookup.set(email, parent)
          }
        } catch (error) {
          console.warn(`Failed to load parent ${email}:`, error.message)
        }
      })

      await Promise.all(parentLoadPromises)
      console.log(`StudentRepository: Loaded ${parentLookup.size} parent records`)

      // Create result with populated parent data
      const results = students.map(student => {
        const parents = []
        if (student.parent1_email && parentLookup.has(student.parent1_email)) {
          parents.push(parentLookup.get(student.parent1_email))
        }
        if (student.parent2_email && parentLookup.has(student.parent2_email)) {
          parents.push(parentLookup.get(student.parent2_email))
        }

        return {
          student,
          parents,
        }
      })

      console.log(`StudentRepository: Created ${results.length} student-parent records`)
      return results
    } catch (error) {
      console.error('StudentRepository: Error loading students with parents:', error)
      throw new Error(`Failed to load students with parents: ${error.message}`)
    }
  }

  /**
   * Get repository statistics
   */
  async getStats () {
    try {
      const allStudents = await this.getAll()

      const classStats = {}
      const levelStats = {}

      for (const student of allStudents) {
        // Count by class
        classStats[student.className] = (classStats[student.className] || 0) + 1

        // Count by level
        if (student.level !== null) {
          levelStats[student.level] = (levelStats[student.level] || 0) + 1
        }
      }

      return {
        total: allStudents.length,
        byClass: classStats,
        byLevel: levelStats,
        lastUpdated: new Date(),
      }
    } catch (error) {
      console.error('StudentRepository: Error getting stats:', error)
      throw new Error(`Failed to get student statistics: ${error.message}`)
    }
  }
}
