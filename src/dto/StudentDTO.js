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
    this.parent1_id = this.sanitizeString(data.parent1_id)
    this.parent2_id = this.sanitizeString(data.parent2_id)

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
   * Validate required fields and data integrity
   * Note: className is optional since students may not have a class assigned yet
   */
  isValid () {
    return this.first_name.length > 0
      && this.last_name.length > 0
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
    // className is optional - students may not have a class assigned
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
   * Get parent IDs as an array (excluding null values)
   */
  get parentIds () {
    const ids = []
    if (this.parent1_id) {
      ids.push(this.parent1_id)
    }
    if (this.parent2_id) {
      ids.push(this.parent2_id)
    }
    return ids
  }

  /**
   * Check if student has parent references
   */
  get hasParentContacts () {
    return this.parentIds.length > 0
  }

  /**
   * Get parent 1 data by looking up in parent repository
   * @param {ParentRepository} parentRepository - Repository to fetch parent data
   * @returns {Promise<ParentDTO|null>} Parent DTO or null if not found
   */
  async getParent1 (parentRepository) {
    if (!this.parent1_id) {
      return null
    }
    try {
      return await parentRepository.getById(this.parent1_id)
    } catch (error) {
      console.warn(`Failed to load parent1 (${this.parent1_id}) for student ${this.fullName}:`, error.message)
      return null
    }
  }

  /**
   * Get parent 2 data by looking up in parent repository
   * @param {ParentRepository} parentRepository - Repository to fetch parent data
   * @returns {Promise<ParentDTO|null>} Parent DTO or null if not found
   */
  async getParent2 (parentRepository) {
    if (!this.parent2_id) {
      return null
    }
    try {
      return await parentRepository.getById(this.parent2_id)
    } catch (error) {
      console.warn(`Failed to load parent2 (${this.parent2_id}) for student ${this.fullName}:`, error.message)
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
   * Get parent IDs that are valid foreign keys (non-null)
   * @returns {string[]} Array of valid parent ID foreign keys
   */
  get parentForeignKeys () {
    const keys = []
    if (this.parent1_id) {
      keys.push(this.parent1_id)
    }
    if (this.parent2_id) {
      keys.push(this.parent2_id)
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
      parent1_id: this.parent1_id,
      parent2_id: this.parent2_id,

      // Raw data only - no computed fields

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
      this.parent1_id,
      this.parent2_id,
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
      parent1_id: this.parent1_id,
      parent2_id: this.parent2_id,
      parentIds: this.parentIds,
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
