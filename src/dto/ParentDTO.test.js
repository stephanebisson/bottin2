import { beforeEach, describe, expect, test } from 'vitest'
import { ParentDTO } from './ParentDTO.js'

describe('ParentDTO', () => {
  describe('constructor and data sanitization', () => {
    test.each([
      // Basic valid data
      [
        {
          first_name: 'Jean',
          last_name: 'Dupont',
          email: 'jean.dupont@example.com',
          phone: '5141234567',
          address: '123 Main St',
          city: 'Montreal',
          postal_code: 'H1A2B3',
          interests: ['sports', 'music'],
        },
        {
          first_name: 'Jean',
          last_name: 'Dupont',
          email: 'jean.dupont@example.com',
          phone: '5141234567',
          address: '123 Main St',
          city: 'Montreal',
          postal_code: 'H1A2B3',
          interests: ['sports', 'music'],
        },
      ],

      // Data requiring sanitization
      [
        {
          first_name: '  Jean  ',
          last_name: '  Dupont  ',
          email: '  JEAN.DUPONT@EXAMPLE.COM  ',
          phone: '(514) 123-4567',
          address: '  123 Main St  ',
          city: '  Montreal  ',
          postal_code: '  H1A 2B3  ',
          interests: ['  sports  ', '', 'music', '   '],
        },
        {
          first_name: 'Jean',
          last_name: 'Dupont',
          email: 'jean.dupont@example.com',
          phone: '5141234567',
          address: '123 Main St',
          city: 'Montreal',
          postal_code: 'H1A 2B3',
          interests: ['sports', 'music'], // Empty strings filtered out
        },
      ],
    ])('should sanitize input data correctly', (input, expected) => {
      const parent = new ParentDTO(input)

      for (const key of Object.keys(expected)) {
        if (Array.isArray(expected[key])) {
          expect(parent[key]).toEqual(expected[key])
        } else {
          expect(parent[key]).toBe(expected[key])
        }
      }
    })

    test('handles null/undefined values gracefully', () => {
      const parent = new ParentDTO({
        first_name: null,
        last_name: undefined,
        email: '',
        phone: null,
        interests: null,
      })

      expect(parent.first_name).toBe('')
      expect(parent.last_name).toBe('')
      expect(parent.email).toBe('')
      expect(parent.phone).toBe('')
      expect(parent.interests).toEqual([])
    })

    test('filters invalid interests', () => {
      const parent = new ParentDTO({
        interests: ['valid', '', null, undefined, 123, {}, 'another_valid'],
      })

      expect(parent.interests).toEqual(['valid', 'another_valid'])
    })
  })

  describe('sanitizePhone', () => {
    let parent

    beforeEach(() => {
      parent = new ParentDTO()
    })

    test.each([
      ['(514) 123-4567', '5141234567'],
      ['514-123-4567', '5141234567'],
      ['514.123.4567', '5141234567'],
      ['514 123 4567', '5141234567'],
      ['+1 514 123 4567', '15141234567'],
      ['abc123def456', '123456'],
      ['', ''],
      [null, ''],
      [undefined, ''],
    ])('should sanitize phone "%s" to "%s"', (input, expected) => {
      expect(parent.sanitizePhone(input)).toBe(expected)
    })
  })

  describe('sanitizeEmail', () => {
    let parent

    beforeEach(() => {
      parent = new ParentDTO()
    })

    test.each([
      ['JOHN.DOE@EXAMPLE.COM', 'john.doe@example.com'],
      ['  john.doe@example.com  ', 'john.doe@example.com'],
      ['john.doe@example.com', 'john.doe@example.com'],
      ['invalid-email', ''], // No @ symbol
      ['', ''],
      [null, ''],
      [undefined, ''],
      ['@example.com', ''], // Empty local part
      ['user@', ''], // Empty domain part
    ])('should sanitize email "%s" to "%s"', (input, expected) => {
      expect(parent.sanitizeEmail(input)).toBe(expected)
    })
  })

  describe('validation', () => {
    test.each([
      // Valid parents
      [
        { first_name: 'Jean', last_name: 'Dupont', email: 'jean@example.com' },
        true,
        [],
      ],
      [
        { first_name: 'Marie', last_name: 'Curie', email: 'marie.curie@science.org' },
        true,
        [],
      ],

      // Invalid parents - missing required fields
      [
        { first_name: '', last_name: 'Dupont', email: 'jean@example.com' },
        false,
        ['First name is required'],
      ],
      [
        { first_name: 'Jean', last_name: '', email: 'jean@example.com' },
        false,
        ['Last name is required'],
      ],
      [
        { first_name: 'Jean', last_name: 'Dupont', email: '' },
        true,
        [], // Email is optional - valid without email
      ],
      [
        { first_name: 'Jean', last_name: 'Dupont', email: 'invalid-email' },
        true,
        [], // invalid-email gets sanitized to empty string which is acceptable
      ],

      // Multiple errors
      [
        { first_name: '', last_name: '', email: '' },
        false,
        ['First name is required', 'Last name is required'],
      ],
    ])('should validate parent data', (data, isValid, expectedErrors) => {
      const parent = new ParentDTO(data)

      expect(parent.isValid()).toBe(isValid)
      expect(parent.getValidationErrors()).toEqual(expectedErrors)
    })
  })

  describe('computed properties', () => {
    test('fullName combines first and last name', () => {
      const parent = new ParentDTO({
        first_name: 'Jean-François',
        last_name: 'Dubé',
      })

      expect(parent.fullName).toBe('Jean-François Dubé')
    })

    test('fullName handles edge cases', () => {
      expect(new ParentDTO({ first_name: 'Jean', last_name: '' }).fullName).toBe('Jean')
      expect(new ParentDTO({ first_name: '', last_name: 'Dupont' }).fullName).toBe('Dupont')
      expect(new ParentDTO({ first_name: '', last_name: '' }).fullName).toBe('')
    })

    test.each([
      ['', ''],
      ['5141234567', '(514) 123-4567'],
      ['514123456', '514123456'], // Invalid length
      ['123456789012', '123456789012'], // Too long
    ])('displayPhone formats phone "%s" as "%s"', (phone, expected) => {
      const parent = new ParentDTO({ phone })
      expect(parent.displayPhone).toBe(expected)
    })

    test('fullAddress combines address components', () => {
      const testCases = [
        {
          data: { address: '123 Main St', city: 'Montreal', postal_code: 'H1A 2B3' },
          expected: '123 Main St, Montreal, H1A 2B3',
        },
        {
          data: { address: '123 Main St', city: 'Montreal' },
          expected: '123 Main St, Montreal',
        },
        {
          data: { city: 'Montreal', postal_code: 'H1A 2B3' },
          expected: 'Montreal, H1A 2B3',
        },
        {
          data: { address: '123 Main St' },
          expected: '123 Main St',
        },
        {
          data: {},
          expected: '',
        },
      ]

      for (const { data, expected } of testCases) {
        const parent = new ParentDTO(data)
        expect(parent.fullAddress).toBe(expected)
      }
    })

    test('boolean properties work correctly', () => {
      const parentWithContact = new ParentDTO({ email: 'test@example.com', phone: '1234567890' })
      expect(parentWithContact.hasContactInfo).toBe(true)

      const parentWithInterests = new ParentDTO({ interests: ['sports', 'music'] })
      expect(parentWithInterests.hasInterests).toBe(true)
      expect(parentWithInterests.interestCount).toBe(2)

      const parentWithoutContact = new ParentDTO()
      expect(parentWithoutContact.hasContactInfo).toBe(false)
      expect(parentWithoutContact.hasInterests).toBe(false)
      expect(parentWithoutContact.interestCount).toBe(0)
    })
  })

  describe('business logic methods', () => {
    let parent

    beforeEach(() => {
      parent = new ParentDTO({
        first_name: 'Jean',
        last_name: 'Dupont',
        email: 'jean@example.com',
        phone: '5141234567',
        interests: ['sports', 'music'],
      })
    })

    describe('hasInterest', () => {
      test.each([
        ['sports', true],
        ['music', true],
        ['SPORTS', true], // Case insensitive
        ['MUSIC', true],
        ['art', false],
        ['', false],
        [null, false],
        [undefined, false],
      ])('should check if parent has interest "%s": %s', (interest, expected) => {
        expect(parent.hasInterest(interest)).toBe(expected)
      })
    })

    describe('updateContactInfo', () => {
      test('updates contact fields correctly', () => {
        const updated = parent.updateContactInfo({
          phone: '(450) 555-1234',
          address: '456 Oak St',
          city: 'Laval',
        })

        expect(updated.phone).toBe('4505551234') // Sanitized
        expect(updated.address).toBe('456 Oak St')
        expect(updated.city).toBe('Laval')
        expect(updated.email).toBe('jean@example.com') // Unchanged
        expect(updated.interests).toEqual(['sports', 'music']) // Unchanged
      })

      test('creates new instance without modifying original', () => {
        const updated = parent.updateContactInfo({ phone: '4505551234' })

        expect(parent.phone).toBe('5141234567') // Original unchanged
        expect(updated.phone).toBe('4505551234') // New instance updated
        expect(updated).not.toBe(parent) // Different instances
      })
    })

    describe('interest management', () => {
      test('updateInterests replaces all interests', () => {
        const updated = parent.updateInterests(['art', 'theater', 'cooking'])

        expect(updated.interests).toEqual(['art', 'theater', 'cooking'])
        expect(parent.interests).toEqual(['sports', 'music']) // Original unchanged
      })

      test('addInterest adds new interest', () => {
        const updated = parent.addInterest('art')

        expect(updated.interests).toEqual(['sports', 'music', 'art'])
        expect(parent.interests).toEqual(['sports', 'music']) // Original unchanged
      })

      test('addInterest ignores duplicate interests', () => {
        const updated = parent.addInterest('sports') // Already exists

        expect(updated.interests).toEqual(['sports', 'music']) // No change
        expect(updated).toBe(parent) // Returns same instance when no change needed
      })

      test('addInterest handles case insensitivity', () => {
        const updated = parent.addInterest('SPORTS') // Different case

        expect(updated.interests).toEqual(['sports', 'music']) // No duplicate
        expect(updated).toBe(parent) // No change needed
      })

      test('addInterest validates input', () => {
        expect(() => parent.addInterest('')).toThrow('Interest must be a non-empty string')
        expect(() => parent.addInterest(null)).toThrow('Interest must be a non-empty string')
        expect(() => parent.addInterest(123)).toThrow('Interest must be a non-empty string')
      })

      test('removeInterest removes existing interest', () => {
        const updated = parent.removeInterest('sports')

        expect(updated.interests).toEqual(['music'])
        expect(parent.interests).toEqual(['sports', 'music']) // Original unchanged
      })

      test('removeInterest handles non-existent interest gracefully', () => {
        const updated = parent.removeInterest('art') // Doesn't exist

        expect(updated.interests).toEqual(['sports', 'music']) // No change
      })

      test('removeInterest validates input', () => {
        expect(() => parent.removeInterest('')).toThrow('Interest must be a non-empty string')
        expect(() => parent.removeInterest(null)).toThrow('Interest must be a non-empty string')
      })
    })
  })

  describe('data transformation', () => {
    let parent

    beforeEach(() => {
      parent = new ParentDTO({
        first_name: 'Jean',
        last_name: 'Dupont',
        email: 'jean@example.com',
        phone: '5141234567',
        address: '123 Main St',
        city: 'Montreal',
        postal_code: 'H1A2B3',
        interests: ['sports', 'music'],
      })
    })

    test('toFirestore creates proper Firestore document', () => {
      const firestoreDoc = parent.toFirestore()

      expect(firestoreDoc).toHaveProperty('first_name', 'Jean')
      expect(firestoreDoc).toHaveProperty('last_name', 'Dupont')
      expect(firestoreDoc).toHaveProperty('email', 'jean@example.com')
      expect(firestoreDoc).toHaveProperty('updatedAt')
      expect(firestoreDoc).toHaveProperty('createdAt')
      expect(firestoreDoc).not.toHaveProperty('id') // ID not included in Firestore doc
      expect(firestoreDoc).not.toHaveProperty('fullName') // Computed field not stored
      expect(firestoreDoc).not.toHaveProperty('searchableText') // Computed field not stored
    })

    test('getSearchableText creates searchable content', () => {
      const searchableText = parent.getSearchableText()

      expect(searchableText).toContain('jean')
      expect(searchableText).toContain('dupont')
      expect(searchableText).toContain('jean@example.com')
      expect(searchableText).toContain('5141234567')
      expect(searchableText).toContain('montreal')
      expect(searchableText).toContain('sports')
      expect(searchableText).toContain('music')
      expect(searchableText).toBe(searchableText.toLowerCase()) // All lowercase
    })

    test('toJSON creates complete serializable object', () => {
      parent.id = 'test-id'
      const json = parent.toJSON()

      expect(json).toHaveProperty('id', 'test-id')
      expect(json).toHaveProperty('fullName', 'Jean Dupont')
      expect(json).toHaveProperty('displayPhone', '(514) 123-4567')
      expect(json).toHaveProperty('fullAddress', '123 Main St, Montreal, H1A2B3')
      expect(json).toHaveProperty('hasContactInfo', true)
      expect(json).toHaveProperty('hasInterests', true)
      expect(json).toHaveProperty('interestCount', 2)
    })
  })

  describe('static factory methods', () => {
    test('fromFirestore creates DTO from Firestore document', () => {
      const mockDoc = {
        id: 'jean@example.com',
        exists: () => true,
        data: () => ({
          first_name: 'Jean',
          last_name: 'Dupont',
          email: 'jean@example.com',
          interests: ['sports'],
        }),
      }

      const parent = ParentDTO.fromFirestore(mockDoc)

      expect(parent.id).toBe('jean@example.com')
      expect(parent.first_name).toBe('Jean')
      expect(parent.last_name).toBe('Dupont')
      expect(parent.interests).toEqual(['sports'])
    })

    test('fromFirestore throws error for non-existent document', () => {
      const mockDoc = {
        exists: () => false,
      }

      expect(() => ParentDTO.fromFirestore(mockDoc)).toThrow('Document does not exist')
    })

    test('fromFirestoreSnapshot creates DTOs from query snapshot', () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'jean@example.com',
            exists: () => true,
            data: () => ({ first_name: 'Jean', last_name: 'Dupont', email: 'jean@example.com' }),
          },
          {
            id: 'marie@example.com',
            exists: () => true,
            data: () => ({ first_name: 'Marie', last_name: 'Curie', email: 'marie@example.com' }),
          },
          {
            id: 'invalid',
            exists: () => true,
            data: () => ({ first_name: '', last_name: '', email: '' }), // Invalid - will be filtered out
          },
        ],
      }

      const parents = ParentDTO.fromFirestoreSnapshot(mockSnapshot)

      expect(parents).toHaveLength(2) // Invalid one filtered out
      expect(parents[0].first_name).toBe('Jean')
      expect(parents[1].first_name).toBe('Marie')
    })
  })
})
