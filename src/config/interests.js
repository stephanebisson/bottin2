/**
 * Parent Interests Configuration
 *
 * Define available interest categories that parents can select
 * when updating their profile information.
 *
 * These interests help match parent skills and passions
 * with volunteer opportunities and committee roles.
 */

// Available interest categories for parents
export const PARENT_INTERESTS = [
  {
    id: 'architecture',
    name: 'Architecture'
  },
  {
    id: 'arts_plastiques',
    name: 'Arts Plastiques'
  },
  {
    id: 'banque_alimentaire',
    name: 'Banque alimentaire'
  },
  {
    id: 'cinema',
    name: 'Cinéma'
  },
  {
    id: 'couture',
    name: 'Couture'
  },
  {
    id: 'cuisine',
    name: 'Cuisine'
  },
  {
    id: 'danse',
    name: 'Danse'
  },
  {
    id: 'developpement_international',
    name: 'Développement international'
  },
  {
    id: 'echecs',
    name: 'Échecs'
  },
  {
    id: 'eco_quartier',
    name: 'Éco-quartier'
  },
  {
    id: 'histoire',
    name: 'Histoire'
  },
  {
    id: 'jardinage',
    name: 'Jardinage'
  },
  {
    id: 'jardin_communautaire',
    name: 'Jardin communautaire'
  },
  {
    id: 'jeux_de_societe',
    name: 'Jeux de société'
  },
  {
    id: 'langues_vivantes',
    name: 'Langues vivantes'
  },
  {
    id: 'litterature',
    name: 'Littérature'
  },
  {
    id: 'maison_verte',
    name: 'Maison verte'
  },
  {
    id: 'menuiserie',
    name: 'Menuiserie'
  },
  {
    id: 'musique',
    name: 'Musique'
  },
  {
    id: 'photos',
    name: 'Photos'
  },
  {
    id: 'residence_personnes_agees',
    name: 'Résidence pour personnes âgées'
  },
  {
    id: 'sports_exterieurs',
    name: 'Sports extérieurs'
  },
  {
    id: 'sports_interieurs',
    name: 'Sports intérieurs'
  },
  {
    id: 'theatre',
    name: 'Théâtre'
  },
  {
    id: 'traduction',
    name: 'Traduction'
  },
  {
    id: 'tricot',
    name: 'Tricot'
  },
  {
    id: 'voyages',
    name: 'Voyages'
  },
  {
    id: 'yoga',
    name: 'Yoga'
  }
]

/**
 * Get all available interests
 * @returns {Object[]} Array of interest objects with id and name
 */
export const getAvailableInterests = () => {
  return PARENT_INTERESTS
}

/**
 * Get interest by ID
 * @param {string} interestId - ID of the interest
 * @returns {Object|null} Interest object or null if not found
 */
export const getInterestById = (interestId) => {
  return PARENT_INTERESTS.find(interest => interest.id === interestId) || null
}

/**
 * Get interest names by IDs
 * @param {string[]} interestIds - Array of interest IDs
 * @returns {string[]} Array of interest names
 */
export const getInterestNames = (interestIds = []) => {
  return interestIds
    .map(id => getInterestById(id))
    .filter(interest => interest !== null)
    .map(interest => interest.name)
}

/**
 * Validate interest IDs
 * @param {string[]} interestIds - Array of interest IDs to validate
 * @returns {boolean} True if all IDs are valid
 */
export const validateInterestIds = (interestIds = []) => {
  return interestIds.every(id => getInterestById(id) !== null)
}