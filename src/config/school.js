/**
 * School Location Configuration
 *
 * Define the school's physical location
 */

// School physical address
export const SCHOOL_LOCATION = {
  name: 'Étoile filante',
  address: '5619, chemin de la Côte-Saint-Antoine',
  city: 'Montreal',
  postal_code: 'H4A 1R5', // TODO: Update with actual postal code
  province: 'QC',
  country: 'Canada',
  phone: '5145965682',
}

/**
 * Get full school address as string
 * @returns {string} Formatted school address
 */
export function getSchoolAddress () {
  return `${SCHOOL_LOCATION.address}, ${SCHOOL_LOCATION.city}, ${SCHOOL_LOCATION.province} ${SCHOOL_LOCATION.postal_code}`
}
