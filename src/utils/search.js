/**
 * Search utilities for accent-insensitive text matching
 */

/**
 * Normalize text by removing accents and converting to lowercase
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text without accents
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') {
    return ''
  }
  
  return text
    .normalize('NFD') // Decompose characters with accents
    .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
    .toLowerCase()
    .trim()
}

/**
 * Check if search query matches text (accent-insensitive)
 * @param {string} text - Text to search in
 * @param {string} query - Search query
 * @returns {boolean} True if query matches text
 */
export function matchesSearch(text, query) {
  if (!query || !text) {
    return true
  }
  
  const normalizedText = normalizeText(text)
  const normalizedQuery = normalizeText(query)
  
  return normalizedText.includes(normalizedQuery)
}

/**
 * Check if search query matches any of the provided text fields
 * @param {string[]} textFields - Array of text fields to search in
 * @param {string} query - Search query
 * @returns {boolean} True if query matches any field
 */
export function matchesAnyField(textFields, query) {
  if (!query) {
    return true
  }
  
  return textFields.some(field => matchesSearch(field, query))
}

/**
 * Filter array of objects by search query against specified fields
 * @param {Array} items - Array of objects to filter
 * @param {string} query - Search query
 * @param {string[]} searchFields - Array of field names to search in
 * @returns {Array} Filtered array
 */
export function filterBySearch(items, query, searchFields) {
  if (!query || !query.trim()) {
    return items
  }
  
  return items.filter(item => {
    const textFields = searchFields.map(field => {
      // Handle nested field access (e.g., 'user.name')
      const value = field.split('.').reduce((obj, key) => obj?.[key], item)
      return String(value || '')
    })
    
    return matchesAnyField(textFields, query)
  })
}

/**
 * Create a search-friendly version of text for indexing
 * @param {string} text - Text to create search index for
 * @returns {string} Search-indexed text
 */
export function createSearchIndex(text) {
  return normalizeText(text)
}

/**
 * Find all match positions in text (accent-insensitive)
 * @param {string} text - Original text to search in
 * @param {string} query - Search query
 * @returns {Array} Array of {start, end} positions of matches
 */
function findMatchPositions(text, query) {
  if (!query || !text) return []
  
  const normalizedText = normalizeText(text)
  const normalizedQuery = normalizeText(query)
  const positions = []
  let searchStart = 0
  
  while (searchStart < normalizedText.length) {
    const matchIndex = normalizedText.indexOf(normalizedQuery, searchStart)
    if (matchIndex === -1) break
    
    positions.push({
      start: matchIndex,
      end: matchIndex + normalizedQuery.length
    })
    searchStart = matchIndex + normalizedQuery.length
  }
  
  return positions
}

/**
 * Split text into segments with highlight information
 * @param {string} text - Original text
 * @param {string} query - Search query
 * @returns {Array} Array of {text, highlight} segments
 */
export function highlightMatches(text, query) {
  if (!query || !text) {
    return [{ text, highlight: false }]
  }
  
  const positions = findMatchPositions(text, query)
  if (positions.length === 0) {
    return [{ text, highlight: false }]
  }
  
  const segments = []
  let lastEnd = 0
  
  for (const position of positions) {
    // Add non-highlighted text before this match
    if (position.start > lastEnd) {
      segments.push({
        text: text.slice(lastEnd, position.start),
        highlight: false
      })
    }
    
    // Add highlighted match
    segments.push({
      text: text.slice(position.start, position.end),
      highlight: true
    })
    
    lastEnd = position.end
  }
  
  // Add remaining non-highlighted text
  if (lastEnd < text.length) {
    segments.push({
      text: text.slice(lastEnd),
      highlight: false
    })
  }
  
  return segments
}