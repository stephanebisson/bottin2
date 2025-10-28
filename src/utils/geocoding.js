/**
 * Geocoding Utility
 *
 * Uses OpenStreetMap's Nominatim API for geocoding addresses
 * Free service with usage policy: https://operations.osmfoundation.org/policies/nominatim/
 *
 * IMPORTANT: Nominatim usage policy requires:
 * - Maximum 1 request per second
 * - Include a valid User-Agent header
 * - Use for bulk geocoding only with permission
 */

const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/search'
const REQUEST_DELAY_MS = 1100 // Slightly over 1 second to respect rate limit

// Simple queue to ensure we respect rate limits
let lastRequestTime = 0

/**
 * Wait for rate limit delay
 */
async function waitForRateLimit () {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()
}

/**
 * Geocode an address using Nominatim API
 *
 * @param {string} address - Street address
 * @param {string} city - City name
 * @param {string} postalCode - Postal code
 * @param {string} country - Country (default: 'Canada')
 * @returns {Promise<{latitude: number, longitude: number}|null>} Coordinates or null if not found
 */
export async function geocodeAddress (address, city, postalCode, country = 'Canada') {
  // Validate inputs - require at least address and postal code for accurate geocoding
  if (!address || !postalCode) {
    console.warn('Geocoding: Incomplete address - need at least street address and postal code')
    return null
  }

  // Build search query
  const parts = []
  if (address) {
    parts.push(address)
  }
  if (city) {
    parts.push(city)
  }
  if (postalCode) {
    parts.push(postalCode)
  }
  if (country) {
    parts.push(country)
  }

  const searchQuery = parts.join(', ')

  try {
    // Respect rate limit
    await waitForRateLimit()

    // Make request to Nominatim
    const params = new URLSearchParams({
      q: searchQuery,
      format: 'json',
      limit: '1',
      addressdetails: '1',
      countrycodes: 'ca', // Restrict to Canada for better results
    })

    const response = await fetch(`${NOMINATIM_API_URL}?${params}`, {
      headers: {
        'User-Agent': 'B2-School-Directory/1.0', // Required by Nominatim
      },
    })

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`)
    }

    const results = await response.json()

    if (!results || results.length === 0) {
      console.warn(`Geocoding: No results found for "${searchQuery}"`)
      return null
    }

    const result = results[0]
    return {
      latitude: Number.parseFloat(result.lat),
      longitude: Number.parseFloat(result.lon),
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Geocode a parent's address
 *
 * @param {Object} parent - Parent object or DTO with address fields
 * @returns {Promise<{latitude: number, longitude: number}|null>} Coordinates or null
 */
export async function geocodeParentAddress (parent) {
  return geocodeAddress(
    parent.address,
    parent.city,
    parent.postal_code,
    'Canada',
  )
}

/**
 * Batch geocode multiple addresses with rate limiting
 *
 * @param {Array<{address: string, city: string, postal_code: string}>} addresses - Array of address objects
 * @param {Function} onProgress - Optional callback for progress updates (index, total, result)
 * @returns {Promise<Array<{latitude: number, longitude: number}|null>>} Array of coordinates (null for failed geocoding)
 */
export async function batchGeocodeAddresses (addresses, onProgress = null) {
  const results = []

  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i]
    const result = await geocodeAddress(
      address.address,
      address.city,
      address.postal_code,
    )

    results.push(result)

    if (onProgress) {
      onProgress(i + 1, addresses.length, result)
    }
  }

  return results
}

/**
 * Check if coordinates are valid
 *
 * @param {number} latitude - Latitude value
 * @param {number} longitude - Longitude value
 * @returns {boolean} True if coordinates are valid
 */
export function isValidCoordinates (latitude, longitude) {
  return (
    latitude !== null
    && longitude !== null
    && !Number.isNaN(latitude)
    && !Number.isNaN(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180
  )
}
