import { getByEmail, sanitizeEmailKeys, setByEmail, unsanitizeEmailKeys } from '@/utils/emailHelpers'

/**
 * Conversation Data Transfer Object
 * Handles data validation, transformation, and standardization for conversation records
 * Supports direct, class, and committee conversation types
 *
 * NOTE: participantNames and unreadCount use sanitized email keys (dots replaced with __DOT__)
 * because Firestore interprets dots as nested paths. Use getByEmail() helper to access values.
 */
export class ConversationDTO {
  constructor (data = {}) {
    this.id = data.id || null
    this.type = this.sanitizeType(data.type)
    this.contextId = this.sanitizeString(data.contextId)
    this.contextLabel = this.sanitizeContextLabel(data.contextLabel)
    this.participants = this.sanitizeArray(data.participants) // Array of actual emails
    this.participantNames = this.sanitizeObject(data.participantNames) // Keys are sanitized emails
    this.unreadCount = this.sanitizeObject(data.unreadCount) // Keys are sanitized emails
    this.lastMessageAt = data.lastMessageAt || null
    this.lastMessagePreview = this.sanitizeString(data.lastMessagePreview)
    this.lastMessageSenderId = this.sanitizeString(data.lastMessageSenderId)
    this.archived = Boolean(data.archived)

    // Metadata
    this.createdAt = data.createdAt || null
    this.createdBy = this.sanitizeString(data.createdBy)
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
   * Sanitize object input - ensure it's a valid object
   */
  sanitizeObject (value) {
    if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
      return {}
    }
    return { ...value }
  }

  /**
   * Sanitize type - ensure it's one of the valid types
   */
  sanitizeType (value) {
    const validTypes = ['direct', 'class', 'committee']
    if (validTypes.includes(value)) {
      return value
    }
    return 'direct' // Default type
  }

  /**
   * Sanitize context label - ensure it has en and fr properties
   */
  sanitizeContextLabel (value) {
    if (value === null || value === undefined || typeof value !== 'object') {
      return { en: '', fr: '' }
    }
    return {
      en: this.sanitizeString(value.en),
      fr: this.sanitizeString(value.fr),
    }
  }

  /**
   * Validate required fields and data integrity
   */
  isValid () {
    return this.type !== ''
      && this.participants.length >= 2 // At least 2 participants
      && this.createdBy.length > 0
      && (this.type === 'direct' || this.contextId.length > 0) // contextId required for class/committee
      && (this.type === 'direct' || (this.contextLabel.en.length > 0 && this.contextLabel.fr.length > 0))
  }

  /**
   * Get validation errors for debugging
   */
  getValidationErrors () {
    const errors = []
    if (!this.type) {
      errors.push('Type is required')
    }
    if (this.participants.length < 2) {
      errors.push('At least 2 participants are required')
    }
    if (!this.createdBy) {
      errors.push('Creator email is required')
    }
    if (this.type !== 'direct' && !this.contextId) {
      errors.push('Context ID is required for class and committee conversations')
    }
    if (this.type !== 'direct' && (!this.contextLabel.en || !this.contextLabel.fr)) {
      errors.push('Context label (en and fr) is required for class and committee conversations')
    }
    return errors
  }

  /**
   * Check if this is a direct (1-on-1) conversation
   */
  get isDirect () {
    return this.type === 'direct'
  }

  /**
   * Check if this is a class conversation
   */
  get isClass () {
    return this.type === 'class'
  }

  /**
   * Check if this is a committee conversation
   */
  get isCommittee () {
    return this.type === 'committee'
  }

  /**
   * Check if this conversation is archived
   */
  get isArchived () {
    return this.archived
  }

  /**
   * Get participant count
   */
  get participantCount () {
    return this.participants.length
  }

  /**
   * Get unread count for a specific user
   * @param {string} userEmail - User's email
   */
  getUnreadCountForUser (userEmail) {
    return getByEmail(this.unreadCount, userEmail) || 0
  }

  /**
   * Check if user has unread messages
   * @param {string} userEmail - User's email
   */
  hasUnreadMessages (userEmail) {
    return this.getUnreadCountForUser(userEmail) > 0
  }

  /**
   * Get display label for specific locale
   * @param {string} locale - 'en' or 'fr'
   */
  getLabel (locale = 'en') {
    return this.contextLabel[locale] || this.contextLabel.en
  }

  /**
   * Get truncated preview for list display (first 50 characters)
   */
  get shortPreview () {
    if (!this.lastMessagePreview) {
      return ''
    }
    if (this.lastMessagePreview.length <= 50) {
      return this.lastMessagePreview
    }
    return this.lastMessagePreview.slice(0, 50) + '...'
  }

  /**
   * Transform data for Firestore storage (only raw fields, no computed fields)
   * Sanitizes email keys in participantNames and unreadCount for Firestore compatibility
   */
  toFirestore () {
    return {
      type: this.type,
      contextId: this.contextId,
      contextLabel: this.contextLabel,
      participants: this.participants, // Array of actual emails
      participantNames: sanitizeEmailKeys(this.participantNames), // Sanitize keys for Firestore
      unreadCount: sanitizeEmailKeys(this.unreadCount), // Sanitize keys for Firestore
      lastMessageAt: this.lastMessageAt || new Date(),
      lastMessagePreview: this.lastMessagePreview,
      lastMessageSenderId: this.lastMessageSenderId,
      archived: this.archived,

      // Metadata
      createdAt: this.createdAt || new Date(),
      createdBy: this.createdBy,
    }
  }

