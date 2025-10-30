import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore'
import { FeedbackDTO } from '@/dto/FeedbackDTO.js'
import { db } from '@/firebase'

/**
 * Feedback Repository - Clean data access layer for feedback operations
 * Handles all Firestore interactions and returns FeedbackDTO objects
 */
export class FeedbackRepository {
  constructor () {
    this.collectionRef = collection(db, this.collectionName)
  }

  /**
   * Get all feedback with automatic validation and DTO conversion
   * Orders by creation date (newest first)
   */
  async getAll () {
    try {
      console.log('FeedbackRepository: Loading all feedback...')
      const q = query(this.collectionRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)

      const feedback = FeedbackDTO.fromFirestoreSnapshot(snapshot)
      console.log(`FeedbackRepository: Loaded ${feedback.length} valid feedback items`)

      return feedback
    } catch (error) {
      console.error('FeedbackRepository: Error loading all feedback:', error)
      throw new Error(`Failed to load feedback: ${error.message}`)
    }
  }

  /**
   * Get single feedback by ID
   * @param {string} id - Feedback document ID
   */
  async getById (id) {
    try {
      console.log(`FeedbackRepository: Loading feedback ${id}...`)
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        console.log(`FeedbackRepository: Feedback ${id} not found`)
        return null
      }

      const feedback = FeedbackDTO.fromFirestore(docSnap)
      console.log(`FeedbackRepository: Loaded feedback ${id}`)

      return feedback
    } catch (error) {
      console.error(`FeedbackRepository: Error loading feedback ${id}:`, error)
      throw new Error(`Failed to load feedback ${id}: ${error.message}`)
    }
  }

  /**
   * Get feedback by parent ID
   * @param {string} parentId - Parent document ID
   */
  async getByParentId (parentId) {
    try {
      console.log(`FeedbackRepository: Loading feedback for parent ${parentId}...`)
      const q = query(
        this.collectionRef,
        where('parent_id', '==', parentId),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(q)

      const feedback = FeedbackDTO.fromFirestoreSnapshot(snapshot)
      console.log(`FeedbackRepository: Loaded ${feedback.length} feedback items for parent ${parentId}`)

      return feedback
    } catch (error) {
      console.error(`FeedbackRepository: Error loading feedback for parent ${parentId}:`, error)
      throw new Error(`Failed to load feedback for parent ${parentId}: ${error.message}`)
    }
  }

  /**
   * Get feedback by status
   * @param {string} status - 'pending' or 'resolved'
   */
  async getByStatus (status) {
    try {
      console.log(`FeedbackRepository: Loading ${status} feedback...`)
      const q = query(
        this.collectionRef,
        where('status', '==', status),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(q)

      const feedback = FeedbackDTO.fromFirestoreSnapshot(snapshot)
      console.log(`FeedbackRepository: Loaded ${feedback.length} ${status} feedback items`)

      return feedback
    } catch (error) {
      console.error(`FeedbackRepository: Error loading ${status} feedback:`, error)
      throw new Error(`Failed to load ${status} feedback: ${error.message}`)
    }
  }

  /**
   * Save feedback (create or update)
   */
  async save (feedbackDTO) {
    if (!(feedbackDTO instanceof FeedbackDTO)) {
      throw new TypeError('FeedbackRepository: Expected FeedbackDTO instance')
    }

    if (!feedbackDTO.isValid()) {
      const errors = feedbackDTO.getValidationErrors()
      throw new Error(`FeedbackRepository: Invalid feedback data: ${errors.join(', ')}`)
    }

    try {
      const firestoreData = feedbackDTO.toFirestore()

      if (feedbackDTO.id) {
        // Update existing feedback
        console.log(`FeedbackRepository: Updating feedback ${feedbackDTO.id}...`)
        const docRef = doc(db, this.collectionName, feedbackDTO.id)
        await updateDoc(docRef, firestoreData)
        console.log(`FeedbackRepository: Updated feedback ${feedbackDTO.id}`)
        return feedbackDTO.id
      } else {
        // Create new feedback
        console.log('FeedbackRepository: Creating new feedback...')
        const docRef = await addDoc(this.collectionRef, firestoreData)
        console.log(`FeedbackRepository: Created feedback with ID ${docRef.id}`)
        return docRef.id
      }
    } catch (error) {
      console.error('FeedbackRepository: Error saving feedback:', error)
      throw new Error(`Failed to save feedback: ${error.message}`)
    }
  }

  /**
   * Create new feedback
   */
  async create (feedbackData) {
    const feedbackDTO = new FeedbackDTO(feedbackData)
    const id = await this.save(feedbackDTO)

    // Return the feedback with the generated ID
    return await this.getById(id)
  }

  /**
   * Update existing feedback
   */
  async update (id, updates) {
    const existingFeedback = await this.getById(id)
    if (!existingFeedback) {
      throw new Error(`Feedback with ID ${id} not found`)
    }

    const updatedFeedback = existingFeedback.withUpdates(updates)
    await this.save(updatedFeedback)

    return await this.getById(id)
  }

  /**
   * Update feedback status
   * @param {string} id - Feedback document ID
   * @param {string} status - 'pending' or 'resolved'
   */
  async updateStatus (id, status) {
    if (status !== 'pending' && status !== 'resolved') {
      throw new Error('Status must be either pending or resolved')
    }

    return await this.update(id, { status })
  }

  /**
   * Add or update admin notes
   * @param {string} id - Feedback document ID
   * @param {string} notes - Admin notes text
   */
  async addAdminNote (id, notes) {
    return await this.update(id, { admin_notes: notes })
  }

  /**
   * Delete feedback - permanently remove from database
   * Use with caution!
   */
  async delete (id) {
    try {
      console.log(`FeedbackRepository: Deleting feedback ${id}...`)
      const docRef = doc(db, this.collectionName, id)
      await deleteDoc(docRef)
      console.log(`FeedbackRepository: Deleted feedback ${id}`)
    } catch (error) {
      console.error(`FeedbackRepository: Error deleting feedback ${id}:`, error)
      throw new Error(`Failed to delete feedback ${id}: ${error.message}`)
    }
  }

  /**
   * Search feedback by text (searches message and admin notes)
   */
  async search (searchText) {
    if (!searchText || searchText.trim().length === 0) {
      return []
    }

    try {
      console.log(`FeedbackRepository: Searching feedback for "${searchText}"...`)

      // Load all feedback and filter client-side
      const allFeedback = await this.getAll()

      const searchLower = searchText.toLowerCase().trim()
      const filtered = allFeedback.filter(feedback =>
        feedback.getSearchableText().includes(searchLower),
      )

      console.log(`FeedbackRepository: Found ${filtered.length} feedback items matching "${searchText}"`)
      return filtered
    } catch (error) {
      console.error('FeedbackRepository: Error searching feedback:', error)
      throw new Error(`Failed to search feedback: ${error.message}`)
    }
  }

  /**
   * Get repository statistics
   */
  async getStats () {
    try {
      const allFeedback = await this.getAll()

      const statusStats = {
        pending: 0,
        resolved: 0,
      }

      for (const feedback of allFeedback) {
        statusStats[feedback.status] = (statusStats[feedback.status] || 0) + 1
      }

      return {
        total: allFeedback.length,
        pending: statusStats.pending,
        resolved: statusStats.resolved,
        withAdminNotes: allFeedback.filter(f => f.hasAdminNotes).length,
        lastUpdated: new Date(),
      }
    } catch (error) {
      console.error('FeedbackRepository: Error getting stats:', error)
      throw new Error(`Failed to get feedback statistics: ${error.message}`)
    }
  }

  collectionName = 'feedback';
}
