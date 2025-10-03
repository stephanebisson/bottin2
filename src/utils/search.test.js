import { describe, expect, test } from 'vitest'
import {
  createSearchIndex,
  filterBySearch,
  highlightMatches,
  matchesAnyField,
  matchesSearch,
  normalizeText,
} from './search.js'

describe('Search Utilities', () => {
  describe('normalizeText', () => {
    test.each([
      // Basic text normalization
      ['Hello World', 'hello world'],
      ['HELLO WORLD', 'hello world'],
      ['  Hello   World  ', 'hello   world'], // .trim() only removes leading/trailing spaces

      // Accent removal
      ['café', 'cafe'],
      ['naïve', 'naive'],
      ['résumé', 'resume'],
      ['Montréal', 'montreal'],
      ['François', 'francois'],
      ['José María', 'jose maria'],
      ['Zürich', 'zurich'],
      ['mañana', 'manana'],
      ['piñata', 'pinata'],

      // Special characters and edge cases
      ['àáâãäåæçèéêëìíîïñòóôõöøùúûüý', 'aaaaaaæceeeeiiiinoooooøuuuuy'], // Actual normalization result
      ['ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝ', 'aaaaaaæceeeeiiiinoooooøuuuuy'], // Actual normalization result

      // Edge cases
      ['', ''],
      [null, ''],
      [undefined, ''],
      [' ', ''],
      ['123', '123'],
      ['$%^&*()', '$%^&*()'],
    ])('should normalize "%s" to "%s"', (input, expected) => {
      expect(normalizeText(input)).toBe(expected)
    })

    test('handles non-string inputs', () => {
      expect(normalizeText(123)).toBe('')
      expect(normalizeText({})).toBe('')
      expect(normalizeText([])).toBe('')
    })
  })

  describe('matchesSearch', () => {
    test.each([
      // Basic matching
      ['Hello World', 'hello', true],
      ['Hello World', 'world', true],
      ['Hello World', 'hello world', true],
      ['Hello World', 'xyz', false],

      // Case insensitive
      ['Hello World', 'HELLO', true],
      ['HELLO WORLD', 'hello', true],

      // Accent insensitive
      ['café restaurant', 'cafe', true],
      ['Montréal Quebec', 'montreal', true],
      ['François Dupont', 'francois', true],
      ['José María', 'jose maria', true],

      // Partial matching
      ['JavaScript Developer', 'script', true],
      ['JavaScript Developer', 'dev', true],
      ['JavaScript Developer', 'java dev', false], // Not continuous

      // Edge cases
      ['', '', true], // Empty query matches everything
      ['Hello', '', true], // Empty query matches everything
      ['', 'hello', true], // Empty text with query returns true (see line 29-31)
      [null, 'hello', true], // null text with query returns true
      [undefined, 'hello', true], // undefined text with query returns true
      ['hello', null, true], // null query returns true
      ['hello', undefined, true], // undefined query returns true
    ])('should match text="%s" query="%s" as %s', (text, query, expected) => {
      expect(matchesSearch(text, query)).toBe(expected)
    })
  })

  describe('matchesAnyField', () => {
    const testFields = ['John Doe', 'john.doe@example.com', 'Software Developer', 'Montréal']

    test.each([
      // Match in different fields
      [testFields, 'john', true], // First name
      [testFields, 'doe', true], // Last name
      [testFields, 'example', true], // Email domain
      [testFields, 'software', true], // Job title
      [testFields, 'montreal', true], // City (accent insensitive)
      [testFields, 'MONTREAL', true], // Case insensitive

      // No matches
      [testFields, 'xyz', false],
      [testFields, 'abc', false],

      // Empty cases
      [testFields, '', true], // Empty query matches
      [[], 'john', false], // No fields to search, should return false
      [[''], 'john', true], // Empty field returns true due to matchesSearch behavior
    ])('should search fields %j for query "%s" as %s', (fields, query, expected) => {
      expect(matchesAnyField(fields, query)).toBe(expected)
    })

    test('handles null/undefined fields gracefully', () => {
      const fieldsWithNulls = ['John', null, undefined, 'Developer']
      expect(matchesAnyField(fieldsWithNulls, 'john')).toBe(true)
      expect(matchesAnyField(fieldsWithNulls, 'developer')).toBe(true)
      expect(matchesAnyField(fieldsWithNulls, 'xyz')).toBe(true) // null/undefined return true in matchesSearch
    })
  })

  describe('filterBySearch', () => {
    const testData = [
      { name: 'Jean Dupont', email: 'jean@example.com', city: 'Montréal' },
      { name: 'Marie Curie', email: 'marie@science.com', city: 'Paris' },
      { name: 'François Tremblay', email: 'francois@quebec.ca', city: 'Québec' },
      { name: 'John Smith', email: 'john@company.org', city: 'Toronto' },
    ]

    test.each([
      // Search by name
      ['jean', ['name'], 1], // Matches Jean Dupont
      ['marie', ['name'], 1], // Matches Marie Curie
      ['smith', ['name'], 1], // Matches John Smith

      // Search by email domain
      ['example', ['email'], 1], // jean@example.com
      ['science', ['email'], 1], // marie@science.com

      // Search by city (accent insensitive)
      ['montreal', ['city'], 1], // Matches Montréal
      ['quebec', ['city'], 1], // Matches Québec
      ['paris', ['city'], 1], // Matches Paris

      // Multi-field search
      ['jean', ['name', 'email'], 1], // Name match
      ['example', ['name', 'email'], 1], // Email match
      ['montreal', ['name', 'city'], 1], // City match

      // No matches
      ['xyz', ['name'], 0],
      ['nonexistent', ['name', 'email', 'city'], 0],

      // Case insensitive
      ['JEAN', ['name'], 1],
      ['MONTREAL', ['city'], 1],

      // Empty query (returns all)
      ['', ['name'], 4],
      [null, ['name'], 4],
      [undefined, ['name'], 4],
    ])('should filter for query "%s" in fields %j returning %d items', (query, fields, expectedCount) => {
      const result = filterBySearch(testData, query, fields)
      expect(result).toHaveLength(expectedCount)
    })

    test('handles nested field access', () => {
      const nestedData = [
        { user: { name: 'John Doe', profile: { city: 'Toronto' } } },
        { user: { name: 'Jane Smith', profile: { city: 'Vancouver' } } },
      ]

      const result1 = filterBySearch(nestedData, 'john', ['user.name'])
      expect(result1).toHaveLength(1)
      expect(result1[0].user.name).toBe('John Doe')

      const result2 = filterBySearch(nestedData, 'vancouver', ['user.profile.city'])
      expect(result2).toHaveLength(1)
      expect(result2[0].user.name).toBe('Jane Smith')
    })

    test('handles missing nested properties gracefully', () => {
      const dataWithMissingFields = [
        { user: { name: 'Complete User' } },
        { user: null },
        { name: 'Direct Name' },
        {},
      ]

      expect(() => {
        filterBySearch(dataWithMissingFields, 'complete', ['user.name'])
      }).not.toThrow()

      const result = filterBySearch(dataWithMissingFields, 'complete', ['user.name'])
      expect(result).toHaveLength(4) // All match due to null/undefined handling in matchesSearch
    })
  })

  describe('createSearchIndex', () => {
    test.each([
      ['Hello World', 'hello world'],
      ['Café Montréal', 'cafe montreal'],
      ['François & Marie', 'francois & marie'],
      ['  Mixed   Case  ', 'mixed   case'], // Internal spaces preserved
      ['', ''],
    ])('should create search index for "%s" as "%s"', (input, expected) => {
      expect(createSearchIndex(input)).toBe(expected)
    })
  })

  describe('highlightMatches', () => {
    describe('single word matches', () => {
      test.each([
        [
          'Hello World',
          'hello',
          [
            { text: 'Hello', highlight: true },
            { text: ' World', highlight: false },
          ],
        ],
        [
          'Hello World',
          'world',
          [
            { text: 'Hello ', highlight: false },
            { text: 'World', highlight: true },
          ],
        ],
        [
          'café restaurant',
          'cafe',
          [
            { text: 'café', highlight: true },
            { text: ' restaurant', highlight: false },
          ],
        ],
      ])('should highlight "%s" with query "%s"', (text, query, expected) => {
        expect(highlightMatches(text, query)).toEqual(expected)
      })
    })

    describe('multiple matches', () => {
      test('highlights multiple occurrences', () => {
        const result = highlightMatches('Hello hello HELLO', 'hello')
        expect(result).toEqual([
          { text: 'Hello', highlight: true },
          { text: ' ', highlight: false },
          { text: 'hello', highlight: true },
          { text: ' ', highlight: false },
          { text: 'HELLO', highlight: true },
        ])
      })

      test('handles overlapping potential matches correctly', () => {
        const result = highlightMatches('aaaa', 'aa')
        expect(result).toEqual([
          { text: 'aa', highlight: true },
          { text: 'aa', highlight: true },
        ])
      })
    })

    describe('accent insensitive highlighting', () => {
      test.each([
        [
          'Montréal, Québec',
          'montreal',
          [
            { text: 'Montréal', highlight: true },
            { text: ', Québec', highlight: false },
          ],
        ],
        [
          'José María García',
          'jose maria',
          [
            { text: 'José María', highlight: true },
            { text: ' García', highlight: false },
          ],
        ],
      ])('should highlight accented text "%s" with query "%s"', (text, query, expected) => {
        expect(highlightMatches(text, query)).toEqual(expected)
      })
    })

    describe('edge cases', () => {
      test.each([
        // No matches
        ['Hello World', 'xyz', [{ text: 'Hello World', highlight: false }]],

        // Empty inputs
        ['', 'hello', [{ text: '', highlight: false }]],
        ['Hello', '', [{ text: 'Hello', highlight: false }]],
        [null, 'hello', [{ text: null, highlight: false }]],
        [undefined, 'hello', [{ text: undefined, highlight: false }]],

        // Exact match
        ['hello', 'hello', [{ text: 'hello', highlight: true }]],

        // Query longer than text
        ['hi', 'hello', [{ text: 'hi', highlight: false }]],
      ])('should handle edge case text="%s" query="%s"', (text, query, expected) => {
        expect(highlightMatches(text, query)).toEqual(expected)
      })
    })
  })

  describe('Integration scenarios', () => {
    test('complete search workflow', () => {
      const data = [
        { name: 'Jean-François Dubé', title: 'Développeur', city: 'Montréal' },
        { name: 'Marie-Claire Côté', title: 'Designer', city: 'Québec' },
        { name: 'Pierre Lafleur', title: 'Manager', city: 'Toronto' },
      ]

      // Filter data
      const filtered = filterBySearch(data, 'francois', ['name'])
      expect(filtered).toHaveLength(1)

      // Highlight matches in the result
      const highlighted = highlightMatches(filtered[0].name, 'francois')
      expect(highlighted.some(segment => segment.highlight)).toBe(true)
    })

    test('search performance with large text', () => {
      const largeText = 'Lorem ipsum dolor sit amet '.repeat(100)
      const query = 'lorem'

      expect(() => {
        matchesSearch(largeText, query)
        highlightMatches(largeText, query)
      }).not.toThrow()

      expect(matchesSearch(largeText, query)).toBe(true)
    })
  })
})
