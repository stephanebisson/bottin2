/**
 * Configuration for class and level mappings
 * Defines which levels are valid for each class
 */

/**
 * Mapping of class letters to their valid levels
 */
export const CLASS_LEVEL_MAPPING = {
  A: [1, 2],
  B: [1, 2],
  C: [3, 4],
  D: [3, 4],
  E: [5, 6],
  F: [5, 6],
}

/**
 * Get valid levels for a given class letter
 * @param {string} classLetter - The class letter (A, B, C, D, E, F)
 * @returns {number[]} Array of valid levels for the class
 */
export function getValidLevelsForClass (classLetter) {
  if (!classLetter || typeof classLetter !== 'string') {
    return []
  }

  const upperClass = classLetter.toUpperCase()
  return CLASS_LEVEL_MAPPING[upperClass] || []
}

/**
 * Check if a level is valid for a given class
 * @param {string} classLetter - The class letter
 * @param {number} level - The level to check
 * @returns {boolean} True if the level is valid for the class
 */
export function isLevelValidForClass (classLetter, level) {
  const validLevels = getValidLevelsForClass(classLetter)
  return validLevels.includes(level)
}

/**
 * Get the default/reset level for a class when current level becomes invalid
 * @param {string} classLetter - The class letter
 * @param {number} currentLevel - The current level
 * @returns {number} The level to use (current if valid, or 0 if invalid)
 */
export function getResetLevel (classLetter, currentLevel) {
  if (isLevelValidForClass(classLetter, currentLevel)) {
    return currentLevel
  }
  return 0 // Reset to 0 if current level is not valid for new class
}

/**
 * Get all class letters that support a given level
 * @param {number} level - The level to check
 * @returns {string[]} Array of class letters that support this level
 */
export function getClassesForLevel (level) {
  const classes = []
  for (const [classLetter, validLevels] of Object.entries(CLASS_LEVEL_MAPPING)) {
    if (validLevels.includes(level)) {
      classes.push(classLetter)
    }
  }
  return classes
}
