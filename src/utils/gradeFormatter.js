/**
 * Format grade level with proper ordinal format based on locale
 * @param {string|number} level - The grade level (1-6 or numeric string)
 * @param {string} locale - The locale ('fr' or 'en'). Defaults to 'fr'.
 * @returns {string} Formatted grade level (e.g., "1re année" in French, "1st grade" in English)
 */
export function formatGradeLevel (level, locale = 'fr') {
  // Handle special cases
  if (!level || level === 'Unknown') {return level}

  const numLevel = Number(level)

  if (locale === 'fr') {
    switch (numLevel) {
      case 1: { return '1re année' }
      case 2: { return '2e année' }
      case 3: { return '3e année' }
      case 4: { return '4e année' }
      case 5: { return '5e année' }
      case 6: { return '6e année' }
      default: { return `${level}e année` }
    }
  } else {
    switch (numLevel) {
      case 1: { return '1st grade' }
      case 2: { return '2nd grade' }
      case 3: { return '3rd grade' }
      case 4: { return '4th grade' }
      case 5: { return '5th grade' }
      case 6: { return '6th grade' }
      default: { return `${level}th grade` }
    }
  }
}
