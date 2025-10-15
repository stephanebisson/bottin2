/**
 * Student Data Transfer Object for Cloud Functions
 * Simplified version focused on validation and Firestore operations
 */
class StudentDTO {
  constructor (data = {}) {
    this.id = data.id || null
    this.first_name = this.sanitizeString(data.first_name)
    this.last_name = this.sanitizeString(data.last_name)
    this.className = this.sanitizeString(data.className)
    this.level = this.sanitizeNumber(data.level)
    this.parent1_id = this.sanitizeString(data.parent1_id)
    this.parent2_id = this.sanitizeString(data.parent2_id)

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
   * Sanitize number input - convert to number and handle invalid values
   */
  sanitizeNumber (value) {
    if (value === null || value === undefined || value === '') {
      return null
    }
    const num = Number(value)
    return Number.isNaN(num) ? null : num
  }

  /**
   * Validate required fields and data integrity
   */
  isValid () {
    return this.first_name.length > 0
      && this.last_name.length > 0
      && this.className.length > 0
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
    if (!this.className) {
      errors.push('Class name is required')
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
   * Transform data for Firestore storage (removes id, adds computed fields)
   */
  toFirestore () {
    return {
      first_name: this.first_name,
      last_name: this.last_name,
      className: this.className,
      level: this.level,
      parent1_id: this.parent1_id,
      parent2_id: this.parent2_id,

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
      this.className,
      this.level ? this.level.toString() : '',
      this.parent1_id,
      this.parent2_id,
    ].filter(text => text && String(text).trim().length > 0)
      .join(' ')
      .toLowerCase()
  }

  /**
   * Prepare data for creating a new student with server timestamps
   */
  toNewStudentFirestoreData (FieldValue) {
    const data = this.toFirestore()
    // Override timestamps for new student creation
    data.createdAt = FieldValue.serverTimestamp()
    data.updatedAt = FieldValue.serverTimestamp()
    return data
  }

  /**
   * Prepare data for updating an existing student with server timestamp
   */
  toUpdateFirestoreData (FieldValue) {
    const data = this.toFirestore()
    // Override timestamp for updates
    data.updatedAt = FieldValue.serverTimestamp()
    // Don't override createdAt on updates
    delete data.createdAt
    return data
  }

  /**
   * Apply school progression changes
   * @param {number} newLevel - New grade level
   * @param {string} newClassName - New class name
   * @returns {StudentDTO} New StudentDTO with updated level and class
   */
  progressToNextYear (newLevel, newClassName) {
    if (typeof newLevel !== 'number') {
      throw new TypeError('Level must be a number')
    }
    if (!newClassName || typeof newClassName !== 'string') {
      throw new Error('Class name must be a non-empty string')
    }

    return new StudentDTO({
      ...this.toFirestore(),
      id: this.id,
      level: newLevel,
      className: newClassName.trim(),
    })
  }

  /**
   * Create a copy of this DTO with updated fields
   */
  withUpdates (updates) {
    return new StudentDTO({
      ...this.toFirestore(),
      id: this.id,
      ...updates,
    })
  }

  /**
   * Static factory method to create from raw data with validation
   */
  static fromRawData (data) {
    const dto = new StudentDTO(data)
    if (!dto.isValid()) {
      const errors = dto.getValidationErrors()
      throw new Error(`Invalid student data: ${errors.join(', ')}`)
    }
    return dto
  }
}

module.exports = { StudentDTO }
