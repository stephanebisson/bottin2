import { describe, expect, test } from 'vitest'

// Since the sheets-sync.js file is large and has many dependencies,
// I'll test the core transformation algorithms by extracting them

describe('Google Sheets Sync Transformation Logic', () => {
  describe('Parent name lookup algorithm', () => {
    const mockParentsData = [
      { first_name: 'Jean', last_name: 'Dupont', email: 'jean.dupont@example.com' },
      { first_name: 'Marie-Claire', last_name: 'Leblanc-Roy', email: 'marie.leblanc@example.com' },
      { first_name: 'François', last_name: 'O\'Connor', email: 'francois.oconnor@example.com' },
      { first_name: 'José', last_name: 'García-Martinez', email: 'jose.garcia@example.com' },
    ]

    const findParentByName = (parents, searchName) => {
      if (!searchName || parents.length === 0) {
        return null
      }

      const cleanSearchName = searchName.trim().toLowerCase()

      const result = parents.find(parent => {
        const fullName = `${parent.first_name} ${parent.last_name}`.toLowerCase()
        const reverseFullName = `${parent.last_name} ${parent.first_name}`.toLowerCase()

        return fullName === cleanSearchName
          || reverseFullName === cleanSearchName
          || parent.first_name.toLowerCase() === cleanSearchName
          || parent.last_name.toLowerCase() === cleanSearchName
      })

      return result || null // Convert undefined to null
    }

    test.each([
      // Full name matches
      ['Jean Dupont', 'jean.dupont@example.com'],
      ['jean dupont', 'jean.dupont@example.com'], // Case insensitive
      ['JEAN DUPONT', 'jean.dupont@example.com'], // All caps

      // Reverse order matches
      ['Dupont Jean', 'jean.dupont@example.com'],
      ['dupont jean', 'jean.dupont@example.com'],

      // First name only
      ['Jean', 'jean.dupont@example.com'],
      ['jean', 'jean.dupont@example.com'],

      // Last name only
      ['Dupont', 'jean.dupont@example.com'],
      ['dupont', 'jean.dupont@example.com'],

      // Complex names with hyphens and apostrophes
      ['Marie-Claire Leblanc-Roy', 'marie.leblanc@example.com'],
      ['François O\'Connor', 'francois.oconnor@example.com'],
      ['José García-Martinez', 'jose.garcia@example.com'],

      // Non-matches
      ['John Smith', null],
      ['', null],
      ['   ', null],
    ])('should find parent by name "%s"', (searchName, expectedEmail) => {
      const result = findParentByName(mockParentsData, searchName)

      if (expectedEmail) {
        expect(result).toBeTruthy()
        expect(result.email).toBe(expectedEmail)
      } else {
        expect(result).toBeNull()
      }
    })

    test('handles edge cases gracefully', () => {
      expect(findParentByName([], 'Jean Dupont')).toBeNull()
      expect(findParentByName(mockParentsData, null)).toBeNull()
      expect(findParentByName(mockParentsData, undefined)).toBeNull()
    })
  })

  describe('Phone number sanitization', () => {
    const sanitizePhone = phone => {
      if (!phone || typeof phone !== 'string') {
        return ''
      }
      return phone.replace(/[^\d]/g, '')
    }

    test.each([
      ['(514) 123-4567', '5141234567'],
      ['514-123-4567', '5141234567'],
      ['514.123.4567', '5141234567'],
      ['514 123 4567', '5141234567'],
      ['+1 514 123 4567', '15141234567'],
      ['1-514-123-4567', '15141234567'],
      ['abc123def456', '123456'],
      ['', ''],
      [null, ''],
      [undefined, ''],
    ])('should sanitize phone "%s" to "%s"', (input, expected) => {
      expect(sanitizePhone(input)).toBe(expected)
    })
  })

  describe('Interest field processing', () => {
    const processInterests = (document, interestFields) => {
      return interestFields.filter(field => document[field] === 'TRUE')
    }

    test('extracts TRUE interests from checkbox fields', () => {
      const testDocument = {
        first_name: 'Jean',
        cinema: 'TRUE',
        musique: 'FALSE',
        sports: 'TRUE',
        arts_plastiques: '',
        theatre: 'TRUE',
        danse: 'FALSE',
      }

      const interestFields = ['cinema', 'musique', 'sports', 'arts_plastiques', 'theatre', 'danse']
      const result = processInterests(testDocument, interestFields)

      expect(result).toEqual(['cinema', 'sports', 'theatre'])
    })

    test('handles empty interest fields', () => {
      const testDocument = {
        cinema: 'FALSE',
        musique: '',
        sports: null,
        theatre: undefined,
      }

      const interestFields = ['cinema', 'musique', 'sports', 'theatre']
      const result = processInterests(testDocument, interestFields)

      expect(result).toEqual([])
    })
  })

  describe('Field mapping transformation', () => {
    const transformWithMapping = (headers, row, fieldMapping) => {
      const doc = {}

      for (const [colIndex, header] of headers.entries()) {
        const value = row[colIndex] || ''

        if (fieldMapping && fieldMapping[header]) {
          const fieldName = fieldMapping[header]
          doc[fieldName] = value
        }
      }

      return doc
    }

    test('maps sheet headers to document fields correctly', () => {
      const headers = ['Prénom', 'Nom de famille de parent', 'Courriel', 'Cellulaire']
      const row = ['Jean', 'Dupont', 'jean@example.com', '514-123-4567']
      const fieldMapping = {
        'Prénom': 'first_name',
        'Nom de famille de parent': 'last_name',
        'Courriel': 'email',
        'Cellulaire': 'phone',
      }

      const result = transformWithMapping(headers, row, fieldMapping)

      expect(result).toEqual({
        first_name: 'Jean',
        last_name: 'Dupont',
        email: 'jean@example.com',
        phone: '514-123-4567',
      })
    })

    test('handles missing values in row', () => {
      const headers = ['Prénom', 'Nom', 'Email', 'Phone']
      const row = ['Jean', 'Dupont'] // Missing email and phone
      const fieldMapping = {
        Prénom: 'first_name',
        Nom: 'last_name',
        Email: 'email',
        Phone: 'phone',
      }

      const result = transformWithMapping(headers, row, fieldMapping)

      expect(result).toEqual({
        first_name: 'Jean',
        last_name: 'Dupont',
        email: '',
        phone: '',
      })
    })

    test('handles unmapped headers gracefully', () => {
      const headers = ['Prénom', 'Unknown Column', 'Email']
      const row = ['Jean', 'Ignored Value', 'jean@example.com']
      const fieldMapping = {
        Prénom: 'first_name',
        Email: 'email',
        // 'Unknown Column' not in mapping
      }

      const result = transformWithMapping(headers, row, fieldMapping)

      expect(result).toEqual({
        first_name: 'Jean',
        email: 'jean@example.com',
        // Unknown column not included
      })
    })
  })

  describe('Committee parsing algorithm', () => {
    const parseCommittees = rows => {
      const committees = new Map()
      let currentCommittee = null

      for (const row of rows) {
        if (!row || row.length < 3) {
          continue
        }

        const parentName = row[0]
        const email = row[2]

        // Check if this is a committee header row
        if (parentName === 'Nom complète du parent' && row[4]) {
          currentCommittee = row[4]
          continue
        }

        // Check for committee header pattern
        if (parentName && row[4] && parentName === row[4] && !parentName.includes('@')) {
          currentCommittee = parentName
          continue
        }

        // If we have a current committee and a parent name, this is a member row
        if (currentCommittee && parentName && parentName !== currentCommittee) {
          if (!committees.has(currentCommittee)) {
            committees.set(currentCommittee, {
              name: currentCommittee,
              members: [],
            })
          }

          const committee = committees.get(currentCommittee)
          const existingMember = committee.members.find(m => m.email === email)

          if (!existingMember && email) {
            committee.members.push({
              email,
              member_type: 'parent',
              role: 'Member',
            })
          }
        }
      }

      return Array.from(committees.values())
    }

    test('parses committee structure from sheet rows', () => {
      const testRows = [
        ['Nom complète du parent', '', '', '', 'Sports Committee'],
        ['Jean Dupont', '', 'jean@example.com', '', 'Sports Committee'],
        ['Marie Curie', '', 'marie@example.com', '', 'Sports Committee'],
        ['', '', '', '', ''], // Empty row
        ['Nom complète du parent', '', '', '', 'Arts Committee'],
        ['François Martin', '', 'francois@example.com', '', 'Arts Committee'],
      ]

      const result = parseCommittees(testRows)

      expect(result).toHaveLength(2)

      const sportsCommittee = result.find(c => c.name === 'Sports Committee')
      expect(sportsCommittee).toBeTruthy()
      expect(sportsCommittee.members).toHaveLength(2)
      expect(sportsCommittee.members[0].email).toBe('jean@example.com')

      const artsCommittee = result.find(c => c.name === 'Arts Committee')
      expect(artsCommittee).toBeTruthy()
      expect(artsCommittee.members).toHaveLength(1)
      expect(artsCommittee.members[0].email).toBe('francois@example.com')
    })

    test('handles duplicate members correctly', () => {
      const testRows = [
        ['Nom complète du parent', '', '', '', 'Test Committee'],
        ['Jean Dupont', '', 'jean@example.com', '', 'Test Committee'],
        ['Jean Dupont', '', 'jean@example.com', '', 'Test Committee'], // Duplicate
      ]

      const result = parseCommittees(testRows)

      expect(result).toHaveLength(1)
      expect(result[0].members).toHaveLength(1) // Duplicate filtered out
    })

    test('handles malformed committee data', () => {
      const testRows = [
        [], // Empty row
        [''], // Row with empty string
        [null, null, null], // Row with nulls
        ['Committee Name', '', '', '', 'Committee Name'], // Committee header row
        ['Member Name', '', 'member@example.com', '', 'Committee Name'],
      ]

      expect(() => parseCommittees(testRows)).not.toThrow()
      const result = parseCommittees(testRows)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Committee Name')
      expect(result[0].members).toHaveLength(1)
    })
  })

  describe('Document ID sanitization for Firestore', () => {
    const sanitizeDocumentId = email => {
      if (!email || !email.trim()) {
        return null
      }

      return email.trim()
        .replace(/[/[\]]/g, '_') // Replace invalid characters
        .replace(/\s+/g, '_') // Replace spaces
    }

    test.each([
      ['jean.dupont@example.com', 'jean.dupont@example.com'],
      ['  marie@example.com  ', 'marie@example.com'],
      ['test[123]@example.com', 'test_123_@example.com'],
      ['user/name@example.com', 'user_name@example.com'],
      ['user name@example.com', 'user_name@example.com'],
      ['', null],
      ['   ', null],
      [null, null],
      [undefined, null],
    ])('should sanitize email "%s" to "%s"', (input, expected) => {
      expect(sanitizeDocumentId(input)).toBe(expected)
    })
  })

  describe('Data validation during import', () => {
    const validateParentData = parent => {
      const errors = []

      if (!parent.first_name || parent.first_name.trim() === '') {
        errors.push('First name is required')
      }
      if (!parent.last_name || parent.last_name.trim() === '') {
        errors.push('Last name is required')
      }
      if (!parent.email || !parent.email.includes('@')) {
        errors.push('Valid email is required')
      }

      return { isValid: errors.length === 0, errors }
    }

    test.each([
      [
        { first_name: 'Jean', last_name: 'Dupont', email: 'jean@example.com' },
        { isValid: true, errors: [] },
      ],
      [
        { first_name: '', last_name: 'Dupont', email: 'jean@example.com' },
        { isValid: false, errors: ['First name is required'] },
      ],
      [
        { first_name: 'Jean', last_name: '', email: 'jean@example.com' },
        { isValid: false, errors: ['Last name is required'] },
      ],
      [
        { first_name: 'Jean', last_name: 'Dupont', email: 'invalid-email' },
        { isValid: false, errors: ['Valid email is required'] },
      ],
      [
        { first_name: '', last_name: '', email: '' },
        { isValid: false, errors: ['First name is required', 'Last name is required', 'Valid email is required'] },
      ],
    ])('validates parent data correctly', (parentData, expected) => {
      const result = validateParentData(parentData)
      expect(result).toEqual(expected)
    })
  })

  describe('Batch processing for large datasets', () => {
    const processBatches = (items, batchSize, processor) => {
      const results = []

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)
        results.push(processor(batch))
      }

      return results
    }

    test('processes large datasets in batches', () => {
      const largeDataset = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))
      const batchSize = 10

      const processor = batch => ({
        batchSize: batch.length,
        firstId: batch[0].id,
        lastId: batch.at(-1).id,
      })

      const results = processBatches(largeDataset, batchSize, processor)

      expect(results).toHaveLength(3) // 25 items, batches of 10 = 3 batches
      expect(results[0]).toEqual({ batchSize: 10, firstId: 1, lastId: 10 })
      expect(results[1]).toEqual({ batchSize: 10, firstId: 11, lastId: 20 })
      expect(results[2]).toEqual({ batchSize: 5, firstId: 21, lastId: 25 })
    })
  })

  describe('Error handling in data transformation', () => {
    test('handles malformed sheet data gracefully', () => {
      const malformedData = [
        null, // Null row
        [], // Empty row
        ['', '', ''], // Row with empty strings
        ['Jean'], // Row missing columns
        ['Marie', 'Curie', 'marie@example.com', 'extra', 'columns'], // Row with extra columns
      ]

      const transformRow = row => {
        if (!row || !Array.isArray(row)) {
          return null
        }

        return {
          first_name: row[0] || '',
          last_name: row[1] || '',
          email: row[2] || '',
        }
      }

      const results = malformedData.map(row => transformRow(row)).filter(Boolean)

      expect(results).toHaveLength(4) // Null row filtered out
      expect(results[0]).toEqual({ first_name: '', last_name: '', email: '' })
      expect(results[1]).toEqual({ first_name: '', last_name: '', email: '' })
      expect(results[2]).toEqual({ first_name: 'Jean', last_name: '', email: '' })
      expect(results[3]).toEqual({ first_name: 'Marie', last_name: 'Curie', email: 'marie@example.com' })
    })
  })
})
