/**
 * Staff Data Transfer Object
 * Handles data validation, transformation, and standardization for staff records
 * Based on actual data structure from sheets-sync.js import script
 */
export class StaffDTO {
  constructor (data = {}) {
    this.id = data.id || null
    this.first_name = this.sanitizeString(data.first_name)
    this.last_name = this.sanitizeString(data.last_name)
    this.title = this.sanitizeString(data.title)
    this.email = this.sanitizeEmail(data.email)
    this.phone = this.sanitizePhone(data.phone)
    this.directory_table = this.sanitizeString(data.directory_table)
    this.ce_role = this.sanitizeString(data.ce_role)
    this.ce_hierarchy = this.sanitizeString(data.ce_hierarchy)

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
   * Sanitize phone number - keep only digits (similar to parent phone handling)
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
    return email.length > 0 && email.includes('@') ? email : ''
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
   * Get display-friendly title
   */
  get displayTitle () {
    return this.title || 'Staff Member'
  }

  /**
   * Check if staff member has contact information
   */
  get hasContactInfo () {
    return this.email.length > 0 || this.phone.length > 0
  }

  /**
   * Check if staff member has CE (Conseil d'établissement) role
   */
  get hasCERole () {
    return this.ce_role.length > 0 || this.ce_hierarchy.length > 0
  }

  /**
   * Get CE information as object
   */
  get ceInfo () {
    return {
      role: this.ce_role,
      hierarchy: this.ce_hierarchy,
      hasRole: this.hasCERole,
    }
  }

  /**
   * Check if staff member should appear in directory
   */
  get inDirectory () {
    return this.directory_table.length > 0
  }

  /**
   * Transform data for Firestore storage (removes id, adds computed fields)
   */
  toFirestore () {
    return {
      first_name: this.first_name,
      last_name: this.last_name,
      title: this.title,
      email: this.email,
      phone: this.phone,
      directory_table: this.directory_table,
      ce_role: this.ce_role,
      ce_hierarchy: this.ce_hierarchy,

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
      this.title,
      this.email,
      this.phone,
      this.ce_role,
      this.directory_table,
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
      title: this.title,
      displayTitle: this.displayTitle,
      email: this.email,
      phone: this.phone,
      displayPhone: this.displayPhone,
      directory_table: this.directory_table,
      ce_role: this.ce_role,
      ce_hierarchy: this.ce_hierarchy,
      hasContactInfo: this.hasContactInfo,
      hasCERole: this.hasCERole,
      ceInfo: this.ceInfo,
      inDirectory: this.inDirectory,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  /**
   * Create a copy of this DTO with updated fields
   */
  withUpdates (updates) {
    return new StaffDTO({
      ...this.toJSON(),
      ...updates,
    })
  }

  /**
   * BUSINESS LOGIC METHODS
   */

  /**
   * Update staff contact information
   * @param {Object} contactUpdates - Contact updates object
   * @param {string} [contactUpdates.phone] - New phone number
   * @param {string} [contactUpdates.email] - New email
   * @returns {StaffDTO} New StaffDTO with updated contact info
   */
  updateContactInfo (contactUpdates) {
    const updates = {}

    if (contactUpdates.phone !== undefined) {
      updates.phone = this.sanitizePhone(contactUpdates.phone)
    }
    if (contactUpdates.email !== undefined) {
      updates.email = this.sanitizeEmail(contactUpdates.email)
    }

    return this.withUpdates(updates)
  }

  /**
   * Update staff title and role information
   * @param {Object} roleUpdates - Role updates object
   * @param {string} [roleUpdates.title] - New title
   * @param {string} [roleUpdates.ce_role] - New CE role
   * @param {string} [roleUpdates.ce_hierarchy] - New CE hierarchy
   * @returns {StaffDTO} New StaffDTO with updated role info
   */
  updateRoleInfo (roleUpdates) {
    const updates = {}

    if (roleUpdates.title !== undefined) {
      updates.title = this.sanitizeString(roleUpdates.title)
    }
    if (roleUpdates.ce_role !== undefined) {
      updates.ce_role = this.sanitizeString(roleUpdates.ce_role)
    }
    if (roleUpdates.ce_hierarchy !== undefined) {
      updates.ce_hierarchy = this.sanitizeString(roleUpdates.ce_hierarchy)
    }

    return this.withUpdates(updates)
  }

  /**
   * Update staff name information
   * @param {string} firstName - New first name
   * @param {string} lastName - New last name
   * @returns {StaffDTO} New StaffDTO with updated name
   */
  updateName (firstName, lastName) {
    const first_name = this.sanitizeString(firstName)
    const last_name = this.sanitizeString(lastName)

    if (!first_name || !last_name) {
      throw new Error('Both first and last names are required')
    }

    return this.withUpdates({
      first_name,
      last_name,
    })
  }

  /**
   * Check if staff member matches a specific title
   * @param {string} title - Title to check
   * @returns {boolean} True if staff member has this title
   */
  hasTitle (title) {
    if (!title || typeof title !== 'string') {
      return false
    }
    return this.title.toLowerCase() === title.toLowerCase()
  }

  /**
   * Check if staff member has a specific CE role
   * @param {string} ceRole - CE role to check
   * @returns {boolean} True if staff member has this CE role
   */
  hasSpecificCERole (ceRole) {
    if (!ceRole || typeof ceRole !== 'string') {
      return false
    }
    return this.ce_role.toLowerCase() === ceRole.toLowerCase()
  }

  /**
   * Static factory method to create from Firestore document
   */
  static fromFirestore (doc) {
    if (!doc.exists()) {
      throw new Error('Document does not exist')
    }

    return new StaffDTO({
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
          return StaffDTO.fromFirestore(doc)
        } catch (error) {
          console.warn(`Failed to create StaffDTO from document ${doc.id}:`, error)
          return null
        }
      })
      .filter(dto => dto !== null && dto.isValid())
  }
}
