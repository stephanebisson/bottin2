/**
 * Parent Data Transfer Object
 * Handles data validation, transformation, and standardization for parent records
 * Based on actual data structure from sheets-sync.js import script
 */
export class ParentDTO {
  constructor (data = {}) {
    this.id = data.id || null
    this.first_name = this.sanitizeString(data.first_name)
    this.last_name = this.sanitizeString(data.last_name)
    this.phone = this.sanitizePhone(data.phone)
    this.email = this.sanitizeEmail(data.email)
    this.address = this.sanitizeString(data.address)
    this.city = this.sanitizeString(data.city)
    this.postal_code = this.sanitizeString(data.postal_code)
    this.interests = this.sanitizeInterests(data.interests)

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
   * Sanitize phone number - keep only digits as done in transformParents
   */
  sanitizePhone (value) {
    if (!value || typeof value !== 'string') {
      return ''
    }
    return value.replace(/[^\d]/g, '')
  }

  /**
   * Sanitize email input - trim, lowercase, and validate basic format
   */
  sanitizeEmail (value) {
    if (!value || typeof value !== 'string') {
      return ''
    }
    const email = value.trim().toLowerCase()
    // Basic validation: must have @ with non-empty parts before and after
    const atIndex = email.indexOf('@')
    if (atIndex <= 0 || atIndex >= email.length - 1) {
      return ''
    }
    return email
  }

  /**
   * Sanitize interests array - ensure it's always a valid array of strings
   */
  sanitizeInterests (interests) {
    if (!Array.isArray(interests)) {
      return []
    }
    return interests
      .filter(interest => interest && typeof interest === 'string')
      .map(interest => interest.trim())
      .filter(interest => interest.length > 0)
  }

  /**
   * Validate required fields and data integrity
   */
  isValid () {
    return this.first_name.length > 0
      && this.last_name.length > 0
      && this.email.length > 0
      && this.email.includes('@')
  }

  /**
   * Get validation errors for debugging
   */
  getValidationErrors () {
    const errors = []
    if (!this.first_name) {
      errors.push('First name is required')
    }
    if (!this.last_name) {
      errors.push('Last name is required')
    }
    if (!this.email) {
      errors.push('Email is required')
    } else if (!this.email.includes('@')) {
      errors.push('Email must be valid')
    }
    return errors
  }

  /**
   * Get computed full name
   */
  get fullName () {
    return `${this.first_name} ${this.last_name}`.trim()
  }

  /**
   * Get display-friendly phone number with formatting
   */
  get displayPhone () {
    if (!this.phone || this.phone.length === 0) {
      return ''
    }

    // Format as (XXX) XXX-XXXX if 10 digits
    if (this.phone.length === 10) {
      return `(${this.phone.slice(0, 3)}) ${this.phone.slice(3, 6)}-${this.phone.slice(6)}`
    }

    return this.phone
  }

  /**
   * Get formatted full address
   */
  get fullAddress () {
    const parts = []
    if (this.address) {
      parts.push(this.address)
    }
    if (this.city) {
      parts.push(this.city)
    }
    if (this.postal_code) {
      parts.push(this.postal_code)
    }
    return parts.join(', ')
  }

  /**
   * Check if parent has contact information
   */
  get hasContactInfo () {
    return this.email.length > 0 || this.phone.length > 0
  }

  /**
   * Check if parent has interests recorded
   */
  get hasInterests () {
    return this.interests.length > 0
  }

  /**
   * Get interest count
   */
  get interestCount () {
    return this.interests.length
  }

  /**
   * Check if parent has a specific interest
   * @param {string} interest - Interest name to check
   * @returns {boolean} True if parent has this interest
   */
  hasInterest (interest) {
    if (!interest || typeof interest !== 'string') {
      return false
    }
    return this.interests.includes(interest.toLowerCase())
  }

  /**
   * Transform data for Firestore storage (only raw fields, no computed fields)
   */
  toFirestore () {
    return {
      first_name: this.first_name,
      last_name: this.last_name,
      phone: this.phone,
      email: this.email,
      address: this.address,
      city: this.city,
      postal_code: this.postal_code,
      interests: this.interests,

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
      this.first_name,
      this.last_name,
      this.email,
      this.phone,
      this.city,
      ...this.interests,
    ].filter(text => text && String(text).trim().length > 0)
      .join(' ')
      .toLowerCase()
  }

  /**
   * Create a plain object for JSON serialization (useful for APIs)
   */
  toJSON () {
    return {
      id: this.id,
      first_name: this.first_name,
      last_name: this.last_name,
      fullName: this.fullName,
      phone: this.phone,
      displayPhone: this.displayPhone,
      email: this.email,
      address: this.address,
      city: this.city,
      postal_code: this.postal_code,
      fullAddress: this.fullAddress,
      interests: this.interests,
      hasContactInfo: this.hasContactInfo,
      hasInterests: this.hasInterests,
      interestCount: this.interestCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  /**
   * Create a copy of this DTO with updated fields
   */
  withUpdates (updates) {
    return new ParentDTO({
      ...this.toJSON(),
      ...updates,
    })
  }

  /**
   * BUSINESS LOGIC METHODS
   */

  /**
   * Update parent contact information
   * @param {Object} contactUpdates - Contact updates object
   * @param {string} [contactUpdates.phone] - New phone number
   * @param {string} [contactUpdates.email] - New email
   * @param {string} [contactUpdates.address] - New address
   * @param {string} [contactUpdates.city] - New city
   * @param {string} [contactUpdates.postal_code] - New postal code
   * @returns {ParentDTO} New ParentDTO with updated contact info
   */
  updateContactInfo (contactUpdates) {
    const updates = {}

    if (contactUpdates.phone !== undefined) {
      updates.phone = this.sanitizePhone(contactUpdates.phone)
    }
    if (contactUpdates.email !== undefined) {
      updates.email = this.sanitizeEmail(contactUpdates.email)
    }
    if (contactUpdates.address !== undefined) {
      updates.address = this.sanitizeString(contactUpdates.address)
    }
    if (contactUpdates.city !== undefined) {
      updates.city = this.sanitizeString(contactUpdates.city)
    }
    if (contactUpdates.postal_code !== undefined) {
      updates.postal_code = this.sanitizeString(contactUpdates.postal_code)
    }

    return this.withUpdates(updates)
  }

  /**
   * Update parent interests
   * @param {string[]} newInterests - Array of interest names
   * @returns {ParentDTO} New ParentDTO with updated interests
   */
  updateInterests (newInterests) {
    return this.withUpdates({
      interests: this.sanitizeInterests(newInterests),
    })
  }

  /**
   * Add an interest to parent's interests
   * @param {string} interest - Interest to add
   * @returns {ParentDTO} New ParentDTO with added interest
   */
  addInterest (interest) {
    if (!interest || typeof interest !== 'string') {
      throw new Error('Interest must be a non-empty string')
    }

    const sanitizedInterest = interest.trim().toLowerCase()
    if (this.interests.includes(sanitizedInterest)) {
      return this // No change needed
    }

    return this.updateInterests([...this.interests, sanitizedInterest])
  }

  /**
   * Remove an interest from parent's interests
   * @param {string} interest - Interest to remove
   * @returns {ParentDTO} New ParentDTO with removed interest
   */
  removeInterest (interest) {
    if (!interest || typeof interest !== 'string') {
      throw new Error('Interest must be a non-empty string')
    }

    const sanitizedInterest = interest.trim().toLowerCase()
    return this.updateInterests(
      this.interests.filter(i => i !== sanitizedInterest),
    )
  }

  /**
   * Static factory method to create from Firestore document
   */
  static fromFirestore (doc) {
    if (!doc.exists()) {
      throw new Error('Document does not exist')
    }

    return new ParentDTO({
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
          return ParentDTO.fromFirestore(doc)
        } catch (error) {
          console.warn(`Failed to create ParentDTO from document ${doc.id}:`, error)
          return null
        }
      })
      .filter(dto => dto !== null && dto.isValid())
  }
}
