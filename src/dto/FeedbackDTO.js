/**
 * Feedback Data Transfer Object
 * Handles data validation, transformation, and standardization for feedback records
 * Submitted by parents to provide feedback and questions about the application
 */
export class FeedbackDTO {
  constructor (data = {}) {
    this.id = data.id || null
    this.parent_id = this.sanitizeString(data.parent_id)
    this.message = this.sanitizeString(data.message)
    this.status = this.sanitizeStatus(data.status)
    this.admin_notes = this.sanitizeString(data.admin_notes)

    // Metadata (these fields might exist from Firestore)
    this.createdAt = data.createdAt || null
    this.updatedAt = data.updatedAt || null
  }

  /**
   * Sanitize string input - trim and handle null/undefined
   */
  sanitizeString (value) {
    if (value === null || value === undefined) {
      return ''
    }
    return String(value).trim()
  }

  /**
   * Sanitize status - ensure it's either 'pending' or 'resolved'
   */
  sanitizeStatus (value) {
    if (value === 'resolved') {
      return 'resolved'
    }
    return 'pending' // Default status
  }

  /**
   * Validate required fields and data integrity
   */
  isValid () {
    return this.parent_id.length > 0
      && this.message.length > 0
      && this.message.length <= 5000 // Max 5000 characters
      && (this.status === 'pending' || this.status === 'resolved')
  }

  /**
   * Get validation errors for debugging
   */
  getValidationErrors () {
    const errors = []
    if (!this.parent_id) {
      errors.push('Parent ID is required')
    }
    if (!this.message) {
      errors.push('Message is required')
    }
    if (this.message.length > 5000) {
      errors.push('Message must be less than 5000 characters')
    }
    if (this.status !== 'pending' && this.status !== 'resolved') {
      errors.push('Status must be either pending or resolved')
    }
    return errors
  }

  /**
   * Get formatted status for display
   */
  get displayStatus () {
    return this.status.charAt(0).toUpperCase() + this.status.slice(1)
  }

  /**
   * Check if feedback has admin notes
   */
  get hasAdminNotes () {
    return this.admin_notes.length > 0
  }

  /**
   * Check if feedback is resolved
   */
  get isResolved () {
    return this.status === 'resolved'
  }

  /**
   * Check if feedback is pending
   */
  get isPending () {
    return this.status === 'pending'
  }

  /**
   * Get truncated message for list display (first 100 characters)
   */
  get shortMessage () {
    if (this.message.length <= 100) {
      return this.message
    }
    return this.message.slice(0, 100) + '...'
  }

  /**
   * Transform data for Firestore storage (only raw fields, no computed fields)
   */
  toFirestore () {
    return {
      parent_id: this.parent_id,
      message: this.message,
      status: this.status,
      admin_notes: this.admin_notes,

      // Metadata
      updatedAt: new Date(),
      createdAt: this.createdAt || new Date(),
    }
  }

  /**
   * Create searchable text for full-text search capabilities
   */
  getSearchableText () {
    return [
      this.parent_id,
      this.message,
      this.status,
      this.admin_notes,
    ].filter(text => text && String(text).trim().length > 0).join(' ').toLowerCase()
  }

  /**
   * Create a plain object for JSON serialization (useful for APIs)
   */
  toJSON () {
    return {
      id: this.id,
      parent_id: this.parent_id,
      message: this.message,
      shortMessage: this.shortMessage,
      status: this.status,
      displayStatus: this.displayStatus,
      admin_notes: this.admin_notes,
      hasAdminNotes: this.hasAdminNotes,
      isResolved: this.isResolved,
      isPending: this.isPending,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  /**
   * Create a copy of this DTO with updated fields
   */
  withUpdates (updates) {
    return new FeedbackDTO({
      ...this.toJSON(),
      ...updates,
    })
  }

  /**
   * BUSINESS LOGIC METHODS
   */

  /**
   * Mark feedback as resolved
   * @returns {FeedbackDTO} New FeedbackDTO with resolved status
   */
  markAsResolved () {
    return this.withUpdates({ status: 'resolved' })
  }

  /**
   * Mark feedback as pending
   * @returns {FeedbackDTO} New FeedbackDTO with pending status
   */
  markAsPending () {
    return this.withUpdates({ status: 'pending' })
  }

  /**
   * Add or update admin notes
   * @param {string} notes - Admin notes text
   * @returns {FeedbackDTO} New FeedbackDTO with updated admin notes
   */
  updateAdminNotes (notes) {
    return this.withUpdates({
      admin_notes: this.sanitizeString(notes),
    })
  }

  /**
   * Static factory method to create from Firestore document
   */
  static fromFirestore (doc) {
    if (!doc.exists()) {
      throw new Error('Document does not exist')
    }

    return new FeedbackDTO({
      id: doc.id,
      ...doc.data(),
    })
  }

  /**
   * Static factory method to create multiple DTOs from Firestore snapshot
   */
  static fromFirestoreSnapshot (snapshot) {
    return snapshot.docs
      .map(doc => {
        try {
          return FeedbackDTO.fromFirestore(doc)
        } catch (error) {
          console.warn(`Failed to create FeedbackDTO from document ${doc.id}:`, error)
          return null
        }
      })
      .filter(dto => dto !== null && dto.isValid())
  }
}
