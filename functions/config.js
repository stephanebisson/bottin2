/**
 * Firebase Functions Configuration
 *
 * Centralized configuration constants for Firebase Functions
 */

// Data center region for Firebase Functions
// Available regions: https://firebase.google.com/docs/functions/locations
const FUNCTIONS_REGION = 'northamerica-northeast1' // Montreal, Canada

// Email configuration
// Set SIMULATE_EMAILS=true in functions/.env to skip actual email sending
// and add a delay to simulate the process for UI testing
const SIMULATE_EMAILS = process.env.SIMULATE_EMAILS === 'true'
const EMAIL_SIMULATION_DELAY_MS = 1000 // 1 second delay when simulating

console.log('🔧 Email Configuration:')
console.log('  SIMULATE_EMAILS:', SIMULATE_EMAILS)
console.log('  Environment variable SIMULATE_EMAILS:', process.env.SIMULATE_EMAILS)

module.exports = {
  FUNCTIONS_REGION,
  SIMULATE_EMAILS,
  EMAIL_SIMULATION_DELAY_MS,
}
