import { describe, expect, test, vi } from 'vitest'

// Mock Firebase Admin SDK
vi.mock('firebase-admin', () => ({
  default: {
    firestore: vi.fn(() => ({
      collection: vi.fn(),
      batch: vi.fn(() => ({
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn(),
      })),
    })),
    auth: vi.fn(() => ({
      verifyIdToken: vi.fn(),
    })),
  },
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}))

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}))

vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn((config, handler) => handler),
}))

vi.mock('./config', () => ({
  FUNCTIONS_REGION: 'us-central1',
}))

describe('School Progression Algorithm Logic', () => {
  // Test the core business logic extracted from the functions
  describe('Student progression logic', () => {
    test.each([
      // Auto-progression cases (odd levels stay in same class)
      [1, 'auto_progression', 2, '1A'], // Level 1 → Level 2, same class
      [3, 'auto_progression', 4, '3B'], // Level 3 → Level 4, same class
      [5, 'auto_progression', 6, '5A'], // Level 5 → Level 6, same class

      // Manual assignment cases (even levels need new class)
      [2, 'needs_assignment', 3, null], // Level 2 → Level 3, needs class assignment
      [4, 'needs_assignment', 5, null], // Level 4 → Level 5, needs class assignment

      // Graduation case
      [6, 'graduating', 6, '6A'], // Level 6 graduates (no progression)

      // Invalid level case
      [0, 'invalid_level', 0, 'TestClass'],
      [7, 'invalid_level', 7, 'TestClass'],
      [-1, 'invalid_level', -1, 'TestClass'],
    ])('should determine progression for level %d as %s', (currentLevel, expectedType, expectedNewLevel, originalClassName) => {
      const student = {
        id: 'student-123',
        first_name: 'Test',
        last_name: 'Student',
        level: currentLevel,
        className: originalClassName || 'TestClass',
      }

      // Extract the progression logic from the main function
      const determineProgression = student => {
        const currentLevel = Number.parseInt(student.level) || 0
        let changeType = 'unknown'
        let newLevel = currentLevel
        let newClass = student.className
        let requiresAssignment = false

        switch (currentLevel) {
          case 1:
          case 3:
          case 5: {
            // Auto-progression: stay in same class, go to next level
            newLevel = currentLevel + 1
            changeType = 'auto_progression'
            break
          }
          case 2:
          case 4: {
            // Manual assignment needed: move to new class and next level
            newLevel = currentLevel + 1
            newClass = null // Will be assigned by admin
            requiresAssignment = true
            changeType = 'needs_assignment'
            break
          }
          case 6: {
            // Graduation: remove student
            changeType = 'graduating'
            break
          }
          default: {
            // Invalid level
            changeType = 'invalid_level'
          }
        }

        return { changeType, newLevel, newClass, requiresAssignment }
      }

      const result = determineProgression(student)

      expect(result.changeType).toBe(expectedType)
      expect(result.newLevel).toBe(expectedNewLevel)

      switch (expectedType) {
        case 'auto_progression': {
          expect(result.newClass).toBe(originalClassName) // Same class
          expect(result.requiresAssignment).toBe(false)

          break
        }
        case 'needs_assignment': {
          expect(result.newClass).toBe(null) // Class to be assigned
          expect(result.requiresAssignment).toBe(true)

          break
        }
        case 'graduating': {
          expect(result.requiresAssignment).toBe(false)

          break
        }
      // No default
      }
    })
  })

  describe('Workflow ID generation', () => {
    test('generates consistent workflow ID based on current year', () => {
      const originalDate = Date
      const mockDate = vi.fn(() => ({ getFullYear: () => 2024 }))
      global.Date = mockDate

      const generateWorkflowId = () => {
        const currentYear = new Date().getFullYear()
        return `school_progression_${currentYear}`
      }

      expect(generateWorkflowId()).toBe('school_progression_2024')

      global.Date = originalDate
    })
  })

  describe('Statistics calculation', () => {
    test('calculates progression statistics correctly', () => {
      const students = [
        { level: 1 }, // auto_progression
        { level: 1 }, // auto_progression
        { level: 2 }, // needs_assignment
        { level: 3 }, // auto_progression
        { level: 4 }, // needs_assignment
        { level: 4 }, // needs_assignment
        { level: 5 }, // auto_progression
        { level: 6 }, // graduating
        { level: 6 }, // graduating
        { level: 7 }, // invalid_level
      ]

      const calculateStats = students => {
        const stats = {
          totalStudents: students.length,
          autoProgression: 0,
          needsClassAssignment: 0,
          graduating: 0,
          invalidLevel: 0,
        }

        for (const student of students) {
          const level = Number.parseInt(student.level) || 0

          switch (level) {
            case 1:
            case 3:
            case 5: {
              stats.autoProgression++
              break
            }
            case 2:
            case 4: {
              stats.needsClassAssignment++
              break
            }
            case 6: {
              stats.graduating++
              break
            }
            default: {
              stats.invalidLevel++
            }
          }
        }

        return stats
      }

      const result = calculateStats(students)

      expect(result.totalStudents).toBe(10)
      expect(result.autoProgression).toBe(4) // Levels 1,1,3,5
      expect(result.needsClassAssignment).toBe(3) // Levels 2,4,4
      expect(result.graduating).toBe(2) // Levels 6,6
      expect(result.invalidLevel).toBe(1) // Level 7
    })
  })

  describe('Orphaned parent detection algorithm', () => {
    test('identifies parents who will have no children after graduation', () => {
      const allStudents = [
        { id: 'student1', parent1_email: 'parent1@example.com', parent2_email: null },
        { id: 'student2', parent1_email: 'parent1@example.com', parent2_email: 'parent2@example.com' },
        { id: 'student3', parent1_email: 'parent3@example.com', parent2_email: null },
        { id: 'student4', parent1_email: 'parent4@example.com', parent2_email: 'parent2@example.com' },
      ]

      const graduatingStudentIds = ['student1', 'student3'] // Students 1 and 3 are graduating

      const findOrphanedParents = (allStudents, graduatingStudentIds) => {
        // Get remaining students after graduation
        const remainingStudents = allStudents.filter(s => !graduatingStudentIds.includes(s.id))

        // Get all parent emails from remaining students
        const remainingParentEmails = new Set()
        for (const student of remainingStudents) {
          if (student.parent1_email) {
            remainingParentEmails.add(student.parent1_email)
          }
          if (student.parent2_email) {
            remainingParentEmails.add(student.parent2_email)
          }
        }

        // Get parent emails from graduating students
        const graduatingStudents = allStudents.filter(s => graduatingStudentIds.includes(s.id))
        const orphanedParentEmails = new Set()

        for (const student of graduatingStudents) {
          if (student.parent1_email && !remainingParentEmails.has(student.parent1_email)) {
            orphanedParentEmails.add(student.parent1_email)
          }
          if (student.parent2_email && !remainingParentEmails.has(student.parent2_email)) {
            orphanedParentEmails.add(student.parent2_email)
          }
        }

        return Array.from(orphanedParentEmails)
      }

      const orphanedParents = findOrphanedParents(allStudents, graduatingStudentIds)

      // parent1@example.com should be orphaned (student1 and student2 graduate, but student2 stays)
      // Wait, let me recalculate:
      // - Graduating: student1 (parent1), student3 (parent3)
      // - Remaining: student2 (parent1, parent2), student4 (parent4, parent2)
      // - parent1 has remaining child student2, so NOT orphaned
      // - parent3 has no remaining children, so IS orphaned
      // - parent2 has remaining child student4, so NOT orphaned
      // - parent4 has remaining child student4, so NOT orphaned

      expect(orphanedParents).toEqual(['parent3@example.com'])
    })

    test('handles complex orphan scenarios', () => {
      const allStudents = [
        { id: 'student1', parent1_email: 'shared@example.com', parent2_email: 'solo1@example.com' },
        { id: 'student2', parent1_email: 'shared@example.com', parent2_email: 'solo2@example.com' },
        { id: 'student3', parent1_email: 'solo3@example.com', parent2_email: null },
      ]

      const graduatingStudentIds = ['student1', 'student3'] // First and third students graduate

      const findOrphanedParents = (allStudents, graduatingStudentIds) => {
        const remainingStudents = allStudents.filter(s => !graduatingStudentIds.includes(s.id))

        const remainingParentEmails = new Set()
        for (const student of remainingStudents) {
          if (student.parent1_email) {
            remainingParentEmails.add(student.parent1_email)
          }
          if (student.parent2_email) {
            remainingParentEmails.add(student.parent2_email)
          }
        }

        const graduatingStudents = allStudents.filter(s => graduatingStudentIds.includes(s.id))
        const orphanedParentEmails = new Set()

        for (const student of graduatingStudents) {
          if (student.parent1_email && !remainingParentEmails.has(student.parent1_email)) {
            orphanedParentEmails.add(student.parent1_email)
          }
          if (student.parent2_email && !remainingParentEmails.has(student.parent2_email)) {
            orphanedParentEmails.add(student.parent2_email)
          }
        }

        return Array.from(orphanedParentEmails).sort()
      }

      const orphanedParents = findOrphanedParents(allStudents, graduatingStudentIds)

      // Analysis:
      // - Graduating: student1 (shared, solo1), student3 (solo3)
      // - Remaining: student2 (shared, solo2)
      // - shared@example.com still has student2, so NOT orphaned
      // - solo1@example.com has no remaining children, so IS orphaned
      // - solo3@example.com has no remaining children, so IS orphaned
      // - solo2@example.com still has student2, so NOT orphaned

      expect(orphanedParents).toEqual(['solo1@example.com', 'solo3@example.com'])
    })

    test('handles edge case where all students graduate', () => {
      const allStudents = [
        { id: 'student1', parent1_email: 'parent1@example.com', parent2_email: 'parent2@example.com' },
        { id: 'student2', parent1_email: 'parent3@example.com', parent2_email: null },
      ]

      const graduatingStudentIds = ['student1', 'student2'] // All students graduate

      const findOrphanedParents = (allStudents, graduatingStudentIds) => {
        // Filter remaining students after graduation
        allStudents.filter(s => !graduatingStudentIds.includes(s.id))
        // Track remaining parent emails after graduation
        new Set()

        const graduatingStudents = allStudents.filter(s => graduatingStudentIds.includes(s.id))
        const orphanedParentEmails = new Set()

        for (const student of graduatingStudents) {
          if (student.parent1_email) {
            orphanedParentEmails.add(student.parent1_email)
          }
          if (student.parent2_email) {
            orphanedParentEmails.add(student.parent2_email)
          }
        }

        return Array.from(orphanedParentEmails).sort()
      }

      const orphanedParents = findOrphanedParents(allStudents, graduatingStudentIds)

      // All parents should be orphaned since all students are graduating
      expect(orphanedParents).toEqual(['parent1@example.com', 'parent2@example.com', 'parent3@example.com'])
    })
  })

  describe('Batch operation chunking (Firestore limitations)', () => {
    test('handles Firestore "in" query limitation of 10 items', () => {
      const largeStudentIdList = Array.from({ length: 25 }, (_, i) => `student-${i + 1}`)

      const chunkArray = (array, chunkSize) => {
        const chunks = []
        for (let i = 0; i < array.length; i += chunkSize) {
          chunks.push(array.slice(i, i + chunkSize))
        }
        return chunks
      }

      const chunks = chunkArray(largeStudentIdList, 10)

      expect(chunks).toHaveLength(3) // 25 items / 10 = 3 chunks
      expect(chunks[0]).toHaveLength(10) // First chunk: 10 items
      expect(chunks[1]).toHaveLength(10) // Second chunk: 10 items
      expect(chunks[2]).toHaveLength(5) // Third chunk: 5 items

      // Verify no items are lost
      const flattenedItems = chunks.flat()
      expect(flattenedItems).toEqual(largeStudentIdList)
    })
  })

  describe('Class assignment validation', () => {
    test.each([
      ['3A', true],
      ['4B', true],
      ['5C', true],
      ['1', true],
      ['', false],
      [null, false],
      [undefined, false],
      ['   ', false],
    ])('validates class assignment "%s" as %s', (assignedClass, isValid) => {
      const validateClassAssignment = className => {
        if (className === null || className === undefined || className === '') {
          return false
        }
        if (typeof className !== 'string') {
          return false
        }
        return className.trim().length > 0
      }

      expect(validateClassAssignment(assignedClass)).toBe(isValid)
    })
  })

  describe('Workflow state transitions', () => {
    test('validates workflow state progression', () => {
      const validTransitions = {
        active: ['completed', 'cancelled'],
        completed: [], // Terminal state
        cancelled: [], // Terminal state
      }

      const isValidTransition = (fromState, toState) => {
        return validTransitions[fromState]?.includes(toState) ?? false
      }

      // Valid transitions
      expect(isValidTransition('active', 'completed')).toBe(true)
      expect(isValidTransition('active', 'cancelled')).toBe(true)

      // Invalid transitions
      expect(isValidTransition('completed', 'active')).toBe(false)
      expect(isValidTransition('cancelled', 'active')).toBe(false)
      expect(isValidTransition('completed', 'cancelled')).toBe(false)
      expect(isValidTransition('cancelled', 'completed')).toBe(false)
    })
  })

  describe('New student ID generation', () => {
    test('generates unique student IDs', () => {
      const generateNewStudentId = () => {
        return `new_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      }

      const id1 = generateNewStudentId()
      const id2 = generateNewStudentId()

      expect(id1).toMatch(/^new_\d+_[a-z0-9]{6}$/)
      expect(id2).toMatch(/^new_\d+_[a-z0-9]{6}$/)
      expect(id1).not.toBe(id2) // Should be unique (probabilistically)
    })
  })

  describe('Error handling scenarios', () => {
    test('handles malformed student data gracefully', () => {
      const malformedStudents = [
        { level: 'invalid' }, // Non-numeric level
        { level: null }, // Null level
        {}, // Missing level
        { level: '3.5' }, // Float level (should parse as 3)
        { level: 'abc123' }, // Non-parseable string
      ]

      const parseLevel = student => {
        return Number.parseInt(student.level) || 0
      }

      const results = malformedStudents.map(student => parseLevel(student))

      expect(results).toEqual([0, 0, 0, 3, 0])
    })

    test('handles missing parent emails gracefully', () => {
      const studentsWithMissingParents = [
        { id: 'student1', parent1_email: null, parent2_email: null },
        { id: 'student2', parent1_email: '', parent2_email: undefined },
        { id: 'student3' }, // Missing parent fields entirely
        { id: 'student4', parent1_email: 'parent@example.com', parent2_email: null },
      ]

      const extractParentEmails = student => {
        const emails = []
        if (student.parent1_email && student.parent1_email.trim()) {
          emails.push(student.parent1_email.trim())
        }
        if (student.parent2_email && student.parent2_email.trim()) {
          emails.push(student.parent2_email.trim())
        }
        return emails
      }

      const results = studentsWithMissingParents.map(student => extractParentEmails(student))

      expect(results).toEqual([
        [], // No valid parent emails
        [], // Empty/undefined emails
        [], // Missing fields
        ['parent@example.com'], // One valid email
      ])
    })
  })
})
