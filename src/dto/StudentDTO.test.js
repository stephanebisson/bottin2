import { beforeEach, describe, expect, test, vi } from 'vitest'
import { StudentDTO } from './StudentDTO.js'

describe('StudentDTO', () => {
  describe('constructor and data sanitization', () => {
    test.each([
      // Basic valid data
      [
        {
          first_name: 'Marie',
          last_name: 'Dupont',
          className: '3A',
          level: 3,
          parent1_email: 'parent1@example.com',
          parent2_email: 'parent2@example.com',
        },
        {
          first_name: 'Marie',
          last_name: 'Dupont',
          className: '3A',
          level: 3,
          parent1_email: 'parent1@example.com',
          parent2_email: 'parent2@example.com',
        },
      ],

      // Data requiring sanitization
      [
        {
          first_name: '  Marie  ',
          last_name: '  Dupont  ',
          className: '  3A  ',
          level: '3',
          parent1_email: '  PARENT1@EXAMPLE.COM  ',
          parent2_email: '  PARENT2@EXAMPLE.COM  ',
        },
        {
          first_name: 'Marie',
          last_name: 'Dupont',
          className: '3A',
          level: 3,
          parent1_email: 'parent1@example.com',
          parent2_email: 'parent2@example.com',
        },
      ],
    ])('should sanitize input data correctly', (input, expected) => {
      const student = new StudentDTO(input)

      for (const key of Object.keys(expected)) {
        expect(student[key]).toEqual(expected[key])
      }
    })

    test('handles null/undefined values gracefully', () => {
      const student = new StudentDTO({
        first_name: null,
        last_name: undefined,
        className: '',
        level: null,
        parent1_email: null,
        parent2_email: undefined,
      })

      expect(student.first_name).toBe('')
      expect(student.last_name).toBe('')
      expect(student.className).toBe('')
      expect(student.level).toBe(null)
      expect(student.parent1_email).toBe(null)
      expect(student.parent2_email).toBe(null)
    })
  })

  describe('sanitizeNumber', () => {
    let student

    beforeEach(() => {
      student = new StudentDTO()
    })

    test.each([
      [3, 3],
      ['3', 3],
      ['3.5', 3.5],
      [0, 0],
      [null, null],
      [undefined, null],
      ['', null],
      ['abc', null],
      ['3abc', null], // Invalid number
      [Number.NaN, null],
    ])('should sanitize number "%s" to %s', (input, expected) => {
      expect(student.sanitizeNumber(input)).toBe(expected)
    })
  })

  describe('sanitizeEmail', () => {
    let student

    beforeEach(() => {
      student = new StudentDTO()
    })

    test.each([
      ['PARENT@EXAMPLE.COM', 'parent@example.com'],
      ['  parent@example.com  ', 'parent@example.com'],
      ['parent@example.com', 'parent@example.com'],
      ['invalid-email', null], // No @ symbol
      ['', null],
      [null, null],
      [undefined, null],
    ])('should sanitize email "%s" to %s', (input, expected) => {
      expect(student.sanitizeEmail(input)).toBe(expected)
    })
  })

  describe('validation', () => {
    test.each([
      // Valid students
      [
        { first_name: 'Marie', last_name: 'Dupont', className: '3A' },
        true,
        [],
      ],
      [
        { first_name: 'Jean', last_name: 'Martin', className: '5B', level: 5 },
        true,
        [],
      ],
      // Student without class (valid after progression)
      [
        { first_name: 'Marie', last_name: 'Dupont', className: '' },
        true,
        [],
      ],

      // Invalid students - missing required fields
      [
        { first_name: '', last_name: 'Dupont', className: '3A' },
        false,
        ['First name is required'],
      ],
      [
        { first_name: 'Marie', last_name: '', className: '3A' },
        false,
        ['Last name is required'],
      ],

      // Multiple errors
      [
        { first_name: '', last_name: '', className: '' },
        false,
        ['First name is required', 'Last name is required'],
      ],
    ])('should validate student data', (data, isValid, expectedErrors) => {
      const student = new StudentDTO(data)

      expect(student.isValid()).toBe(isValid)
      expect(student.getValidationErrors()).toEqual(expectedErrors)
    })
  })

  describe('computed properties', () => {
    test('fullName combines first and last name', () => {
      const student = new StudentDTO({
        first_name: 'Marie-Claire',
        last_name: 'Dubé-Martin',
      })

      expect(student.fullName).toBe('Marie-Claire Dubé-Martin')
    })

    test('fullName handles edge cases', () => {
      expect(new StudentDTO({ first_name: 'Marie', last_name: '' }).fullName).toBe('Marie')
      expect(new StudentDTO({ first_name: '', last_name: 'Dupont' }).fullName).toBe('Dupont')
      expect(new StudentDTO({ first_name: '', last_name: '' }).fullName).toBe('')
    })

    test.each([
      ['3A', '3A'],
      ['', 'Unknown Class'],
      [null, 'Unknown Class'],
    ])('displayClassName handles "%s" as "%s"', (className, expected) => {
      const student = new StudentDTO({ className })
      expect(student.displayClassName).toBe(expected)
    })

    test.each([
      [3, '3'],
      [0, '0'],
      [null, 'Unknown Level'],
    ])('displayLevel handles %s as "%s"', (level, expected) => {
      const student = new StudentDTO({ level })
      expect(student.displayLevel).toBe(expected)
    })

    test('parentEmails returns array of non-null emails', () => {
      const testCases = [
        {
          data: { parent1_email: 'parent1@example.com', parent2_email: 'parent2@example.com' },
          expected: ['parent1@example.com', 'parent2@example.com'],
        },
        {
          data: { parent1_email: 'parent1@example.com', parent2_email: null },
          expected: ['parent1@example.com'],
        },
        {
          data: { parent1_email: null, parent2_email: 'parent2@example.com' },
          expected: ['parent2@example.com'],
        },
        {
          data: { parent1_email: null, parent2_email: null },
          expected: [],
        },
      ]

      for (const { data, expected } of testCases) {
        const student = new StudentDTO(data)
        expect(student.parentEmails).toEqual(expected)
        expect(student.hasParentContacts).toBe(expected.length > 0)
      }
    })

    test('parentForeignKeys returns valid parent email keys', () => {
      const student = new StudentDTO({
        parent1_email: 'parent1@example.com',
        parent2_email: null,
      })

      expect(student.parentForeignKeys).toEqual(['parent1@example.com'])
    })
  })

  describe('parent lookup methods', () => {
    let student
    let mockParentRepository

    beforeEach(() => {
      student = new StudentDTO({
        first_name: 'Marie',
        last_name: 'Dupont',
        parent1_email: 'parent1@example.com',
        parent2_email: 'parent2@example.com',
      })

      mockParentRepository = {
        getById: vi.fn(),
      }
    })

    test('getParent1 returns parent when found', async () => {
      const mockParent = { email: 'parent1@example.com', name: 'Parent 1' }
      mockParentRepository.getById.mockResolvedValue(mockParent)

      const result = await student.getParent1(mockParentRepository)

      expect(result).toEqual(mockParent)
      expect(mockParentRepository.getById).toHaveBeenCalledWith('parent1@example.com')
    })

    test('getParent1 returns null when email is null', async () => {
      student.parent1_email = null

      const result = await student.getParent1(mockParentRepository)

      expect(result).toBeNull()
      expect(mockParentRepository.getById).not.toHaveBeenCalled()
    })

    test('getParent1 handles repository errors gracefully', async () => {
      mockParentRepository.getById.mockRejectedValue(new Error('Not found'))
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await student.getParent1(mockParentRepository)

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    test('getParents returns array of all parents', async () => {
      const mockParent1 = { email: 'parent1@example.com', name: 'Parent 1' }
      const mockParent2 = { email: 'parent2@example.com', name: 'Parent 2' }

      mockParentRepository.getById
        .mockResolvedValueOnce(mockParent1)
        .mockResolvedValueOnce(mockParent2)

      const result = await student.getParents(mockParentRepository)

      expect(result).toEqual([mockParent1, mockParent2])
      expect(mockParentRepository.getById).toHaveBeenCalledTimes(2)
    })

    test('getParents filters out null parents', async () => {
      const mockParent1 = { email: 'parent1@example.com', name: 'Parent 1' }

      mockParentRepository.getById
        .mockResolvedValueOnce(mockParent1)
        .mockRejectedValueOnce(new Error('Not found'))

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await student.getParents(mockParentRepository)

      expect(result).toEqual([mockParent1])
      consoleSpy.mockRestore()
    })
  })

  describe('school progression business logic', () => {
    let student

    beforeEach(() => {
      student = new StudentDTO({
        first_name: 'Marie',
        last_name: 'Dupont',
        className: '3A',
        level: 3,
      })
    })

    test('progressToNextYear updates level and class', () => {
      const progressed = student.progressToNextYear(4, '4B')

      expect(progressed.level).toBe(4)
      expect(progressed.className).toBe('4B')
      expect(progressed.first_name).toBe('Marie') // Other fields unchanged
      expect(progressed).not.toBe(student) // New instance
      expect(student.level).toBe(3) // Original unchanged
    })

    test('progressToNextYear validates input', () => {
      expect(() => student.progressToNextYear('4', '4B')).toThrow('Level must be a number')
      expect(() => student.progressToNextYear(4, '')).toThrow('Class name must be a non-empty string')
      expect(() => student.progressToNextYear(4, null)).toThrow('Class name must be a non-empty string')
    })

    test('progressToNextYear trims class name', () => {
      const progressed = student.progressToNextYear(4, '  4B  ')
      expect(progressed.className).toBe('4B')
    })
  })

  describe('data transformation', () => {
    let student

    beforeEach(() => {
      student = new StudentDTO({
        first_name: 'Marie',
        last_name: 'Dupont',
        className: '3A',
        level: 3,
        parent1_email: 'parent1@example.com',
        parent2_email: 'parent2@example.com',
      })
    })

    test('toFirestore creates proper Firestore document', () => {
      const firestoreDoc = student.toFirestore()

      expect(firestoreDoc).toHaveProperty('first_name', 'Marie')
      expect(firestoreDoc).toHaveProperty('last_name', 'Dupont')
      expect(firestoreDoc).toHaveProperty('className', '3A')
      expect(firestoreDoc).toHaveProperty('level', 3)
      expect(firestoreDoc).toHaveProperty('parent1_email', 'parent1@example.com')
      expect(firestoreDoc).toHaveProperty('parent2_email', 'parent2@example.com')
      expect(firestoreDoc).toHaveProperty('updatedAt')
      expect(firestoreDoc).toHaveProperty('createdAt')
      expect(firestoreDoc).not.toHaveProperty('id') // ID not included
      expect(firestoreDoc).not.toHaveProperty('fullName') // Computed field not stored
      expect(firestoreDoc).not.toHaveProperty('searchableText') // Computed field not stored
    })

    test('getSearchableText creates searchable content', () => {
      const searchableText = student.getSearchableText()

      expect(searchableText).toContain('marie')
      expect(searchableText).toContain('dupont')
      expect(searchableText).toContain('3a')
      expect(searchableText).toContain('3')
      expect(searchableText).toContain('parent1@example.com')
      expect(searchableText).toContain('parent2@example.com')
      expect(searchableText).toBe(searchableText.toLowerCase())
    })

    test('toNewStudentFirestoreData removes id for new student creation', () => {
      student.id = 'existing-id'
      const newStudentData = student.toNewStudentFirestoreData()

      expect(newStudentData).not.toHaveProperty('id')
      expect(newStudentData).toHaveProperty('first_name', 'Marie')
      expect(newStudentData).toHaveProperty('createdAt')
    })

    test('toJSON creates complete serializable object', () => {
      student.id = 'test-id'
      const json = student.toJSON()

      expect(json).toHaveProperty('id', 'test-id')
      expect(json).toHaveProperty('fullName', 'Marie Dupont')
      expect(json).toHaveProperty('displayClassName', '3A')
      expect(json).toHaveProperty('displayLevel', '3')
      expect(json).toHaveProperty('parentEmails', ['parent1@example.com', 'parent2@example.com'])
      expect(json).toHaveProperty('hasParentContacts', true)
    })
  })

  describe('withUpdates method', () => {
    test('creates new instance with updates', () => {
      const student = new StudentDTO({
        first_name: 'Marie',
        last_name: 'Dupont',
        className: '3A',
        level: 3,
      })

      const updated = student.withUpdates({
        className: '3B',
        level: 4,
        parent1_email: 'new.parent@example.com',
      })

      expect(updated.className).toBe('3B')
      expect(updated.level).toBe(4)
      expect(updated.parent1_email).toBe('new.parent@example.com')
      expect(updated.first_name).toBe('Marie') // Unchanged fields preserved
      expect(updated).not.toBe(student) // Different instance
      expect(student.className).toBe('3A') // Original unchanged
    })
  })

  describe('static factory methods', () => {
    test('fromFirestore creates DTO from Firestore document', () => {
      const mockDoc = {
        id: 'student-123',
        exists: () => true,
        data: () => ({
          first_name: 'Marie',
          last_name: 'Dupont',
          className: '3A',
          level: 3,
          parent1_email: 'parent1@example.com',
        }),
      }

      const student = StudentDTO.fromFirestore(mockDoc)

      expect(student.id).toBe('student-123')
      expect(student.first_name).toBe('Marie')
      expect(student.className).toBe('3A')
      expect(student.level).toBe(3)
    })

    test('fromFirestore throws error for non-existent document', () => {
      const mockDoc = {
        exists: () => false,
      }

      expect(() => StudentDTO.fromFirestore(mockDoc)).toThrow('Document does not exist')
    })

    test('fromFirestoreSnapshot creates DTOs from query snapshot', () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'student-1',
            exists: () => true,
            data: () => ({ first_name: 'Marie', last_name: 'Dupont', className: '3A' }),
          },
          {
            id: 'student-2',
            exists: () => true,
            data: () => ({ first_name: 'Jean', last_name: 'Martin', className: '5B' }),
          },
          {
            id: 'student-3',
            exists: () => true,
            data: () => ({ first_name: 'Paul', last_name: 'Tremblay', className: '' }), // Valid - no class assigned yet
          },
          {
            id: 'invalid',
            exists: () => true,
            data: () => ({ first_name: '', last_name: '', className: '' }), // Invalid - filtered out
          },
        ],
      }

      const students = StudentDTO.fromFirestoreSnapshot(mockSnapshot)

      expect(students).toHaveLength(3) // Invalid one filtered out, student without class is valid
      expect(students[0].first_name).toBe('Marie')
      expect(students[1].first_name).toBe('Jean')
      expect(students[2].first_name).toBe('Paul')
    })

    test('fromFirestoreSnapshot handles document creation errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const mockSnapshot = {
        docs: [
          {
            id: 'good-student',
            exists: () => true,
            data: () => ({ first_name: 'Marie', last_name: 'Dupont', className: '3A' }),
          },
          {
            id: 'bad-student',
            exists: () => false, // This will cause an error
          },
        ],
      }

      const students = StudentDTO.fromFirestoreSnapshot(mockSnapshot)

      expect(students).toHaveLength(1) // Only valid student
      expect(students[0].first_name).toBe('Marie')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
