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
    this.collectionName = 'staff'
    this.collectionRef = collection(db, this.collectionName)
  }

  /**
   * Get all staff with automatic validation and DTO conversion
   */
  async getAll () {
    try {
      console.log('StaffRepository: Loading all staff...')
      const snapshot = await getDocs(this.collectionRef)

      const staff = StaffDTO.fromFirestoreSnapshot(snapshot)
      console.log(`StaffRepository: Loaded ${staff.length} valid staff members`)

      return staff
    } catch (error) {
      console.error('StaffRepository: Error loading all staff:', error)
      throw new Error(`Failed to load staff: ${error.message}`)
    }
  }

  /**
   * Get single staff member by ID
   * @param {string} id - Staff ID (usually email, but can be generated ID)
   */
  async getById (id) {
    try {
      console.log(`StaffRepository: Loading staff member ${id}...`)
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        console.log(`StaffRepository: Staff member ${id} not found`)
        return null
      }

      const staffMember = StaffDTO.fromFirestore(docSnap)
      console.log(`StaffRepository: Loaded staff member ${staffMember.fullName}`)

      return staffMember
    } catch (error) {
      console.error(`StaffRepository: Error loading staff member ${id}:`, error)
      throw new Error(`Failed to load staff member ${id}: ${error.message}`)
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
      console.log(`StaffRepository: Loading ${ids.length} staff members by IDs...`)

      // Load all staff members in parallel
      const staffPromises = ids.map(id => this.getById(id))
      const staff = await Promise.all(staffPromises)

      // Filter out null results (staff not found)
      const validStaff = staff.filter(s => s !== null)
      console.log(`StaffRepository: Loaded ${validStaff.length}/${ids.length} staff members by IDs`)

      return validStaff
    } catch (error) {
      console.error('StaffRepository: Error loading staff by IDs:', error)
      throw new Error(`Failed to load staff by IDs: ${error.message}`)
    }
  }

  /**
   * Get staff members by title
   */
  async getByTitle (title) {
    try {
      console.log(`StaffRepository: Loading staff with title ${title}...`)
      const q = query(
        this.collectionRef,
        where('title', '==', title),
      )
      const snapshot = await getDocs(q)

      const staff = StaffDTO.fromFirestoreSnapshot(snapshot)
      console.log(`StaffRepository: Loaded ${staff.length} staff members with title ${title}`)

      return staff
    } catch (error) {
      console.error(`StaffRepository: Error loading staff with title ${title}:`, error)
      throw new Error(`Failed to load staff with title ${title}: ${error.message}`)
    }
  }

  /**
   * Get staff members with CE roles
   */
  async getWithCERoles () {
    try {
      console.log('StaffRepository: Loading staff with CE roles...')
      const q = query(
        this.collectionRef,
        where('ce_role', '!=', ''),
      )
      const snapshot = await getDocs(q)

      const staff = StaffDTO.fromFirestoreSnapshot(snapshot)
      console.log(`StaffRepository: Loaded ${staff.length} staff members with CE roles`)

      return staff
    } catch (error) {
      console.error('StaffRepository: Error loading staff with CE roles:', error)
      throw new Error(`Failed to load staff with CE roles: ${error.message}`)
    }
  }

  /**
   * Get staff members in directory
   */
  async getInDirectory () {
    try {
      console.log('StaffRepository: Loading staff in directory...')
      const q = query(
        this.collectionRef,
        where('directory_table', '!=', ''),
      )
      const snapshot = await getDocs(q)

      const staff = StaffDTO.fromFirestoreSnapshot(snapshot)
      console.log(`StaffRepository: Loaded ${staff.length} staff members in directory`)

      return staff
    } catch (error) {
      console.error('StaffRepository: Error loading staff in directory:', error)
      throw new Error(`Failed to load staff in directory: ${error.message}`)
    }
  }

  /**
   * Save staff member (create or update)
   * Note: Uses email as document ID to match sheets-sync.js behavior
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
        console.log(`StaffRepository: Updating staff member ${staffDTO.id} (${staffDTO.fullName})...`)
        const docRef = doc(db, this.collectionName, staffDTO.id)
        await updateDoc(docRef, firestoreData)
        console.log(`StaffRepository: Updated staff member ${staffDTO.fullName}`)
        return staffDTO.id
      } else {
        // Create new staff member - use email as document ID if available, otherwise let Firestore generate ID
        const docId = staffDTO.email || null

        if (docId) {
          console.log(`StaffRepository: Creating new staff member ${staffDTO.fullName} with email ID...`)
          const docRef = doc(db, this.collectionName, docId)
          await setDoc(docRef, firestoreData)
          console.log(`StaffRepository: Created staff member ${staffDTO.fullName}`)
          return docId
        } else {
          console.log(`StaffRepository: Creating new staff member ${staffDTO.fullName} with generated ID...`)
          const docRef = doc(collection(db, this.collectionName))
          await setDoc(docRef, firestoreData)
          console.log(`StaffRepository: Created staff member ${staffDTO.fullName}`)
          return docRef.id
        }
      }
    } catch (error) {
      console.error('StaffRepository: Error saving staff member:', error)
      throw new Error(`Failed to save staff member ${staffDTO.fullName}: ${error.message}`)
    }
  }

  /**
   * Create new staff member
   */
  async create (staffData) {
    const staffDTO = new StaffDTO(staffData)
    const id = await this.save(staffDTO)

    // Return the staff member with the email as ID
    return await this.getById(id)
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
      console.log(`StaffRepository: Deleting staff member ${id}...`)
      const docRef = doc(db, this.collectionName, id)
      await deleteDoc(docRef)
      console.log(`StaffRepository: Deleted staff member ${id}`)
    } catch (error) {
      console.error(`StaffRepository: Error deleting staff member ${id}:`, error)
      throw new Error(`Failed to delete staff member ${id}: ${error.message}`)
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
      console.log(`StaffRepository: Searching staff for "${searchText}"...`)

      // For now, we'll load all staff and filter client-side
      // In production, you might want to use Algolia or similar for better search
      const staff = await this.getAll()

      const searchLower = searchText.toLowerCase().trim()
      const filtered = staff.filter(staffMember =>
        staffMember.getSearchableText().includes(searchLower),
      )

      console.log(`StaffRepository: Found ${filtered.length} staff members matching "${searchText}"`)
      return filtered
    } catch (error) {
      console.error(`StaffRepository: Error searching staff:`, error)
      throw new Error(`Failed to search staff: ${error.message}`)
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
      let inDirectoryCount = 0
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

        // Count directory members
        if (staffMember.inDirectory) {
          inDirectoryCount++
        }
      }

      return {
        total: allStaff.length,
        withContactInfo: allStaff.filter(s => s.hasContactInfo).length,
        withCERole: withCERoleCount,
        inDirectory: inDirectoryCount,
        byTitle: titleStats,
        byCERole: ceRoleStats,
        lastUpdated: new Date(),
      }
    } catch (error) {
      console.error('StaffRepository: Error getting stats:', error)
      throw new Error(`Failed to get staff statistics: ${error.message}`)
    }
  }
}
