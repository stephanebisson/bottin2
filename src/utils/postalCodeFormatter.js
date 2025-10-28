/**
 * Canadian Postal Code Formatting Utilities
 *
 * Handles conversion of various Canadian postal code formats to the standard A9A9A9 format
 * and provides user-friendly display formatting and validation.
 */

/**
 * Extracts alphanumeric characters from a postal code string
 * @param {string} postalCode - Postal code in any format
 * @returns {string} Only letters and digits, uppercased
 */
export function extractAlphanumeric (postalCode) {
  if (!postalCode || typeof postalCode !== 'string') {
    return ''
  }
  return postalCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

/**
 * Formats postal code to A9A9A9 format for backend storage
 * Handles various input formats:
 * - H1A 2B3
 * - H1A2B3
 * - h1a 2b3 (lowercase)
 * - H1A-2B3
 * - H1A.2B3
 * - (H1A) 2B3
 *
 * @param {string} postalCode - Postal code in any format
 * @returns {string} 6-character postal code in A9A9A9 format or empty string if invalid
 */
export function formatPostalCodeForStorage (postalCode) {
  const alphanumeric = extractAlphanumeric(postalCode)

  // Handle empty input
  if (!alphanumeric) {
    return ''
  }

  // Must be exactly 6 characters
  if (alphanumeric.length !== 6) {
    return alphanumeric // Return as-is for user to see validation error
  }

  // Validate Canadian postal code pattern (A9A9A9)
  const canadianPattern = /^[A-Z]\d[A-Z]\d[A-Z]\d$/
  if (!canadianPattern.test(alphanumeric)) {
    return alphanumeric // Return as-is for user to see validation error
  }

  return alphanumeric
}

/**
 * Formats postal code for display with space (A9A 9A9)
 * @param {string} postalCode - 6-character postal code
 * @returns {string} Formatted as H1A 2B3 or original if invalid
 */
export function formatPostalCodeForDisplay (postalCode) {
  const alphanumeric = extractAlphanumeric(postalCode)

  if (alphanumeric.length === 6) {
    const canadianPattern = /^[A-Z]\d[A-Z]\d[A-Z]\d$/
    if (canadianPattern.test(alphanumeric)) {
      return `${alphanumeric.slice(0, 3)} ${alphanumeric.slice(3)}`
    }
  }

  return postalCode // Return original if not valid 6-character Canadian postal code
}

/**
 * Validates if a postal code will be accepted by the backend
 * @param {string} postalCode - Postal code in any format
 * @returns {boolean} True if will be valid after formatting
 */
export function isValidPostalCodeFormat (postalCode) {
  if (!postalCode) {
    return true
  } // Empty is allowed

  const formatted = formatPostalCodeForStorage(postalCode)
  const canadianPattern = /^[A-Z]\d[A-Z]\d[A-Z]\d$/
  return formatted.length === 6 && canadianPattern.test(formatted)
}

/**
 * Gets user-friendly validation message for postal code format
 * @param {string} postalCode - Postal code that failed validation
 * @param {Function} t - Translation function from i18n
 * @returns {string} User-friendly error message
 */
export function getPostalCodeValidationMessage (postalCode, t) {
  const alphanumeric = extractAlphanumeric(postalCode)

  if (!postalCode) {
    return t('validation.postalCode.optional')
  }

  if (alphanumeric.length === 0) {
    return t('validation.postalCode.invalid')
  }

  if (alphanumeric.length < 6) {
    return t('validation.postalCode.tooShort', { chars: alphanumeric.length })
  }

  if (alphanumeric.length > 6) {
    return t('validation.postalCode.tooLong', { chars: alphanumeric.length })
  }

  // Check pattern
  const canadianPattern = /^[A-Z]\d[A-Z]\d[A-Z]\d$/
  if (!canadianPattern.test(alphanumeric)) {
    return t('validation.postalCode.invalidPattern')
  }

  return t('validation.postalCode.valid')
}

/**
 * Real-time postal code formatting for input fields
 * Formats as user types, maintaining cursor position
 * @param {string} input - Current input value
 * @param {number} cursorPos - Current cursor position
 * @returns {object} { value: formatted value, cursorPos: new cursor position }
 */
export function formatPostalCodeInput (input, cursorPos = 0) {
  const alphanumeric = extractAlphanumeric(input)

  // Don't format if too many characters
  if (alphanumeric.length > 6) {
    return { value: input, cursorPos }
  }

  let formatted = ''
  let newCursorPos = cursorPos

  if (alphanumeric.length === 0) {
    return { value: '', cursorPos: 0 }
  }

  // Format as A9A 9A9 while typing
  if (alphanumeric.length > 0) {
    formatted = alphanumeric.length <= 3 ? alphanumeric : `${alphanumeric.slice(0, 3)} ${alphanumeric.slice(3)}`
  }

  // Adjust cursor position based on added formatting characters
  const originalAlphanumericBefore = extractAlphanumeric(input.slice(0, Math.max(0, cursorPos))).length
  let newAlphanumericBefore = 0
  let i = 0

  while (i < formatted.length && newAlphanumericBefore < originalAlphanumericBefore) {
    if (/[A-Z0-9]/.test(formatted[i])) {
      newAlphanumericBefore++
    }
    i++
  }

  newCursorPos = i

  return { value: formatted, cursorPos: newCursorPos }
}

/**
 * List of common Canadian postal code areas for validation examples
 */
export const SAMPLE_POSTAL_CODES = [
  'H1A 2B3', // Montreal
  'M5V 3A8', // Toronto
  'V6B 2W9', // Vancouver
  'T2P 2M5', // Calgary
  'K1A 0A6', // Ottawa
  'S7N 2R4', // Saskatoon
  'R3C 4A5', // Winnipeg
  'B3H 4R2', // Halifax
]

/**
 * Gets a random sample postal code for placeholder text
 * @returns {string} Sample Canadian postal code
 */
export function getSamplePostalCode () {
  return SAMPLE_POSTAL_CODES[Math.floor(Math.random() * SAMPLE_POSTAL_CODES.length)]
}

/**
 * Validates postal code format in real-time (less strict for better UX)
 * @param {string} postalCode - Postal code being typed
 * @returns {boolean} True if format is valid or potentially valid
 */
export function isPostalCodeFormatValid (postalCode) {
  if (!postalCode) {
    return true
  } // Empty is valid

  const alphanumeric = extractAlphanumeric(postalCode)

  // Allow partial entry while typing
  if (alphanumeric.length < 6) {
    // Check if what's entered so far follows the pattern
    const partialPattern = /^([A-Z](\d([A-Z](\d([A-Z](\d)?)?)?)?)?)?$/
    return partialPattern.test(alphanumeric)
  }

  // Full validation for 6 characters
  return isValidPostalCodeFormat(postalCode)
}

/**
 * Vue composable for postal code formatting
 * @param {Ref} postalCodeRef - Vue ref containing the postal code value
 * @param {Function} t - Translation function from i18n
 * @returns {object} Reactive postal code formatting utilities
 */
export function usePostalCodeFormatter (postalCodeRef, t) {
  const formatForDisplay = () => {
    if (postalCodeRef.value) {
      postalCodeRef.value = formatPostalCodeForDisplay(postalCodeRef.value)
    }
  }

  const formatForStorage = () => {
    if (postalCodeRef.value) {
      postalCodeRef.value = formatPostalCodeForStorage(postalCodeRef.value)
    }
  }

  const isValid = computed(() => {
    return isValidPostalCodeFormat(postalCodeRef.value)
  })

  const validationMessage = computed(() => {
    return getPostalCodeValidationMessage(postalCodeRef.value, t)
  })

  return {
    formatForDisplay,
    formatForStorage,
    isValid,
    validationMessage,
  }
}
