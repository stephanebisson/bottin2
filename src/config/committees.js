/**
 * Committee Roles Configuration
 *
 * Define valid roles for each committee by name.
 * This configuration is used to populate role selection dropdowns
 * when parents select committee memberships.
 *
 * Generated automatically from database on 2025-09-21T19:28:38.272Z
 *
 * Statistics:
 * - Total committees: 16
 * - Committees with members: 15
 * - Total members: 107
 * - Unique roles: 14
 */

// Default roles for committees without specific role configurations
const DEFAULT_ROLES = [
  'Membre',
  'Porte-parole',
]

// Committee-specific role configurations
// Key: committee name (must match exactly with committee.name in database)
// Value: array of valid role names for that committee
export const COMMITTEE_ROLES = {
  'Admissions': [
    'Membre',
    'Porte-parole',
  ],
  'Ateliers': [
    'Membre',
    'Porte-parole',
  ],
  'Bazar': [
    'Membre',
    'Porte-parole',
  ],
  'Bibliothèque': [
    'Membre',
    'Porte-parole',
    'Bénévole',
  ],
  'Bottin': [
    'Membre',
    'Porte-parole',
  ],
  'CAMPÉR': [
    'Membre',
    'Porte-parole',
  ],
  'Conseil d\'établissement': [
    'Enseignant(e)',
    'Membre non votants direction',
    'SDG',
    'Subsitut',
    'Membre Parent',
    'Président',
    'Secrétaire',
    'Substitut',
    'Vice-Président',
  ],
  'Comité des usagers SDG': [
    'Membre',
    'Porte-parole',
  ],
  'Feves': [
    'Membre',
    'Porte-parole',
  ],
  'Fondation': [
    'Administratrices et administrateurs',
    'Co-Présidente',
    'Observateur',
    'Secrétaire',
    'Trésorier',
  ],
  'Groupe Facebook': [
    'Membre',
    'Porte-parole',
  ],
  'JEDI': [
    'Membre',
    'Porte-parole',
  ],
  'OPP': [
    'Membre',
    'Porte-parole',
  ],
  'REPAQ': [
    'Membre',
    'Porte-parole',
  ],

  // Default fallback for committees not specifically configured
  // This will be used for any committee not listed above
  '*': DEFAULT_ROLES,
}

/**
 * Display order for roles in specific committees (for print layout)
 * Key: committee name
 * Value: array of role names in the order they should be displayed
 * Roles not listed will appear after the ordered roles in alphabetical order
 */
export const COMMITTEE_ROLE_DISPLAY_ORDER = {
  'Conseil d\'établissement': [
    // TODO: Fill in the desired order
    'Président',
    'Vice-Président',
    'Secrétaire',
    'Membre Parent',
    'Enseignant(e)',
    'SDG',
    'Substitut',
    'Membre non votants direction',
  ],
  'Fondation': [
    'Co-Présidente',
    'Secrétaire',
    'Trésorier',
    'Administratrices et administrateurs',
    'Observateur',
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
 * @param {string} committeeName - Name of the committee
 * @returns {string[]} Array of valid role names
 */
export function getCommitteeRoles (committeeName) {
  if (!committeeName) {
    return DEFAULT_ROLES
  }

  // Check for exact committee name match
  if (COMMITTEE_ROLES[committeeName]) {
    return COMMITTEE_ROLES[committeeName]
  }

  // Fallback to default roles
  return COMMITTEE_ROLES['*'] || DEFAULT_ROLES
}

/**
 * Get all configured committee names
 * @returns {string[]} Array of committee names that have specific role configurations
 */
export function getConfiguredCommitteeNames () {
  return Object.keys(COMMITTEE_ROLES).filter(name => name !== '*')
}

/**
 * Check if a role is valid for a specific committee
 * @param {string} committeeName - Name of the committee
 * @param {string} role - Role to validate
 * @returns {boolean} True if role is valid for the committee
 */
export function isValidRole (committeeName, role) {
  const validRoles = getCommitteeRoles(committeeName)
  return validRoles.includes(role)
}

/**
 * Get statistics about the committee configuration
 * @returns {Object} Configuration statistics
 */
export function getConfigStats () {
  return {
  totalCommittees: 16,
  committeesWithMembers: 15,
  totalMembers: 107,
  uniqueRoles: 14,
  generatedAt: '2025-09-21T19:28:38.272Z',
}
}
