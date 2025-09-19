/**
 * Firebase Functions Configuration
 *
 * Centralized configuration for Firebase Functions endpoints
 */

// Firebase Functions region
export const FUNCTIONS_REGION = 'northamerica-northeast1' // Montreal, Canada
export const PROJECT_ID = 'bottin2-3b41d'

// Base URLs for Firebase Functions
export const getFunctionsBaseUrl = () => {
  return import.meta.env.DEV
    ? `http://localhost:5001/${PROJECT_ID}/us-central1` // Emulator uses us-central1
    : `https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net` // Production uses Montreal
}
