/**
 * Phone Number Formatting Utilities
 *
 * Handles conversion of various phone number formats to the required 10-digit format
 * and provides user-friendly display formatting.
 */

/**
 * Extracts only digits from a phone number string
 * @param {string} phone - Phone number in any format
 * @returns {string} Only the digits
 */
export function extractDigits (phone) {
  if (!phone || typeof phone !== 'string') {
    return ''
  }
  return phone.replace(/\D/g, '')
}

/**
 * Formats phone number to 10 digits for backend storage
 * Handles various input formats:
 * - (123) 456-7890
 * - 123-456-7890
 * - 123.456.7890
 * - 123 456 7890
 * - 1234567890
 * - +1 123 456 7890
 * - 1-123-456-7890
 *
 * @param {string} phone - Phone number in any format
 * @returns {string} 10-digit phone number or empty string if invalid
 */
export function formatPhoneForStorage (phone) {
  const digits = extractDigits(phone)

  // Handle empty input
  if (!digits) {
    return ''
  }

  // Handle North American numbers with country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1) // Remove leading 1
  }

  // Handle 10-digit numbers
  if (digits.length === 10) {
    return digits
  }

  // Invalid length - return original for user to see error
  return digits
}

/**
 * Formats 10-digit phone number for display (readable format)
 * @param {string} phone - 10-digit phone number
 * @returns {string} Formatted as (123) 456-7890 or original if invalid
 */
export function formatPhoneForDisplay (phone) {
  const digits = extractDigits(phone)

  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  return phone // Return original if not 10 digits
}

/**
 * Validates if a phone number will be accepted by the backend
 * @param {string} phone - Phone number in any format
 * @returns {boolean} True if will be valid after formatting
 */
export function isValidPhoneFormat (phone) {
  if (!phone) {
    return true
  } // Empty is allowed

  const formatted = formatPhoneForStorage(phone)
  return formatted.length === 10
}

/**
 * Gets user-friendly validation message for phone format
 * @param {string} phone - Phone number that failed validation
 * @param {Function} t - Translation function from i18n
 * @returns {string} User-friendly error message
 */
export function getPhoneValidationMessage (phone, t) {
  const digits = extractDigits(phone)

  if (!phone) {
    return t('validation.phone.optional')
  }

  if (digits.length === 0) {
    return t('validation.phone.invalid')
  }

  if (digits.length < 10) {
    return t('validation.phone.tooShort', { digits: digits.length })
  }

  if (digits.length > 11) {
    return t('validation.phone.tooLong', { digits: digits.length })
  }

  if (digits.length === 11 && !digits.startsWith('1')) {
    return t('validation.phone.elevenDigitsMustStartWith1')
  }

  return t('validation.phone.valid')
}

/**
 * Real-time phone formatting for input fields
 * Formats as user types, maintaining cursor position
 * @param {string} input - Current input value
 * @param {number} cursorPos - Current cursor position
 * @returns {object} { value: formatted value, cursorPos: new cursor position }
 */
export function formatPhoneInput (input, cursorPos = 0) {
  const digits = extractDigits(input)

  // Don't format if too many digits
  if (digits.length > 10) {
    return { value: input, cursorPos }
  }

  let formatted = ''
  let newCursorPos = cursorPos

  if (digits.length === 0) {
    return { value: '', cursorPos: 0 }
  }

  // Format as (123) 456-7890 while typing
  if (digits.length > 0) {
    formatted = '('
    if (digits.length >= 3) {
      formatted += digits.slice(0, 3) + ') '
      if (digits.length >= 6) {
        formatted += digits.slice(3, 6) + '-'
        formatted += digits.length >= 10 ? digits.slice(6, 10) : digits.slice(6)
      } else {
        formatted += digits.slice(3)
      }
    } else {
      formatted += digits
    }
  }

  // Adjust cursor position based on added formatting characters
  const originalDigitsBefore = extractDigits(input.slice(0, Math.max(0, cursorPos))).length
  let newDigitsBefore = 0
  let i = 0

  while (i < formatted.length && newDigitsBefore < originalDigitsBefore) {
    if (/\d/.test(formatted[i])) {
      newDigitsBefore++
    }
    i++
  }

  newCursorPos = i

  return { value: formatted, cursorPos: newCursorPos }
}

/**
 * Vue composable for phone formatting
 * @param {Ref} phoneRef - Vue ref containing the phone value
 * @param {Function} t - Translation function from i18n
 * @returns {object} Reactive phone formatting utilities
 */
export function usePhoneFormatter (phoneRef, t) {
  const formatForDisplay = () => {
    if (phoneRef.value) {
      phoneRef.value = formatPhoneForDisplay(phoneRef.value)
    }
  }

  const formatForStorage = () => {
    if (phoneRef.value) {
      phoneRef.value = formatPhoneForStorage(phoneRef.value)
    }
  }

  const isValid = computed(() => {
    return isValidPhoneFormat(phoneRef.value)
  })

  const validationMessage = computed(() => {
    return getPhoneValidationMessage(phoneRef.value, t)
  })

  return {
    formatForDisplay,
    formatForStorage,
    isValid,
    validationMessage,
  }
}
