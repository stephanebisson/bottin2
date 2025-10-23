/**
 * School Location Configuration
 *
 * Define the school's physical location and map display settings
 */

// School physical address and coordinates
export const SCHOOL_LOCATION = {
  name: 'Étoile filante',
  address: '5619 Chem. de la Côte-Saint-Antoine',
  city: 'Montreal',
  postal_code: 'H4A 1R5', // TODO: Update with actual postal code
  province: 'QC',
  country: 'Canada',
  phone: '5145965682',

  // Coordinates for map center
  latitude: 45.472_694_449_225_56,
  longitude: -73.616_867_844_490_88,
}

// Default map view settings
export const MAP_DEFAULT_ZOOM = 16 // Medium zoom level (1-20 scale)
export const MAP_MIN_ZOOM = 10
export const MAP_MAX_ZOOM = 18

// Marker cluster settings
export const CLUSTER_SETTINGS = {
  // Maximum radius a cluster will cover from the central marker (in pixels)
  maxClusterRadius: 80,

  // Disable clustering at this zoom level and below
  disableClusteringAtZoom: 16,

  // Show coverage area when clicking cluster
  showCoverageOnHover: false,

  // Animate marker additions/removals
  animate: true,
}

/**
 * Get the school location
 * @returns {Object} School location object with address and coordinates
 */
export const getSchoolLocation = () => {
  return SCHOOL_LOCATION
}

/**
 * Get full school address as string
 * @returns {string} Formatted school address
 */
export const getSchoolAddress = () => {
  return `${SCHOOL_LOCATION.address}, ${SCHOOL_LOCATION.city}, ${SCHOOL_LOCATION.province} ${SCHOOL_LOCATION.postal_code}`
}
