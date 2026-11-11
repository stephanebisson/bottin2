/**
 * Committee Roles Configuration
 *
 * Master list of all available committee roles.
 * All committees can use any role from this list.
 * Includes both masculine and feminine forms where applicable.
 */

/**
 * The fèves committee is the only one that has student members (one per level per class).
 * Students are elected by their class and can only have the 'Membre' role.
 */
export const FEVES_COMMITTEE_ID = 'Feves'
export const STUDENT_MEMBER_ROLE = 'Membre'

/**
 * Roles that lead a committee; their role chip is highlighted
 */
export const CHAIR_ROLES = ['Président', 'Présidente', 'Co-président', 'Co-présidente']

/**
 * Roles for committees that have no list of their own (including new committees)
 */
export const DEFAULT_COMMITTEE_ROLES = ['Porte-parole', 'Membre']

/**
 * Roles available in each committee, keyed by committee ID
 * The order is used both for the role dropdown and for sorting members
 * Committees not listed use DEFAULT_COMMITTEE_ROLES
 */
export const COMMITTEE_ROLES = {
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
    'Co-président',
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
  [FEVES_COMMITTEE_ID]: [
    'Porte-parole',
    'Liaison OPP',
    'Liaison direction',
    'Liaison parents',
    'Membre',
  ],
  'Bibliothèque': [
    'Porte-parole',
    'Membre',
    'Bénévole',
  ],
}

/**
 * Get the roles of a committee, in display order
 * @param {string} committeeId - Committee document ID
 * @returns {string[]} Role names
 */
export function getCommitteeRoles (committeeId) {
  return COMMITTEE_ROLES[committeeId] ?? DEFAULT_COMMITTEE_ROLES
}