  /**
   * Create searchable text for full-text search capabilities
   */
  getSearchableText () {
    return [
      this.contextLabel.en,
      this.contextLabel.fr,
      this.lastMessagePreview,
      ...Object.values(this.participantNames),
    ].filter(text => text && String(text).trim().length > 0).join(' ').toLowerCase()
  }

  /**
   * Create a plain object for JSON serialization (useful for APIs)
   */
  toJSON () {
    return {
      id: this.id,
      type: this.type,
      contextId: this.contextId,
      contextLabel: this.contextLabel,
      participants: this.participants,
      participantNames: this.participantNames,
      unreadCount: this.unreadCount,
      lastMessageAt: this.lastMessageAt,
      lastMessagePreview: this.lastMessagePreview,
      lastMessageSenderId: this.lastMessageSenderId,
      archived: this.archived,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      isDirect: this.isDirect,
      isClass: this.isClass,
      isCommittee: this.isCommittee,
      participantCount: this.participantCount,
      shortPreview: this.shortPreview,
    }
  }

  /**
   * Create a copy of this DTO with updated fields
   */
  withUpdates (updates) {
    return new ConversationDTO({
      ...this.toJSON(),
      ...updates,
    })
  }

  /**
   * BUSINESS LOGIC METHODS
   */

  /**
   * Update last message info
   * @param {string} preview - Message preview text
   * @param {string} senderId - Sender's email
   * @returns {ConversationDTO} New ConversationDTO with updated message info
   */
  updateLastMessage (preview, senderId) {
    return this.withUpdates({
      lastMessagePreview: preview,
      lastMessageSenderId: senderId,
      lastMessageAt: new Date(),
    })
  }

  /**
   * Increment unread count for specific users
   * @param {string[]} userEmails - Array of user emails to increment
   * @param {string} senderEmail - Email of the sender (excluded from increment)
   * @returns {ConversationDTO} New ConversationDTO with updated unread counts
   */
  incrementUnreadFor (userEmails, senderEmail) {
    const newUnreadCount = { ...this.unreadCount }
    for (const email of userEmails) {
      if (email !== senderEmail) {
        const currentCount = getByEmail(newUnreadCount, email) || 0
        setByEmail(newUnreadCount, email, currentCount + 1)
      }
    }
    return this.withUpdates({ unreadCount: newUnreadCount })
  }

  /**
   * Reset unread count for a specific user
   * @param {string} userEmail - User's email
   * @returns {ConversationDTO} New ConversationDTO with reset unread count
   */
  markAsReadBy (userEmail) {
    const newUnreadCount = { ...this.unreadCount }
    setByEmail(newUnreadCount, userEmail, 0)
    return this.withUpdates({ unreadCount: newUnreadCount })
  }

  /**
   * Archive this conversation
   * @returns {ConversationDTO} New ConversationDTO with archived status
   */
  archive () {
    return this.withUpdates({ archived: true })
  }

  /**
   * Unarchive this conversation
   * @returns {ConversationDTO} New ConversationDTO with unarchived status
   */
  unarchive () {
    return this.withUpdates({ archived: false })
  }

  /**
   * Add participants to conversation
   * @param {string[]} newParticipants - Array of participant emails to add
   * @returns {ConversationDTO} New ConversationDTO with added participants
   */
  addParticipants (newParticipants) {
    const updatedParticipants = [...new Set([...this.participants, ...newParticipants])]
    return this.withUpdates({ participants: updatedParticipants })
  }

  /**
   * Remove participants from conversation
   * @param {string[]} participantsToRemove - Array of participant emails to remove
   * @returns {ConversationDTO} New ConversationDTO with removed participants
   */
  removeParticipants (participantsToRemove) {
    const updatedParticipants = this.participants.filter(
      email => !participantsToRemove.includes(email),
    )
    return this.withUpdates({ participants: updatedParticipants })
  }

  /**
   * Static factory method to create from Firestore document
   * Unsanitizes email keys in participantNames and unreadCount
   */
  static fromFirestore (doc) {
    if (!doc.exists()) {
      throw new Error('Document does not exist')
    }

    const data = doc.data()
    return new ConversationDTO({
      id: doc.id,
      ...data,
      participantNames: unsanitizeEmailKeys(data.participantNames || {}),
      unreadCount: unsanitizeEmailKeys(data.unreadCount || {}),
    })
  }

  /**
   * Static factory method to create multiple DTOs from Firestore snapshot
   */
  static fromFirestoreSnapshot (snapshot) {
    return snapshot.docs
      .map(doc => {
        try {
          return ConversationDTO.fromFirestore(doc)
        } catch (error) {
          console.warn(`Failed to create ConversationDTO from document ${doc.id}:`, error)
          return null
        }
      })
      .filter(dto => dto !== null && dto.isValid())
  }
}
