import { describe, expect, test } from 'vitest'
import {
  extractAlphanumeric,
  formatPostalCodeForDisplay,
  formatPostalCodeForStorage,
  formatPostalCodeInput,
  getSamplePostalCode,
  isPostalCodeFormatValid,
  isValidPostalCodeFormat,
  SAMPLE_POSTAL_CODES,
} from './postalCodeFormatter.js'

describe('Postal Code Formatter Utilities', () => {
  describe('extractAlphanumeric', () => {
    test.each([
      ['H1A 2B3', 'H1A2B3'],
      ['h1a 2b3', 'H1A2B3'], // Uppercase conversion
      ['H1A-2B3', 'H1A2B3'],
      ['H1A.2B3', 'H1A2B3'],
      ['(H1A) 2B3', 'H1A2B3'],
      ['H1A  2B3', 'H1A2B3'], // Multiple spaces
      ['', ''],
      [null, ''],
      [undefined, ''],
      ['!@#$%', ''],
    ])('should extract alphanumeric from "%s" to "%s"', (input, expected) => {
      expect(extractAlphanumeric(input)).toBe(expected)
    })
  })

  describe('formatPostalCodeForStorage', () => {
    test.each([
      // Valid Canadian postal codes
      ['H1A 2B3', 'H1A2B3'],
      ['h1a 2b3', 'H1A2B3'],
      ['H1A-2B3', 'H1A2B3'],
      ['H1A.2B3', 'H1A2B3'],
      ['(H1A) 2B3', 'H1A2B3'],
      ['M5V3A8', 'M5V3A8'],
      ['V6B2W9', 'V6B2W9'],
      ['T2P2M5', 'T2P2M5'],
      ['K1A0A6', 'K1A0A6'],

      // Invalid formats (returned as-is for validation error display)
      ['H1A2B', 'H1A2B'], // Too short
      ['H1A2B34', 'H1A2B34'], // Too long
      ['H1A2B4', 'H1A2B4'], // Invalid pattern (ends with digit, should be letter)
      ['1A12B3', '1A12B3'], // Invalid pattern (starts with digit)
      ['H1B2B3', 'H1B2B3'], // Invalid pattern (B in second position, should be digit)
      ['', ''],
      ['ABC', 'ABC'], // Too short
    ])('should format "%s" for storage as "%s"', (input, expected) => {
      expect(formatPostalCodeForStorage(input)).toBe(expected)
    })
  })

  describe('formatPostalCodeForDisplay', () => {
    test.each([
      // Valid codes get formatted with space
      ['H1A2B3', 'H1A 2B3'],
      ['M5V3A8', 'M5V 3A8'],
      ['V6B2W9', 'V6B 2W9'],
      ['h1a2b3', 'H1A 2B3'], // Uppercase conversion

      // Invalid codes returned as-is
      ['H1A 2B3', 'H1A 2B3'], // Already formatted
      ['H1A2B', 'H1A2B'], // Too short
      ['H1A2B34', 'H1A2B34'], // Too long
      ['1A12B3', '1A12B3'], // Invalid pattern
      ['', ''],
    ])('should format "%s" for display as "%s"', (input, expected) => {
      expect(formatPostalCodeForDisplay(input)).toBe(expected)
    })
  })

  describe('isValidPostalCodeFormat', () => {
    test.each([
      // Valid Canadian postal codes
      ['H1A2B3', true],
      ['H1A 2B3', true],
      ['h1a 2b3', true],
      ['M5V3A8', true],
      ['V6B2W9', true],
      ['T2P2M5', true],
      ['K1A0A6', true],
      ['S7N2R4', true],
      ['R3C4A5', true],
      ['B3H4R2', true],
      ['', true], // Empty is allowed
      [null, true],
      [undefined, true],

      // Invalid formats
      ['H1A2B', false], // Too short
      ['H1A2B34', false], // Too long
      ['1A12B3', false], // Starts with digit
      ['H1234A', false], // Wrong pattern - too many consecutive digits
      ['ABC123', false], // All letters then all digits
      ['123ABC', false], // All digits then all letters
      ['ABCDEF', false], // All letters
      ['123456', false], // All digits
    ])('should validate "%s" as %s', (input, expected) => {
      expect(isValidPostalCodeFormat(input)).toBe(expected)
    })
  })

  describe('formatPostalCodeInput (real-time formatting)', () => {
    test.each([
      // Progressive typing (cursor at position 0 stays at 0)
      ['H', 0, { value: 'H', cursorPos: 0 }],
      ['H1', 0, { value: 'H1', cursorPos: 0 }],
      ['H1A', 0, { value: 'H1A', cursorPos: 0 }],
      ['H1A2', 0, { value: 'H1A 2', cursorPos: 0 }], // Space added but cursor at start
      ['H1A2B', 0, { value: 'H1A 2B', cursorPos: 0 }],
      ['H1A2B3', 0, { value: 'H1A 2B3', cursorPos: 0 }],

      // Edge cases
      ['', 0, { value: '', cursorPos: 0 }],
      ['H1A2B34', 0, { value: 'H1A2B34', cursorPos: 0 }], // Too long, no formatting

      // With existing formatting
      ['H1A 2B', 4, { value: 'H1A 2B', cursorPos: 3 }], // Actual cursor behavior
    ])('should format input "%s" with cursor at %d', (input, cursorPos, expected) => {
      const result = formatPostalCodeInput(input, cursorPos)
      expect(result).toEqual(expected)
    })
  })

  describe('isPostalCodeFormatValid (real-time validation)', () => {
    test.each([
      // Valid complete and partial entries
      ['', true], // Empty allowed
      ['H', true], // Valid start
      ['H1', true], // Valid partial
      ['H1A', true], // Valid partial
      ['H1A2', true], // Valid partial
      ['H1A2B', true], // Valid partial
      ['H1A2B3', true], // Complete valid

      // Invalid patterns
      ['1', false], // Can't start with digit
      ['HH', false], // Second char must be digit
      ['H12', false], // Third char must be letter
    ])('should validate partial input "%s" as %s', (input, expected) => {
      expect(isPostalCodeFormatValid(input)).toBe(expected)
    })
  })

  describe('getSamplePostalCode', () => {
    test('returns a valid sample postal code', () => {
      const sample = getSamplePostalCode()
      expect(SAMPLE_POSTAL_CODES).toContain(sample)
      expect(sample).toMatch(/^[A-Z]\d[A-Z] \d[A-Z]\d$/) // A9A 9A9 pattern
    })

    test('returns different samples on multiple calls (probabilistic)', () => {
      const samples = new Set()
      // Generate 20 samples, should get some variety
      for (let i = 0; i < 20; i++) {
        samples.add(getSamplePostalCode())
      }
      // With 8 possible values and 20 calls, very likely to get more than 1 unique value
      expect(samples.size).toBeGreaterThan(1)
    })
  })

  describe('SAMPLE_POSTAL_CODES constant', () => {
    test('contains valid Canadian postal codes', () => {
      expect(SAMPLE_POSTAL_CODES).toHaveLength(8)

      for (const code of SAMPLE_POSTAL_CODES) {
        expect(code).toMatch(/^[A-Z]\d[A-Z] \d[A-Z]\d$/)
        expect(isValidPostalCodeFormat(code)).toBe(true)
      }
    })

    test('includes major Canadian cities', () => {
      expect(SAMPLE_POSTAL_CODES).toContain('H1A 2B3') // Montreal
      expect(SAMPLE_POSTAL_CODES).toContain('M5V 3A8') // Toronto
      expect(SAMPLE_POSTAL_CODES).toContain('V6B 2W9') // Vancouver
      expect(SAMPLE_POSTAL_CODES).toContain('K1A 0A6') // Ottawa
    })
  })

  describe('Edge cases and error handling', () => {
    test('handles non-string inputs gracefully', () => {
      expect(extractAlphanumeric(123)).toBe('')
      expect(extractAlphanumeric({})).toBe('')
      expect(extractAlphanumeric([])).toBe('')
    })

    test('handles special characters correctly', () => {
      expect(extractAlphanumeric('H1A@#$2B3!*')).toBe('H1A2B3')
    })

    test('formatPostalCodeInput preserves cursor position correctly', () => {
      // Test cursor position after space insertion
      const result = formatPostalCodeInput('H1A2', 4)
      expect(result.value).toBe('H1A 2')
      expect(result.cursorPos).toBe(5) // Cursor moves after inserted space
    })
  })
})
