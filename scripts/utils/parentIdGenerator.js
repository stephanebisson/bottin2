import crypto from 'node:crypto'

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
  const withoutAccents = normalized.replace(/[\u0300-\u036f]/g, '')

  // Keep only a-zA-Z
  const cleaned = withoutAccents.replace(/[^a-zA-Z]/g, '')

  return cleaned
}

/**
 * Generate random alphanumeric string
 * @param {number} length - Length of the random string (default: 6)
 * @returns {string} Random alphanumeric string
 */
export function generateRandomSuffix (length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = crypto.randomBytes(length)
  let result = ''

  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length]
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
