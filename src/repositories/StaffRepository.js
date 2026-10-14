import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { StaffDTO } from '@/dto/StaffDTO.js'
import { db } from '@/firebase'

/**
 * Staff Repository - Clean data access layer for staff operations
 * Handles all Firestore interactions and returns StaffDTO objects
 * Note: Staff collection uses email as document ID in most cases, but some staff may have generated IDs
 */
export class StaffRepository {
  constructor () {
    this.collectionRef = collection(db, this.collectionName)
  }

  /**
   * Get all staff with automatic validation and DTO conversion
   */
  async getAll () {
    try {
      const snapshot = await getDocs(this.collectionRef)

      const staff = StaffDTO.fromFirestoreSnapshot(snapshot)

      return staff
    } catch (error) {
      console.error('StaffRepository: Error loading all staff:', error)
      throw new Error(`Failed to load staff: ${error.message}`, { cause: error })
    }
  }

  /**
   * Get single staff member by ID
   * @param {string} id - Staff ID (usually email, but can be generated ID)
   */
  async getById (id) {
    try {
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      const staffMember = StaffDTO.fromFirestore(docSnap)

      return staffMember
    } catch (error) {
      console.error(`StaffRepository: Error loading staff member ${id}:`, error)
      throw new Error(`Failed to load staff member ${id}: ${error.message}`, { cause: error })
    }
  }

  /**
   * Get multiple staff members by their IDs efficiently
   * @param {string[]} ids - Array of staff IDs (emails or generated IDs)
   */
  async getByIds (ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return []
    }

    try {
      // Load all staff members in parallel
      const staffPromises = ids.map(id => this.getById(id))
      const staff = await Promise.all(staffPromises)

      // Filter out null results (staff not found)
      const validStaff = staff.filter(s => s !== null)

      return validStaff
    } catch (error) {
      console.error('StaffRepository: Error loading staff by IDs:', error)
      throw new Error(`Failed to load staff by IDs: ${error.message}`, { cause: error })
    }
  }

  /**
   * Get staff members by title
   */
  async getByTitle (title) {
    try {
      const q = query(
        this.collectionRef,
        where('title', '==', title),
      )
      const snapshot = await getDocs(q)

      const staff = StaffDTO.fromFirestoreSnapshot(snapshot)

      return staff
    } catch (error) {
      console.error(`StaffRepository: Error loading staff with title ${title}:`, error)
      throw new Error(`Failed to load staff with title ${title}: ${error.message}`, { cause: error })
    }
  }

  /**
   * Get staff members with CE roles
   */
  async getWithCERoles () {
    try {
      const q = query(
        this.collectionRef,
        where('ce_role', '!=', ''),
      )
      const snapshot = await getDocs(q)

      const staff = StaffDTO.fromFirestoreSnapshot(snapshot)

      return staff
    } catch (error) {
      console.error('StaffRepository: Error loading staff with CE roles:', error)
      throw new Error(`Failed to load staff with CE roles: ${error.message}`, { cause: error })
    }
  }

  /**
   * Get staff members in directory (returns all staff since directory_table field was removed)
   */
  async getInDirectory () {
    try {
      return await this.getAll()
    } catch (error) {
      console.error('StaffRepository: Error loading staff in directory:', error)
      throw new Error(`Failed to load staff in directory: ${error.message}`, { cause: error })
    }
  }

  /**
   * Save staff member (create or update)
   * Note: Uses email as document ID
   */
  async save (staffDTO) {
    if (!(staffDTO instanceof StaffDTO)) {
      throw new TypeError('StaffRepository: Expected StaffDTO instance')
    }

    if (!staffDTO.isValid()) {
      const errors = staffDTO.getValidationErrors()
      throw new Error(`StaffRepository: Invalid staff data: ${errors.join(', ')}`)
    }

    try {
      const firestoreData = staffDTO.toFirestore()

      if (staffDTO.id) {
        // Update existing staff member
        const docRef = doc(db, this.collectionName, staffDTO.id)
        await updateDoc(docRef, firestoreData)
        return staffDTO.id
      } else {
        // Create new staff member - use email as document ID if available, otherwise let Firestore generate ID
        const docId = staffDTO.email || null

        if (docId) {
          const docRef = doc(db, this.collectionName, docId)
          await setDoc(docRef, firestoreData)
          return docId
        } else {
          const docRef = doc(collection(db, this.collectionName))
          await setDoc(docRef, firestoreData)
          return docRef.id
        }
      }
    } catch (error) {
      console.error('StaffRepository: Error saving staff member:', error)
      throw new Error(`Failed to save staff member ${staffDTO.fullName}: ${error.message}`, { cause: error })
    }
  }

  /**
   * Create new staff member
   */
  async create (staffData) {
    const staffDTO = new StaffDTO(staffData)
    const id = await this.save(staffDTO)

    // Return the staff DTO with the generated ID (no need to re-fetch)
    return new StaffDTO({
      ...staffData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /**
   * Update existing staff member
   */
  async update (id, updates) {
    const existingStaff = await this.getById(id)
    if (!existingStaff) {
      throw new Error(`Staff member with ID ${id} not found`)
    }

    const updatedStaff = existingStaff.withUpdates(updates)
    await this.save(updatedStaff)

    return await this.getById(id)
  }

  /**
   * Delete staff member - permanently remove from database
   * Use with caution!
   */
  async delete (id) {
    try {
      const docRef = doc(db, this.collectionName, id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error(`StaffRepository: Error deleting staff member ${id}:`, error)
      throw new Error(`Failed to delete staff member ${id}: ${error.message}`, { cause: error })
    }
  }

  /**
   * Search staff by text (searches name, title, email, CE role)
   */
  async search (searchText) {
    if (!searchText || searchText.trim().length === 0) {
      return []
    }

    try {
      // For now, we'll load all staff and filter client-side
      // In production, you might want to use Algolia or similar for better search
      const staff = await this.getAll()

      const searchLower = searchText.toLowerCase().trim()
      const filtered = staff.filter(staffMember =>
        staffMember.getSearchableText().includes(searchLower),
      )

      return filtered
    } catch (error) {
      console.error(`StaffRepository: Error searching staff:`, error)
      throw new Error(`Failed to search staff: ${error.message}`, { cause: error })
    }
  }

  /**
   * Get repository statistics
   */
  async getStats () {
    try {
      const allStaff = await this.getAll()

      const titleStats = {}
      const ceRoleStats = {}
      let withCERoleCount = 0

      for (const staffMember of allStaff) {
        // Count by title
        if (staffMember.title) {
          titleStats[staffMember.title] = (titleStats[staffMember.title] || 0) + 1
        }

        // Count by CE role
        if (staffMember.ce_role) {
          ceRoleStats[staffMember.ce_role] = (ceRoleStats[staffMember.ce_role] || 0) + 1
          withCERoleCount++
        }
      }

      return {
        total: allStaff.length,
        withContactInfo: allStaff.filter(s => s.hasContactInfo).length,
        withCERole: withCERoleCount,
        byTitle: titleStats,
        byCERole: ceRoleStats,
        lastUpdated: new Date(),
      }
    } catch (error) {
      console.error('StaffRepository: Error getting stats:', error)
      throw new Error(`Failed to get staff statistics: ${error.message}`, { cause: error })
    }
  }

  collectionName = 'staff'
}
