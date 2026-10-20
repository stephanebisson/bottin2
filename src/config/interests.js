/**
 * Parent Interests Configuration
 *
 * Interests and skills parents can select when updating their profile,
 * grouped by category. Labels are translated: interestGroups.<group id>
 * and interestOptions.<interest id> in the locale files.
 *
 * Stored parent data may hold IDs that are no longer listed here; they are
 * ignored when displayed and dropped the next time the parent saves the form.
 */

export const INTEREST_GROUPS = [
  {
    id: 'arts',
    interests: ['arts_plastiques', 'musique', 'danse', 'theatre', 'cinema', 'photos', 'litterature', 'couture', 'tricot', 'histoire'],
  },
  {
    id: 'sciences',
    interests: ['sciences', 'mathematiques', 'informatique', 'robotique', 'architecture', 'environnement'],
  },
  {
    id: 'sports',
    interests: ['sports_equipe', 'course_velo', 'natation', 'plein_air', 'sports_hiver', 'arts_martiaux', 'yoga'],
  },
  {
    id: 'loisirs',
    interests: ['cuisine', 'jardinage', 'bricolage', 'mecanique', 'jeux_de_societe', 'jeux_video', 'voyages'],
  },
  {
    id: 'communication',
    interests: ['reseaux_sociaux', 'graphisme', 'redaction', 'langues_vivantes', 'traduction', 'droit'],
  },
]

const INTEREST_IDS = new Set(INTEREST_GROUPS.flatMap(group => group.interests))

/**
 * Check whether an interest ID is in the current list
 * @param {string} interestId - ID of the interest
 * @returns {boolean} True if the interest is listed
 */
export function isKnownInterest (interestId) {
  return INTEREST_IDS.has(interestId)
}

/**
 * Get translated interest names by IDs, skipping IDs that are no longer listed
 * @param {string[]} interestIds - Array of interest IDs
 * @param {Function} $i18n - translation function (useTranslate)
 * @returns {string[]} Array of interest names
 */
export function getInterestNames (interestIds = [], $i18n) {
  return interestIds
    .filter(id => isKnownInterest(id))
    .map(id => $i18n(`interestOptions.${id}`))
}

/**
 * Get the interest groups with translated labels, groups and the interests
 * inside each group sorted alphabetically in the current language
 * @param {Function} $i18n - translation function (useTranslate)
 * @returns {Object[]} Array of { id, label, interests: [{ id, label }] }
 */
export function getSortedInterestGroups ($i18n) {
  const byLabel = (a, b) => a.label.localeCompare(b.label)
  return INTEREST_GROUPS
    .map(group => ({
      id: group.id,
      label: $i18n(`interestGroups.${group.id}`),
      interests: group.interests
        .map(id => ({ id, label: $i18n(`interestOptions.${id}`) }))
        .toSorted(byLabel),
    }))
    .toSorted(byLabel)
}
