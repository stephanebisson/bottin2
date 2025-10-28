/**
 * Committee Data Transfer Object
 * Handles data validation, transformation, and standardization for committee records
 * Members are stored in a subcollection: committees/{committeeId}/members/{memberId}
 */
export class CommitteeDTO {
  constructor (data = {}) {
    this.id = data.id || null
    this.name = this.sanitizeString(data.name)
    this.email = data.email ? this.sanitizeString(data.email).toLowerCase() : ''
    this.members = this.sanitizeMembers(data.members)

    // Metadata
    this.createdAt = data.createdAt || null
    this.updatedAt = data.updatedAt || null
    this.updatedBy = data.updatedBy || null
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
   * Sanitize members array - ensure it's always a valid array of member objects
   * Each member has: memberId (the parent/staff ID), role, member_type
   * Email is NOT stored in the member document - it comes from parent/staff lookup
   */
  sanitizeMembers (members) {
    if (!Array.isArray(members)) {
      return []
    }

    return members
      .filter(member => member && typeof member === 'object')
      .map(member => ({
        memberId: this.sanitizeString(member.memberId), // Document ID (parent/staff ID)
        role: this.sanitizeString(member.role),
        member_type: this.sanitizeString(member.member_type).toLowerCase(),
        // Email may be added later during enrichment
        email: member.email ? this.sanitizeString(member.email).toLowerCase() : null,
      }))
      .filter(member => member.memberId && member.memberId.length > 0)
  }

  /**
   * Validate required fields and data integrity
   */
  isValid () {
    return this.name.length > 0
  }

  /**
   * Get validation errors for debugging
   */
  getValidationErrors () {
    const errors = []
    if (!this.name) {
      errors.push('Committee name is required')
    }
    return errors
  }

  /**
   * Get member count
   */
  get memberCount () {
    return this.members.length
  }

  /**
   * Get parent members only
   */
  get parentMembers () {
    return this.members.filter(m => m.member_type === 'parent')
  }

  /**
   * Get staff members only
   */
  get staffMembers () {
    return this.members.filter(m => m.member_type === 'staff')
  }

  /**
   * Check if committee has mixed member types
   */
  get hasMixedMemberTypes () {
    const hasParents = this.members.some(m => m.member_type === 'parent')
    const hasStaff = this.members.some(m => m.member_type === 'staff')
    return hasParents && hasStaff
  }

  /**
   * Check if a member exists by member ID
   */
  hasMember (memberId) {
    if (!memberId || typeof memberId !== 'string') {
      return false
    }
    return this.members.some(m => m.memberId === memberId)
  }

  /**
   * Get member by member ID
   */
  getMemberById (memberId) {
    if (!memberId || typeof memberId !== 'string') {
      return null
    }
    return this.members.find(m => m.memberId === memberId) || null
  }

  /**
   * Transform data for Firestore storage (only the committee document, not members)
   * Members are stored in subcollection separately
   */
  toFirestore () {
    return {
      name: this.name,
      email: this.email,
      updatedAt: new Date(),
      createdAt: this.createdAt || new Date(),
    }
  }

  /**
   * Transform a single member for Firestore subcollection storage
   * Note: email is NOT stored in the member document - only in parent/staff collections
   */
  static memberToFirestore (member) {
    return {
      role: member.role,
      member_type: member.member_type.toLowerCase(),
    }
  }

  /**
   * Create searchable text for full-text search capabilities
   */
  getSearchableText () {
    return [
      this.name,
      ...this.members.map(m => m.email).filter(Boolean),
      ...this.members.map(m => m.role),
    ].filter(text => text && String(text).trim().length > 0).join(' ').toLowerCase()
  }

  /**
   * Create a plain object for JSON serialization (useful for APIs)
   */
  toJSON () {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      members: this.members,
      memberCount: this.memberCount,
      parentMembers: this.parentMembers,
      staffMembers: this.staffMembers,
      hasMixedMemberTypes: this.hasMixedMemberTypes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
    }
  }

  /**
   * Create a copy of this DTO with updated fields
   */
  withUpdates (updates) {
    return new CommitteeDTO({
      ...this.toJSON(),
      ...updates,
    })
  }

  /**
   * Static factory method to create from Firestore document
   * Note: This only loads the committee document, not the members subcollection
   * Use CommitteeRepository.getById() to load members
   */
  static fromFirestore (doc, members = []) {
    if (!doc.exists()) {
      throw new Error('Document does not exist')
    }

    return new CommitteeDTO({
      id: doc.id,
      ...doc.data(),
      members,
    })
  }

  /**
   * Static factory method to create from Firestore document with members
   */
  static fromFirestoreWithMembers (doc, membersSnapshot) {
    if (!doc.exists()) {
      throw new Error('Document does not exist')
    }

    const members = membersSnapshot.docs.map(memberDoc => ({
      memberId: memberDoc.id,
      ...memberDoc.data(),
    }))

    return new CommitteeDTO({
      id: doc.id,
      ...doc.data(),
      members,
    })
  }

  /**
   * Static factory method to create multiple DTOs from Firestore snapshot
   */
  static fromFirestoreSnapshot (snapshot) {
    return snapshot.docs
      .map(doc => {
        try {
          return CommitteeDTO.fromFirestore(doc)
        } catch (error) {
          console.warn(`Failed to create CommitteeDTO from document ${doc.id}:`, error)
          return null
        }
      })
      .filter(dto => dto !== null && dto.isValid())
  }
}
