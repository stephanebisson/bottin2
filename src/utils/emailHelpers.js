/**
 * Email Helper Utilities
 * Handles email sanitization for Firestore field names
 *
 * Firestore does not allow dots (.) in field names as they are interpreted as nested paths.
 * These utilities convert emails to/from a safe format for use as object keys.
 *
 * Strategy: Replace dots and @ symbols with unique placeholders that won't appear in emails
 * Using "__DOT__" for dots and "__AT__" for @ symbols
 */

const DOT_PLACEHOLDER = '__DOT__'
const AT_PLACEHOLDER = '__AT__'

/**
 * Sanitize an email for use as a Firestore field name
 * Replaces @ with __AT__ and dots with __DOT__ placeholders
 * Example: user@example.com → user__AT__example__DOT__com
 * @param {string} email - Email address
 * @returns {string} Sanitized email safe for Firestore field names
 */
export function sanitizeEmailForKey (email) {
  if (!email || typeof email !== 'string') {return ''}
  return email
    .replace(/@/g, AT_PLACEHOLDER)
    .replace(/\./g, DOT_PLACEHOLDER)
}

/**
 * Restore a sanitized email back to its original format
 * @param {string} sanitizedEmail - Sanitized email with __AT__ and __DOT__ placeholders
 * @returns {string} Original email address
 */
export function unsanitizeEmailKey (sanitizedEmail) {
  if (!sanitizedEmail || typeof sanitizedEmail !== 'string') {return ''}
  return sanitizedEmail
    .replace(new RegExp(DOT_PLACEHOLDER, 'g'), '.')
    .replace(new RegExp(AT_PLACEHOLDER, 'g'), '@')
}

/**
 * Sanitize an object that uses emails as keys
 * @param {Object} emailKeyedObject - Object with email addresses as keys
 * @returns {Object} Object with sanitized email keys
 */
export function sanitizeEmailKeys (emailKeyedObject) {
  if (!emailKeyedObject || typeof emailKeyedObject !== 'object') {
    return {}
  }

  const sanitized = {}
  for (const [email, value] of Object.entries(emailKeyedObject)) {
    sanitized[sanitizeEmailForKey(email)] = value
  }
  return sanitized
}

/**
 * Unsanitize an object's keys back to original emails
 * @param {Object} sanitizedObject - Object with sanitized email keys
 * @returns {Object} Object with original email keys
 */
export function unsanitizeEmailKeys (sanitizedObject) {
  if (!sanitizedObject || typeof sanitizedObject !== 'object') {
    return {}
  }

  const unsanitized = {}
  for (const [sanitizedEmail, value] of Object.entries(sanitizedObject)) {
    unsanitized[unsanitizeEmailKey(sanitizedEmail)] = value
  }
  return unsanitized
}

/**
 * Get a value from an object using an unsanitized email key
 * @param {Object} sanitizedObject - Object with sanitized email keys
 * @param {string} email - Original email address
 * @returns {*} Value associated with the email
 */
export function getByEmail (sanitizedObject, email) {
  if (!sanitizedObject || !email) {return undefined}
  return sanitizedObject[sanitizeEmailForKey(email)]
}

/**
 * Set a value in an object using an unsanitized email key
 * @param {Object} sanitizedObject - Object with sanitized email keys
 * @param {string} email - Original email address
 * @param {*} value - Value to set
 */
export function setByEmail (sanitizedObject, email, value) {
  if (!sanitizedObject || !email) {return}
  sanitizedObject[sanitizeEmailForKey(email)] = value
}
