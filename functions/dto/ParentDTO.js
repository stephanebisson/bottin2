/**
 * Parent Data Transfer Object for Cloud Functions
 * Simplified version focused on validation and Firestore operations
 */
class ParentDTO {
  constructor (data = {}) {
    this.email = this.sanitizeEmail(data.email) // Email is the document ID
    this.first_name = this.sanitizeString(data.first_name)
    this.last_name = this.sanitizeString(data.last_name)
    this.phone = this.sanitizeString(data.phone)

    // Metadata
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
   * Sanitize email input - trim, lowercase, and validate basic format
   */
  sanitizeEmail (value) {
    if (!value || typeof value !== 'string') {
      return null
    }
    const email = value.trim().toLowerCase()
    return email.length > 0 && email.includes('@') ? email : null
  }

  /**
   * Validate required fields and data integrity
   */
  isValid () {
    return this.email !== null && this.email.length > 0
  }

  /**
   * Get validation errors for debugging
   */
  getValidationErrors () {
    const errors = []
    if (!this.email) {
      errors.push('Email is required')
    }
    return errors
  }

  /**
   * Get computed full name
   */
  get fullName () {
    return `${this.first_name} ${this.last_name}`.trim() || this.email
  }

  /**
   * Transform data for Firestore storage
   */
  toFirestore () {
    return {
      email: this.email,
      first_name: this.first_name,
      last_name: this.last_name,
      phone: this.phone,

      // Computed fields for easier querying
      fullName: this.fullName,
      searchableText: this.getSearchableText(),

      // Metadata will be handled by the caller (FieldValue.serverTimestamp())
      updatedAt: this.updatedAt,
      createdAt: this.createdAt,
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
    ].filter(text => text && String(text).trim().length > 0)
      .join(' ')
      .toLowerCase()
  }

  /**
   * Prepare data for creating a new parent with server timestamps
   */
  toNewParentFirestoreData (FieldValue) {
    const data = this.toFirestore()
    // Override timestamps for new parent creation
    data.createdAt = FieldValue.serverTimestamp()
    data.updatedAt = FieldValue.serverTimestamp()
    return data
  }

  /**
   * Static factory method to create from raw data with validation
   */
  static fromRawData (data) {
    const dto = new ParentDTO(data)
    if (!dto.isValid()) {
      const errors = dto.getValidationErrors()
      throw new Error(`Invalid parent data: ${errors.join(', ')}`)
    }
    return dto
  }
}

module.exports = { ParentDTO }
