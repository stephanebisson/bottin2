import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { ParentDTO } from '@/dto/ParentDTO.js'
import { db } from '@/firebase'

/**
 * Parent Repository - Clean data access layer for parent operations
 * Handles all Firestore interactions and returns ParentDTO objects
 * Note: Parents use structured IDs: FirstName_LastName_ABC123 (see sheets-sync.js and migrate-parents-to-structured-id.js)
 */
export class ParentRepository {
  constructor () {
    this.collectionName = 'parents'
    this.collectionRef = collection(db, this.collectionName)
  }

  /**
   * Get all parents with automatic validation and DTO conversion
   */
  async getAll () {
    try {
      console.log('ParentRepository: Loading all parents...')
      const snapshot = await getDocs(this.collectionRef)

      const parents = ParentDTO.fromFirestoreSnapshot(snapshot)
      console.log(`ParentRepository: Loaded ${parents.length} valid parents`)

      return parents
    } catch (error) {
      console.error('ParentRepository: Error loading all parents:', error)
      throw new Error(`Failed to load parents: ${error.message}`)
    }
  }

  /**
   * Get single parent by ID
   * @param {string} id - Parent document ID (structured format: FirstName_LastName_ABC123)
   */
  async getById (id) {
    try {
      console.log(`ParentRepository: Loading parent ${id}...`)
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        console.log(`ParentRepository: Parent ${id} not found`)
        return null
      }

      const parent = ParentDTO.fromFirestore(docSnap)
      console.log(`ParentRepository: Loaded parent ${parent.fullName}`)

      return parent
    } catch (error) {
      console.error(`ParentRepository: Error loading parent ${id}:`, error)
      throw new Error(`Failed to load parent ${id}: ${error.message}`)
    }
  }

  /**
   * Get multiple parents by their IDs efficiently
   * @param {string[]} ids - Array of parent document IDs
   */
  async getByIds (ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return []
    }

    try {
      console.log(`ParentRepository: Loading ${ids.length} parents by IDs...`)

      // Load all parents in parallel
      const parentPromises = ids.map(id => this.getById(id))
      const parents = await Promise.all(parentPromises)

      // Filter out null results (parents not found)
      const validParents = parents.filter(p => p !== null)
      console.log(`ParentRepository: Loaded ${validParents.length}/${ids.length} parents by IDs`)

      return validParents
    } catch (error) {
      console.error('ParentRepository: Error loading parents by IDs:', error)
      throw new Error(`Failed to load parents by IDs: ${error.message}`)
    }
  }

  /**
   * Get parents by city
   */
  async getByCity (city) {
    try {
      console.log(`ParentRepository: Loading parents for city ${city}...`)
      const q = query(
        this.collectionRef,
        where('city', '==', city),
      )
      const snapshot = await getDocs(q)

      const parents = ParentDTO.fromFirestoreSnapshot(snapshot)
      console.log(`ParentRepository: Loaded ${parents.length} parents for city ${city}`)

      return parents
    } catch (error) {
      console.error(`ParentRepository: Error loading parents for city ${city}:`, error)
      throw new Error(`Failed to load parents for city ${city}: ${error.message}`)
    }
  }

  /**
   * Get parents by interest
   */
  async getByInterest (interest) {
    try {
      console.log(`ParentRepository: Loading parents with interest ${interest}...`)
      const q = query(
        this.collectionRef,
        where('interests', 'array-contains', interest.toLowerCase()),
      )
      const snapshot = await getDocs(q)

      const parents = ParentDTO.fromFirestoreSnapshot(snapshot)
      console.log(`ParentRepository: Loaded ${parents.length} parents with interest ${interest}`)

      return parents
    } catch (error) {
      console.error(`ParentRepository: Error loading parents with interest ${interest}:`, error)
      throw new Error(`Failed to load parents with interest ${interest}: ${error.message}`)
    }
  }

  /**
   * Save parent (create or update)
   * Note: If no ID is provided, auto-generates a Firestore ID
   * For structured IDs (FirstName_LastName_ABC123), use setDoc with explicit ID
   */
  async save (parentDTO) {
    if (!(parentDTO instanceof ParentDTO)) {
      throw new TypeError('ParentRepository: Expected ParentDTO instance')
    }

    if (!parentDTO.isValid()) {
      const errors = parentDTO.getValidationErrors()
      throw new Error(`ParentRepository: Invalid parent data: ${errors.join(', ')}`)
    }

    try {
      const firestoreData = parentDTO.toFirestore()

      if (parentDTO.id) {
        // Update existing parent
        console.log(`ParentRepository: Updating parent ${parentDTO.id} (${parentDTO.fullName})...`)
        const docRef = doc(db, this.collectionName, parentDTO.id)
        await updateDoc(docRef, firestoreData)
        console.log(`ParentRepository: Updated parent ${parentDTO.fullName}`)
        return parentDTO.id
      } else {
        // Create new parent with auto-generated ID
        console.log(`ParentRepository: Creating new parent ${parentDTO.fullName} with auto-generated ID...`)
        const docRef = await addDoc(this.collectionRef, firestoreData)
        console.log(`ParentRepository: Created parent ${parentDTO.fullName} with ID ${docRef.id}`)
        return docRef.id
      }
    } catch (error) {
      console.error('ParentRepository: Error saving parent:', error)
      throw new Error(`Failed to save parent ${parentDTO.fullName}: ${error.message}`)
    }
  }

  /**
   * Create new parent
   */
  async create (parentData) {
    const parentDTO = new ParentDTO(parentData)
    const id = await this.save(parentDTO)

    // Return the parent with the generated ID
    return await this.getById(id)
  }

  /**
   * Update existing parent
   */
  async update (id, updates) {
    const existingParent = await this.getById(id)
    if (!existingParent) {
      throw new Error(`Parent with ID ${id} not found`)
    }

    const updatedParent = existingParent.withUpdates(updates)
    await this.save(updatedParent)

    return await this.getById(id)
  }

  /**
   * Delete parent - permanently remove from database
   * Use with caution!
   */
  async delete (id) {
    try {
      console.log(`ParentRepository: Deleting parent ${id}...`)
      const docRef = doc(db, this.collectionName, id)
      await deleteDoc(docRef)
      console.log(`ParentRepository: Deleted parent ${id}`)
    } catch (error) {
      console.error(`ParentRepository: Error deleting parent ${id}:`, error)
      throw new Error(`Failed to delete parent ${id}: ${error.message}`)
    }
  }

  /**
   * Search parents by text (searches name, email, interests)
   */
  async search (searchText) {
    if (!searchText || searchText.trim().length === 0) {
      return []
    }

    try {
      console.log(`ParentRepository: Searching parents for "${searchText}"...`)

      // For now, we'll load all parents and filter client-side
      // In production, you might want to use Algolia or similar for better search
      const parents = await this.getAll()

      const searchLower = searchText.toLowerCase().trim()
      const filtered = parents.filter(parent =>
        parent.getSearchableText().includes(searchLower),
      )

      console.log(`ParentRepository: Found ${filtered.length} parents matching "${searchText}"`)
      return filtered
    } catch (error) {
      console.error(`ParentRepository: Error searching parents:`, error)
      throw new Error(`Failed to search parents: ${error.message}`)
    }
  }

  /**
   * Get repository statistics
   */
  async getStats () {
    try {
      const allParents = await this.getAll()

      const cityStats = {}
      const interestStats = {}

      for (const parent of allParents) {
        // Count by city
        if (parent.city) {
          cityStats[parent.city] = (cityStats[parent.city] || 0) + 1
        }

        // Count by interests
        for (const interest of parent.interests) {
          interestStats[interest] = (interestStats[interest] || 0) + 1
        }
      }

      return {
        total: allParents.length,
        withContactInfo: allParents.filter(p => p.hasContactInfo).length,
        withInterests: allParents.filter(p => p.hasInterests).length,
        byCity: cityStats,
        byInterest: interestStats,
        lastUpdated: new Date(),
      }
    } catch (error) {
      console.error('ParentRepository: Error getting stats:', error)
      throw new Error(`Failed to get parent statistics: ${error.message}`)
    }
  }
}
