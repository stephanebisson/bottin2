import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { FEVES_COMMITTEE_ID } from '@/config/committees'
import { StudentDTO } from '@/dto/StudentDTO.js'
import { db } from '@/firebase'
import { generateStudentId } from '@/utils/parentIdGenerator.js'

/**
 * Student Repository - Clean data access layer for student operations
 * Handles all Firestore interactions and returns StudentDTO objects
 * Note: Students use structured IDs: firstname_lastname_ABC123 (see parentIdGenerator.js)
 */
export class StudentRepository {
  constructor () {
    this.collectionRef = collection(db, this.collectionName)
  }

  /**
   * Get all students with automatic validation and DTO conversion
   */
  async getAll () {
    try {
      const snapshot = await getDocs(this.collectionRef)

      const students = StudentDTO.fromFirestoreSnapshot(snapshot)

      return students
    } catch (error) {
      console.error('StudentRepository: Error loading all students:', error)
      throw new Error(`Failed to load students: ${error.message}`, { cause: error })
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
      const q = query(
        this.collectionRef,
        where('className', '==', className),
      )
      const snapshot = await getDocs(q)

      const students = StudentDTO.fromFirestoreSnapshot(snapshot)

      return students
    } catch (error) {
      console.error(`StudentRepository: Error loading students for class ${className}:`, error)
      throw new Error(`Failed to load students for class ${className}: ${error.message}`, { cause: error })
    }
  }

  /**
   * Get students by level
   */
  async getByLevel (level) {
    try {
      const q = query(
        this.collectionRef,
        where('level', '==', level),
      )
      const snapshot = await getDocs(q)

      const students = StudentDTO.fromFirestoreSnapshot(snapshot)

      return students
    } catch (error) {
      console.error(`StudentRepository: Error loading students for level ${level}:`, error)
      throw new Error(`Failed to load students for level ${level}: ${error.message}`, { cause: error })
    }
  }

  /**
   * Get single student by ID
   */
  async getById (id) {
    try {
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      const student = StudentDTO.fromFirestore(docSnap)

      return student
    } catch (error) {
      console.error(`StudentRepository: Error loading student ${id}:`, error)
      throw new Error(`Failed to load student ${id}: ${error.message}`, { cause: error })
    }
  }

  /**
   * Save student (create or update)
   * Uses structured IDs (firstname_lastname_ABC123) via setDoc for new students
   * Uses updateDoc for existing students
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
        const docRef = doc(db, this.collectionName, studentDTO.id)
        await updateDoc(docRef, firestoreData)
        return studentDTO.id
      } else {
        // Create new student with structured ID, fallback to auto-generated ID on error
        try {
          const structuredId = generateStudentId({
            first_name: studentDTO.first_name,
            last_name: studentDTO.last_name,
          })
          const docRef = doc(db, this.collectionName, structuredId)
          await setDoc(docRef, firestoreData)
          return structuredId
        } catch (idError) {
          console.warn(`StudentRepository: Failed to generate structured ID for ${studentDTO.fullName}, falling back to auto-generated ID:`, idError.message)
          // Fall through to auto-generated ID
        }

        // Fallback: Create new student with auto-generated ID
        const docRef = await addDoc(this.collectionRef, firestoreData)
        return docRef.id
      }
    } catch (error) {
      console.error('StudentRepository: Error saving student:', error)
      throw new Error(`Failed to save student ${studentDTO.fullName}: ${error.message}`, { cause: error })
    }
  }

  /**
   * Create new student with structured ID (firstname_lastname_ABC123)
   */
  async create (studentData) {
    const studentDTO = new StudentDTO(studentData)
    const id = await this.save(studentDTO)

    // Return the student DTO with the generated ID (no need to re-fetch)
    return new StudentDTO({
      ...studentData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
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
   * Delete student - permanently remove from database, along with their fèves committee membership
   * Use with caution!
   */
  async delete (id) {
    try {
      const batch = writeBatch(db)
      batch.delete(doc(db, this.collectionName, id))
      batch.delete(doc(db, 'committees', FEVES_COMMITTEE_ID, 'members', id))
      await batch.commit()
    } catch (error) {
      console.error(`StudentRepository: Error deleting student ${id}:`, error)
      throw new Error(`Failed to delete student ${id}: ${error.message}`, { cause: error })
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
      // For now, we'll load all students and filter client-side
      // In production, you might want to use Algolia or similar for better search
      const students = await this.getAll()

      const searchLower = searchText.toLowerCase().trim()
      const filtered = students.filter(student =>
        student.getSearchableText().includes(searchLower),
      )

      return filtered
    } catch (error) {
      console.error(`StudentRepository: Error searching students:`, error)
      throw new Error(`Failed to search students: ${error.message}`, { cause: error })
    }
  }

  /**
   * Get all students and populate parent data for each
   * @param {ParentRepository} parentRepository - Repository to fetch parent data
   * @returns {Promise<Array<{student: StudentDTO, parents: ParentDTO[]}>>} Students with populated parent data
   */
  async getAllWithParents (parentRepository) {
    try {
      const students = await this.getAll()

      // Get all unique parent IDs
      const parentIds = new Set()
      for (const student of students) {
        for (const id of student.parentForeignKeys) {
          parentIds.add(id)
        }
      }

      // Bulk load all parents
      const parentLookup = new Map()
      const parentLoadPromises = Array.from(parentIds).map(async id => {
        try {
          const parent = await parentRepository.getById(id)
          if (parent) {
            parentLookup.set(id, parent)
          }
        } catch (error) {
          console.warn(`Failed to load parent ${id}:`, error.message)
        }
      })

      await Promise.all(parentLoadPromises)

      // Create result with populated parent data
      const results = students.map(student => {
        const parents = []
        if (student.parent1_id && parentLookup.has(student.parent1_id)) {
          parents.push(parentLookup.get(student.parent1_id))
        }
        if (student.parent2_id && parentLookup.has(student.parent2_id)) {
          parents.push(parentLookup.get(student.parent2_id))
        }

        return {
          student,
          parents,
        }
      })

      return results
    } catch (error) {
      console.error('StudentRepository: Error loading students with parents:', error)
      throw new Error(`Failed to load students with parents: ${error.message}`, { cause: error })
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
      throw new Error(`Failed to get student statistics: ${error.message}`, { cause: error })
    }
  }

  collectionName = 'students'
}
