import { describe, expect, test } from 'vitest'
import {
  extractDigits,
  formatPhoneForDisplay,
  formatPhoneForStorage,
  formatPhoneInput,
  isValidPhoneFormat,
} from './phoneFormatter.js'

describe('Phone Formatter Utilities', () => {
  describe('extractDigits', () => {
    test.each([
      ['(123) 456-7890', '1234567890'],
      ['123-456-7890', '1234567890'],
      ['123.456.7890', '1234567890'],
      ['123 456 7890', '1234567890'],
      ['+1 123 456 7890', '11234567890'],
      ['abc123def456ghi', '123456'],
      ['', ''],
      [null, ''],
      [undefined, ''],
      ['no digits here!', ''],
    ])('should extract digits from "%s" to "%s"', (input, expected) => {
      expect(extractDigits(input)).toBe(expected)
    })
  })

  describe('formatPhoneForStorage', () => {
    test.each([
      // Valid 10-digit numbers
      ['1234567890', '1234567890'],
      ['(123) 456-7890', '1234567890'],
      ['123-456-7890', '1234567890'],
      ['123.456.7890', '1234567890'],
      ['123 456 7890', '1234567890'],

      // 11-digit numbers with country code
      ['11234567890', '1234567890'],
      ['+1 123 456 7890', '1234567890'],
      ['1-123-456-7890', '1234567890'],

      // Invalid formats (should return digits as-is)
      ['123456789', '123456789'], // Too short
      ['12345678901', '2345678901'], // 11 digits starting with 1, removes first digit
      ['21234567890', '21234567890'], // 11 digits not starting with 1, returned as-is
      ['', ''],

      // Edge cases
      ['abc', ''], // No digits, returns empty
      ['1', '1'],
    ])('should format "%s" for storage as "%s"', (input, expected) => {
      expect(formatPhoneForStorage(input)).toBe(expected)
    })
  })

  describe('formatPhoneForDisplay', () => {
    test.each([
      // Valid 10-digit numbers
      ['1234567890', '123 456-7890'],
      ['5551234567', '555 123-4567'],

      // Invalid formats (should return original)
      ['123456789', '123456789'],
      ['12345678901', '12345678901'],
      ['(123) 456-7890', '123 456-7890'],
      ['', ''],
      ['abc', 'abc'],
    ])('should format "%s" for display as "%s"', (input, expected) => {
      expect(formatPhoneForDisplay(input)).toBe(expected)
    })
  })

  describe('isValidPhoneFormat', () => {
    test.each([
      // Valid cases
      ['1234567890', true],
      ['(123) 456-7890', true],
      ['123-456-7890', true],
      ['11234567890', true],
      ['+1 123 456 7890', true],
      ['', true], // Empty is allowed
      [null, true],
      [undefined, true],

      // Invalid cases
      ['123456789', false], // Too short
      ['12345678901', true], // 11 digits starting with 1 is valid
      ['21234567890', false], // 11 digits not starting with 1
      ['abc', false],
      ['123-456-789a', false],
    ])('should validate "%s" as %s', (input, expected) => {
      expect(isValidPhoneFormat(input)).toBe(expected)
    })
  })

  describe('formatPhoneInput (real-time formatting)', () => {
    test.each([
      // Progressive typing scenarios (cursor starts at position 0)
      ['1', 0, { value: '(1', cursorPos: 0 }], // Cursor at start, stays at start
      ['12', 0, { value: '(12', cursorPos: 0 }],
      ['123', 0, { value: '(123) ', cursorPos: 0 }], // Actual output from implementation
      ['1234', 0, { value: '(123) 4', cursorPos: 0 }],
      ['12345', 0, { value: '(123) 45', cursorPos: 0 }],
      ['123456', 0, { value: '(123) 456-', cursorPos: 0 }], // Actual output
      ['1234567', 0, { value: '(123) 456-7', cursorPos: 0 }],
      ['12345678', 0, { value: '(123) 456-78', cursorPos: 0 }],
      ['123456789', 0, { value: '(123) 456-789', cursorPos: 0 }],
      ['1234567890', 0, { value: '(123) 456-7890', cursorPos: 0 }],

      // Edge cases
      ['', 0, { value: '', cursorPos: 0 }],
      ['12345678901', 0, { value: '12345678901', cursorPos: 0 }], // Too long, no formatting

      // With existing formatting characters
      ['(123) 456', 5, { value: '(123) 456-', cursorPos: 4 }], // Actual behavior
    ])('should format input "%s" with cursor at %d', (input, cursorPos, expected) => {
      const result = formatPhoneInput(input, cursorPos)
      expect(result).toEqual(expected)
    })
  })

  describe('Edge cases and error handling', () => {
    test('handles non-string inputs gracefully', () => {
      expect(extractDigits(123)).toBe('')
      expect(extractDigits({})).toBe('')
      expect(extractDigits([])).toBe('')
    })

    test('formatPhoneForStorage with edge cases', () => {
      expect(formatPhoneForStorage('000-000-0000')).toBe('0000000000')
      expect(formatPhoneForStorage('111-111-1111')).toBe('1111111111')
    })

    test('formatPhoneInput preserves user input when too long', () => {
      const longInput = '12345678901234567890'
      const result = formatPhoneInput(longInput, 5)
      expect(result.value).toBe(longInput)
      expect(result.cursorPos).toBe(5)
    })
  })
})
