/**
 * Committee Roles Configuration
 *
 * Master list of all available committee roles.
 * All committees can use any role from this list.
 * Includes both masculine and feminine forms where applicable.
 */

/**
 * All available committee roles
 * Sorted alphabetically for easy maintenance
 */
export const ALL_ROLES = [
  'Administrateur',
  'Administratrice',
  'Bénévole',
  'Co-présidente',
  'Enseignant',
  'Enseignante',
  'Membre',
  'Membre non votant direction',
  'Membre parent',
  'Observateur',
  'Observatrice',
  'Porte-parole',
  'Président',
  'Présidente',
  'SDG',
  'Secrétaire',
  'Substitut',
  'Trésorier',
  'Trésorière',
  'Vice-président',
  'Vice-présidente',
]

/**
 * Display order for roles in specific committees (for print layout)
 * Key: committee name
 * Value: array of role names in the order they should be displayed
 * Roles not listed will appear after the ordered roles in alphabetical order
 */
export const COMMITTEE_ROLE_DISPLAY_ORDER = {
  'Conseil d\'établissement': [
    'Président',
    'Présidente',
    'Vice-président',
    'Vice-présidente',
    'Secrétaire',
    'Membre parent',
    'Enseignant',
    'Enseignante',
    'SDG',
    'Substitut',
    'Membre non votant direction',
  ],
  'Fondation': [
    'Co-présidente',
    'Vice-président',
    'Vice-présidente',
    'Secrétaire',
    'Trésorier',
    'Trésorière',
    'Administrateur',
    'Administratrice',
    'Observateur',
    'Observatrice',
  ],
}

/**
 * Get display order for roles in a specific committee
 * @param {string} committeeName - Name of the committee
 * @returns {string[] | null} Array of role names in display order, or null if no order is specified
 */
export function getCommitteeRoleDisplayOrder (committeeName) {
  return COMMITTEE_ROLE_DISPLAY_ORDER[committeeName] || null
}

/**
 * Get valid roles for a specific committee
 * All committees can use any role from the master list
 * @param {string} committeeName - Name of the committee (unused, all committees have same roles)
 * @returns {string[]} Array of valid role names
 */
// eslint-disable-next-line no-unused-vars
export function getCommitteeRoles (committeeName) {
  return ALL_ROLES
}

/**
 * Check if a role is valid for a specific committee
 * @param {string} committeeName - Name of the committee (unused, all committees have same roles)
 * @param {string} role - Role to validate
 * @returns {boolean} True if role is valid
 */
 
export function isValidRole (committeeName, role) {
  return ALL_ROLES.includes(role)
}
