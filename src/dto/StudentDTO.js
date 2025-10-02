/**
 * Student Data Transfer Object
 * Handles data validation, transformation, and standardization for student records
 * Based on actual data structure from sheets-sync.js import script
 */
export class StudentDTO {
  constructor (data = {}) {
    this.id = data.id || null
    this.first_name = this.sanitizeString(data.first_name)
    this.last_name = this.sanitizeString(data.last_name)
    this.className = this.sanitizeString(data.className)
    this.level = this.sanitizeNumber(data.level)
    this.parent1_email = this.sanitizeEmail(data.parent1_email)
    this.parent2_email = this.sanitizeEmail(data.parent2_email)

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
   * Get display-friendly class name (handle edge cases)
   */
  get displayClassName () {
    return this.className || 'Unknown Class'
  }

  /**
   * Get display-friendly level
   */
  get displayLevel () {
    return this.level === null ? 'Unknown Level' : this.level.toString()
  }

  /**
   * Get parent emails as an array (excluding null values)
   */
  get parentEmails () {
    const emails = []
    if (this.parent1_email) {
      emails.push(this.parent1_email)
    }
    if (this.parent2_email) {
      emails.push(this.parent2_email)
    }
    return emails
  }

  /**
   * Check if student has parent email contacts
   */
  get hasParentContacts () {
    return this.parentEmails.length > 0
  }

  /**
   * Get parent 1 data by looking up in parent repository
   * @param {ParentRepository} parentRepository - Repository to fetch parent data
   * @returns {Promise<ParentDTO|null>} Parent DTO or null if not found
   */
  async getParent1 (parentRepository) {
    if (!this.parent1_email) {
      return null
    }
    try {
      return await parentRepository.getById(this.parent1_email)
    } catch (error) {
      console.warn(`Failed to load parent1 (${this.parent1_email}) for student ${this.fullName}:`, error.message)
      return null
    }
  }

  /**
   * Get parent 2 data by looking up in parent repository
   * @param {ParentRepository} parentRepository - Repository to fetch parent data
   * @returns {Promise<ParentDTO|null>} Parent DTO or null if not found
   */
  async getParent2 (parentRepository) {
    if (!this.parent2_email) {
      return null
    }
    try {
      return await parentRepository.getById(this.parent2_email)
    } catch (error) {
      console.warn(`Failed to load parent2 (${this.parent2_email}) for student ${this.fullName}:`, error.message)
      return null
    }
  }

  /**
   * Get all parents for this student
   * @param {ParentRepository} parentRepository - Repository to fetch parent data
   * @returns {Promise<ParentDTO[]>} Array of parent DTOs (excluding null values)
   */
  async getParents (parentRepository) {
    const parents = await Promise.all([
      this.getParent1(parentRepository),
      this.getParent2(parentRepository),
    ])
    return parents.filter(p => p !== null)
  }

  /**
   * Get parent emails that are valid foreign keys (non-null)
   * @returns {string[]} Array of valid parent email foreign keys
   */
  get parentForeignKeys () {
    const keys = []
    if (this.parent1_email) {
      keys.push(this.parent1_email)
    }
    if (this.parent2_email) {
      keys.push(this.parent2_email)
    }
    return keys
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
      parent1_email: this.parent1_email,
      parent2_email: this.parent2_email,

      // Computed fields for easier querying
      fullName: this.fullName,
      searchableText: this.getSearchableText(),

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
      this.className,
      this.displayLevel,
      this.parent1_email,
      this.parent2_email,
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
      className: this.className,
      displayClassName: this.displayClassName,
      level: this.level,
      displayLevel: this.displayLevel,
      parent1_email: this.parent1_email,
      parent2_email: this.parent2_email,
      parentEmails: this.parentEmails,
      hasParentContacts: this.hasParentContacts,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  /**
   * Create a copy of this DTO with updated fields
   */
  withUpdates (updates) {
    return new StudentDTO({
      ...this.toJSON(),
      ...updates,
    })
  }

  /**
   * BUSINESS LOGIC METHODS - Based on actual mutations in schoolProgression.js
   */

  /**
   * Apply school progression changes (mirrors schoolProgression.js batch.update)
   * Updates both level and className simultaneously as done in the Cloud Function
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

    return this.withUpdates({
      level: newLevel,
      className: newClassName.trim(),
    })
  }

  /**
   * Prepare data for creating a new student (mirrors schoolProgression.js batch.set)
   * Returns the Firestore data that would be used for batch.set()
   * @returns {Object} Firestore-ready data for new student creation
   */
  toNewStudentFirestoreData () {
    const data = this.toFirestore()
    // Remove id since this is for new student creation
    delete data.id
    return data
  }

  /**
   * Static factory method to create from Firestore document
   */
  static fromFirestore (doc) {
    if (!doc.exists()) {
      throw new Error('Document does not exist')
    }

    return new StudentDTO({
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
          return StudentDTO.fromFirestore(doc)
        } catch (error) {
          console.warn(`Failed to create StudentDTO from document ${doc.id}:`, error)
          return null
        }
      })
      .filter(dto => dto !== null && dto.isValid())
  }
}
