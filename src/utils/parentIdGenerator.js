/**
 * Browser-compatible ID Generator for Parents, Students, and Staff
 * Generates structured IDs in format: FirstName_LastName_ABC123
 */

/**
 * Sanitize name to keep only a-zA-Z characters
 * Removes spaces, punctuation, accented characters, etc.
 * @param {string} name - Name to sanitize
 * @returns {string} Sanitized name
 */
export function sanitizeName (name) {
  if (!name || typeof name !== 'string') {
    return ''
  }

  // Normalize to decompose accented characters (é → e + accent mark)
  const normalized = name.normalize('NFD')

  // Remove accent marks (Unicode combining diacritical marks)
  const withoutAccents = normalized.replace(/[\u0300-\u036F]/g, '')

  // Keep only a-zA-Z
  const cleaned = withoutAccents.replace(/[^a-zA-Z]/g, '')

  return cleaned
}

/**
 * Generate random alphanumeric string using Web Crypto API
 * @param {number} length - Length of the random string (default: 6)
 * @returns {string} Random alphanumeric string
 */
export function generateRandomSuffix (length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const randomValues = new Uint8Array(length)

  // Use Web Crypto API for browser compatibility
  crypto.getRandomValues(randomValues)

  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length]
  }

  return result
}

/**
 * Generate structured parent ID
 * Format: FirstName_LastName_ABC123
 * @param {Object} parent - Parent object with first_name and last_name
 * @returns {string} Generated parent ID
 * @throws {Error} If parent name is invalid
 */
export function generateParentId (parent) {
  const firstName = sanitizeName(parent.first_name)
  const lastName = sanitizeName(parent.last_name)
  const suffix = generateRandomSuffix(6)

  if (!firstName || !lastName) {
    throw new Error(`Cannot generate ID for parent with invalid name: ${JSON.stringify(parent)}`)
  }

  return `${firstName}_${lastName}_${suffix}`
}

/**
 * Generate structured student ID
 * Format: firstname_lastname_ABC123 (lowercase)
 * @param {Object} student - Student object with first_name and last_name
 * @returns {string} Generated student ID
 * @throws {Error} If student name is invalid
 */
export function generateStudentId (student) {
  const firstName = sanitizeName(student.first_name)
  const lastName = sanitizeName(student.last_name)
  const suffix = generateRandomSuffix(6)

  if (!firstName || !lastName) {
    throw new Error(`Cannot generate ID for student with invalid name: ${JSON.stringify(student)}`)
  }

  // Use lowercase for student IDs
  return `${firstName}_${lastName}_${suffix}`.toLowerCase()
}

/**
 * Generate structured staff ID
 * Format: firstname_lastname_ABC123 or firstname_ABC123 or lastname_ABC123 (lowercase)
 * Supports partial names (first name only or last name only)
 * @param {Object} staff - Staff object with first_name and/or last_name
 * @returns {string} Generated staff ID
 * @throws {Error} If staff has no valid name
 */
export function generateStaffId (staff) {
  const firstName = sanitizeName(staff.first_name)
  const lastName = sanitizeName(staff.last_name)
  const suffix = generateRandomSuffix(6)

  // At least one name part must exist
  if (!firstName && !lastName) {
    throw new Error(`Cannot generate ID for staff with no valid name: ${JSON.stringify(staff)}`)
  }

  // Build ID based on available name parts
  const idParts = []
  if (firstName) {
    idParts.push(firstName)
  }
  if (lastName) {
    idParts.push(lastName)
  }
  idParts.push(suffix)

  // Use lowercase for staff IDs
  return idParts.join('_').toLowerCase()
}
