/**
 * Message Data Transfer Object
 * Handles data validation, transformation, and standardization for message records
 * Messages belong to conversations and have a 1-2000 character limit
 */
export class MessageDTO {
  constructor (data = {}) {
    this.id = data.id || null
    this.conversationId = this.sanitizeString(data.conversationId)
    this.senderId = this.sanitizeString(data.senderId)
    this.senderName = this.sanitizeString(data.senderName)
    this.text = this.sanitizeString(data.text)
    this.readBy = this.sanitizeArray(data.readBy)
    this.edited = Boolean(data.edited)
    this.editedAt = data.editedAt || null

    // Metadata
    this.createdAt = data.createdAt || null
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
   * Sanitize array input - ensure it's a valid array
   */
  sanitizeArray (value) {
    if (!Array.isArray(value)) {
      return []
    }
    return value.filter(item => item !== null && item !== undefined)
  }

  /**
   * Validate required fields and data integrity
   */
  isValid () {
    return this.conversationId.length > 0
      && this.senderId.length > 0
      && this.senderName.length > 0
      && this.text.length > 0
      && this.text.length <= 2000 // Max 2000 characters
  }

  /**
   * Get validation errors for debugging
   */
  getValidationErrors () {
    const errors = []
    if (!this.conversationId) {
      errors.push('Conversation ID is required')
    }
    if (!this.senderId) {
      errors.push('Sender ID is required')
    }
    if (!this.senderName) {
      errors.push('Sender name is required')
    }
    if (this.text.length === 0) {
      errors.push('Message text is required')
    }
    if (this.text.length > 2000) {
      errors.push('Message must be less than 2000 characters')
    }
    return errors
  }

  /**
   * Check if message has been edited
   */
  get isEdited () {
    return this.edited && this.editedAt !== null
  }

  /**
   * Check if message has been read by specific user
   * @param {string} userEmail - User's email
   */
  isReadBy (userEmail) {
    return this.readBy.includes(userEmail)
  }

  /**
   * Get number of users who have read this message
   */
  get readCount () {
    return this.readBy.length
  }

  /**
   * Check if this is the sender's own message
   * @param {string} userEmail - User's email
   */
  isOwnMessage (userEmail) {
    return this.senderId === userEmail
  }

  /**
   * Get character count for display
   */
  get characterCount () {
    return this.text.length
  }

  /**
   * Get remaining characters before limit
   */
  get remainingCharacters () {
    return 2000 - this.text.length
  }

  /**
   * Get truncated text for preview (first 100 characters)
   */
  get shortText () {
    if (this.text.length <= 100) {
      return this.text
    }
    return this.text.slice(0, 100) + '...'
  }

  /**
   * Transform data for Firestore storage (only raw fields, no computed fields)
   */
  toFirestore () {
    return {
      conversationId: this.conversationId,
      senderId: this.senderId,
      senderName: this.senderName,
      text: this.text,
      readBy: this.readBy,
      edited: this.edited,
      editedAt: this.editedAt,

      // Metadata
      createdAt: this.createdAt || new Date(),
    }
  }

  /**
   * Create searchable text for full-text search capabilities
   */
  getSearchableText () {
    return [
      this.senderName,
      this.text,
    ].filter(text => text && String(text).trim().length > 0).join(' ').toLowerCase()
  }

  /**
   * Create a plain object for JSON serialization (useful for APIs)
   */
  toJSON () {
    return {
      id: this.id,
      conversationId: this.conversationId,
      senderId: this.senderId,
      senderName: this.senderName,
      text: this.text,
      shortText: this.shortText,
      readBy: this.readBy,
      readCount: this.readCount,
      edited: this.edited,
      editedAt: this.editedAt,
      isEdited: this.isEdited,
      createdAt: this.createdAt,
      characterCount: this.characterCount,
      remainingCharacters: this.remainingCharacters,
    }
  }

  /**
   * Create a copy of this DTO with updated fields
   */
  withUpdates (updates) {
    return new MessageDTO({
      ...this.toJSON(),
      ...updates,
    })
  }

  /**
   * BUSINESS LOGIC METHODS
   */

  /**
   * Mark message as read by a user
   * @param {string} userEmail - User's email
   * @returns {MessageDTO} New MessageDTO with updated readBy array
   */
  markAsReadBy (userEmail) {
    if (this.isReadBy(userEmail)) {
      return this // Already read, no changes needed
    }
    return this.withUpdates({
      readBy: [...this.readBy, userEmail],
    })
  }

  /**
   * Edit message text
   * @param {string} newText - New message text
   * @returns {MessageDTO} New MessageDTO with updated text and edit metadata
   */
  editText (newText) {
    return this.withUpdates({
      text: newText,
      edited: true,
      editedAt: new Date(),
    })
  }

  /**
   * Static factory method to create from Firestore document
   */
  static fromFirestore (doc) {
    if (!doc.exists()) {
      throw new Error('Document does not exist')
    }

    return new MessageDTO({
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
          return MessageDTO.fromFirestore(doc)
        } catch (error) {
          console.warn(`Failed to create MessageDTO from document ${doc.id}:`, error)
          return null
        }
      })
      .filter(dto => dto !== null && dto.isValid())
  }
}
