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
      const q = query(this.collectionRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)

      const feedback = FeedbackDTO.fromFirestoreSnapshot(snapshot)

      return feedback
    } catch (error) {
      console.error('FeedbackRepository: Error loading all feedback:', error)
      throw new Error(`Failed to load feedback: ${error.message}`, { cause: error })
    }
  }

  /**
   * Get single feedback by ID
   * @param {string} id - Feedback document ID
   */
  async getById (id) {
    try {
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      const feedback = FeedbackDTO.fromFirestore(docSnap)

      return feedback
    } catch (error) {
      console.error(`FeedbackRepository: Error loading feedback ${id}:`, error)
      throw new Error(`Failed to load feedback ${id}: ${error.message}`, { cause: error })
    }
  }

  /**
   * Get feedback by parent ID
   * @param {string} parentId - Parent document ID
   */
  async getByParentId (parentId) {
    try {
      const q = query(
        this.collectionRef,
        where('parent_id', '==', parentId),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(q)

      const feedback = FeedbackDTO.fromFirestoreSnapshot(snapshot)

      return feedback
    } catch (error) {
      console.error(`FeedbackRepository: Error loading feedback for parent ${parentId}:`, error)
      throw new Error(`Failed to load feedback for parent ${parentId}: ${error.message}`, { cause: error })
    }
  }

  /**
   * Get feedback by status
   * @param {string} status - 'pending' or 'resolved'
   */
  async getByStatus (status) {
    try {
      const q = query(
        this.collectionRef,
        where('status', '==', status),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(q)

      const feedback = FeedbackDTO.fromFirestoreSnapshot(snapshot)

      return feedback
    } catch (error) {
      console.error(`FeedbackRepository: Error loading ${status} feedback:`, error)
      throw new Error(`Failed to load ${status} feedback: ${error.message}`, { cause: error })
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
        const docRef = doc(db, this.collectionName, feedbackDTO.id)
        await updateDoc(docRef, firestoreData)
        return feedbackDTO.id
      } else {
        // Create new feedback
        const docRef = await addDoc(this.collectionRef, firestoreData)
        return docRef.id
      }
    } catch (error) {
      console.error('FeedbackRepository: Error saving feedback:', error)
      throw new Error(`Failed to save feedback: ${error.message}`, { cause: error })
    }
  }

  /**
   * Update existing feedback
   * (New feedback is created by the submitFeedback function, not from the client.)
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
      const docRef = doc(db, this.collectionName, id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error(`FeedbackRepository: Error deleting feedback ${id}:`, error)
      throw new Error(`Failed to delete feedback ${id}: ${error.message}`, { cause: error })
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
      // Load all feedback and filter client-side
      const allFeedback = await this.getAll()

      const searchLower = searchText.toLowerCase().trim()
      const filtered = allFeedback.filter(feedback =>
        feedback.getSearchableText().includes(searchLower),
      )

      return filtered
    } catch (error) {
      console.error('FeedbackRepository: Error searching feedback:', error)
      throw new Error(`Failed to search feedback: ${error.message}`, { cause: error })
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
      throw new Error(`Failed to get feedback statistics: ${error.message}`, { cause: error })
    }
  }

  collectionName = 'feedback'
}
