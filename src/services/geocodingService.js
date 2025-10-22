/**
 * Geocoding Service
 *
 * Provides methods to geocode parent addresses and update Firestore
 */

import { ParentRepository } from '@/repositories/ParentRepository'
import { geocodeParentAddress } from '@/utils/geocoding'

const parentRepository = new ParentRepository()

/**
 * Geocode a parent's address and update their record
 *
 * @param {string} parentId - Parent document ID
 * @param {Object} parent - Parent object or DTO
 * @returns {Promise<{success: boolean, coordinates: Object|null, error: string|null}>}
 */
export const geocodeAndUpdateParent = async (parentId, parent) => {
  try {
    console.log(`Geocoding address for parent ${parentId}...`)

    // Check if address fields are present
    if (!parent.address && !parent.city && !parent.postal_code) {
      console.warn(`Parent ${parentId} has no address information`)
      return {
        success: false,
        coordinates: null,
        error: 'No address information available',
      }
    }

    // Geocode the address
    const coordinates = await geocodeParentAddress(parent)

    if (!coordinates) {
      console.warn(`Failed to geocode address for parent ${parentId}`)
      return {
        success: false,
        coordinates: null,
        error: 'Geocoding failed - address not found',
      }
    }

    // Update parent with coordinates
    await parentRepository.update(parentId, {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    })

    console.log(`Successfully geocoded and updated parent ${parentId}`)
    return {
      success: true,
      coordinates,
      error: null,
    }
  } catch (error) {
    console.error(`Error geocoding parent ${parentId}:`, error)
    return {
      success: false,
      coordinates: null,
      error: error.message,
    }
  }
}

/**
 * Check if parent address has changed (used to determine if re-geocoding is needed)
 *
 * @param {Object} oldParent - Previous parent data
 * @param {Object} newParent - New parent data
 * @returns {boolean} True if address has changed
 */
export const hasAddressChanged = (oldParent, newParent) => {
  return oldParent.address !== newParent.address
    || oldParent.city !== newParent.city
    || oldParent.postal_code !== newParent.postal_code
}

/**
 * Geocode parent address if it has changed
 *
 * This should be called when updating parent information
 *
 * @param {string} parentId - Parent document ID
 * @param {Object} oldParent - Previous parent data
 * @param {Object} newParent - New parent data
 * @returns {Promise<{success: boolean, geocoded: boolean, coordinates: Object|null}>}
 */
export const geocodeIfAddressChanged = async (parentId, oldParent, newParent) => {
  if (!hasAddressChanged(oldParent, newParent)) {
    console.log(`Address unchanged for parent ${parentId}, skipping geocoding`)
    return {
      success: true,
      geocoded: false,
      coordinates: null,
    }
  }

  console.log(`Address changed for parent ${parentId}, geocoding...`)
  const result = await geocodeAndUpdateParent(parentId, newParent)

  return {
    success: result.success,
    geocoded: true,
    coordinates: result.coordinates,
  }
}
