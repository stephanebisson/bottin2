#!/usr/bin/env node

/**
 * Geocode Parent Addresses
 *
 * This script geocodes all parent addresses using OpenStreetMap's Nominatim API
 * and updates the Firestore database with latitude/longitude coordinates.
 *
 * Usage:
 *   NODE_ENV=development node scripts/geocode-parents.js [--dry-run] [--force]
 *   NODE_ENV=production node scripts/geocode-parents.js [--dry-run] [--force]
 *
 * Options:
 *   --dry-run  Run without making changes to the database
 *   --force    Re-geocode all addresses, even if they already have coordinates
 *
 * Note: Nominatim has a rate limit of 1 request per second.
 * This script respects that limit automatically.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config()

const ENV = process.env.NODE_ENV || 'development'
const isDryRun = process.argv.includes('--dry-run')
const isForce = process.argv.includes('--force')

// Nominatim API configuration
const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/search'
const REQUEST_DELAY_MS = 1100 // Slightly over 1 second to respect rate limit
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
 */
async function geocodeAddress (address, city, postalCode, country = 'Canada') {
  // Validate inputs
  if (!address && !city && !postalCode) {
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
      return null
    }

    const result = results[0]
    return {
      latitude: Number.parseFloat(result.lat),
      longitude: Number.parseFloat(result.lon),
    }
  } catch (error) {
    console.error(`  ❌ Geocoding error: ${error.message}`)
    return null
  }
}

// Initialize Firebase Admin
function initializeFirebase () {
  try {
    let app
    if (ENV === 'production') {
      // Production: use service account
      const serviceAccountPath = path.join(__dirname, '..', 'credentials', 'firebase-service-account.json')

      if (!fs.existsSync(serviceAccountPath)) {
        const errorMsg = [
          '❌ Error: firebase-service-account.json not found!',
          'Please download your service account key from Firebase Console:',
          'Project Settings > Service Accounts > Generate New Private Key',
          `Save it as: ${serviceAccountPath}`,
        ].join('\n')
        throw new Error(errorMsg)
      }

      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      })

      console.log(`✅ Connected to production project: ${serviceAccount.project_id}`)
    } else {
      // Development: use emulator
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'

      app = initializeApp({
        projectId: 'bottin2-3b41d',
      })

      console.log('✅ Connected to local emulator')
    }

    return getFirestore(app)
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message)
    throw error
  }
}

// Main function
async function main () {
  console.log('\n🗺️  Parent Address Geocoding Script')
  console.log('=====================================\n')
  console.log(`Environment: ${ENV}`)
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Force re-geocode: ${isForce ? 'YES' : 'NO'}\n`)

  if (!isDryRun) {
    console.log('⚠️  This will update parent records in Firestore')
    console.log('⚠️  Press Ctrl+C within 3 seconds to cancel...\n')
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  try {
    // Initialize Firebase
    const db = await initializeFirebase()

    // Fetch all parents
    console.log('📥 Fetching parents...')
    const parentsRef = db.collection('parents')
    const snapshot = await parentsRef.get()

    console.log(`📊 Found ${snapshot.size} parents\n`)

    let processed = 0
    let skipped = 0
    let geocoded = 0
    let failed = 0

    // Process each parent
    for (const doc of snapshot.docs) {
      const parent = doc.data()

      processed++

      // Skip if already has coordinates and not forcing
      if (!isForce && parent.latitude && parent.longitude) {
        console.log(`[${processed}/${snapshot.size}] ⏭️  Skipping ${parent.first_name} ${parent.last_name} (already geocoded)`)
        skipped++
        continue
      }

      // Skip if no address
      if (!parent.address && !parent.city && !parent.postal_code) {
        console.log(`[${processed}/${snapshot.size}] ⏭️  Skipping ${parent.first_name} ${parent.last_name} (no address)`)
        skipped++
        continue
      }

      console.log(`[${processed}/${snapshot.size}] 🔍 Geocoding ${parent.first_name} ${parent.last_name}...`)
      console.log(`     Address: ${parent.address || 'N/A'}, ${parent.city || 'N/A'}, ${parent.postal_code || 'N/A'}`)

      // Geocode
      const coordinates = await geocodeAddress(
        parent.address,
        parent.city,
        parent.postal_code,
        'Canada',
      )

      if (!coordinates) {
        console.log(`     ❌ Failed to geocode`)
        failed++
        continue
      }

      console.log(`     ✅ Found coordinates: ${coordinates.latitude}, ${coordinates.longitude}`)

      // Update Firestore
      if (isDryRun) {
        console.log(`     🔍 Dry run - no changes made`)
      } else {
        await doc.ref.update({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          updatedAt: new Date(),
        })
        console.log(`     💾 Updated in Firestore`)
      }

      geocoded++
    }

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('Summary')
    console.log('='.repeat(50))
    console.log(`Total parents: ${snapshot.size}`)
    console.log(`Processed: ${processed}`)
    console.log(`Skipped (already geocoded): ${skipped}`)
    console.log(`Successfully geocoded: ${geocoded}`)
    console.log(`Failed: ${failed}`)

    if (isDryRun) {
      console.log('\n⚠️  This was a DRY RUN - no changes were made')
    } else {
      console.log('\n✅ Geocoding complete!')
    }
  } catch (error) {
    console.error('\n💥 Script failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
