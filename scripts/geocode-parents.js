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
 * Normalize address by removing apartment/unit numbers and street type words
 */
function normalizeAddress (address) {
  if (!address) {
    return address
  }

  // Remove apartment/unit number patterns (case insensitive)
  // Patterns to remove:
  // - "app. 123", "app 123", "apt. 123", "apt 123"
  // - "appt. 123", "appt 123", "appartement 123"
  // - "unit 123", "unite 123", "unité 123"
  // - "#123", "# 123"
  // - "-123" at the end (dash followed by numbers)
  // - Street type words: rue, ave, avenue, boul, boulevard, street
  let normalized = address

  // Remove apartment/unit prefixes with numbers
  normalized = normalized.replace(/\b(app\.?|apt\.?|appt\.?|appartement|unit|unite|unité)\s*\.?\s*\d+\b/gi, '')

  // Remove hash patterns
  normalized = normalized.replace(/#\s*\d+\b/g, '')

  // Remove trailing dash with numbers (e.g., "123 Main St-456" -> "123 Main St")
  normalized = normalized.replace(/-\d+\s*$/g, '')

  // Remove leading dash with numbers (e.g., "456-123 Main St" -> "123 Main St")
  normalized = normalized.replace(/^\d+-/g, '')

  // Remove street type words
  normalized = normalized.replace(/\b(rue|av\.?|ave\.?|avenue|boul\.?|boulevard|street|st\.?)\b/gi, '')

  // Clean up extra spaces and commas
  normalized = normalized.replace(/\s+/g, ' ').trim()
  normalized = normalized.replace(/,\s*,/g, ',').replace(/^,|,$/g, '')

  return normalized
}

/**
 * Geocode an address using Nominatim API
 */
async function geocodeAddress (address, city, postalCode, country = 'Canada') {
  // Validate inputs
  if (!address && !city && !postalCode) {
    return null
  }

  // Normalize address to remove apartment numbers
  const normalizedAddress = normalizeAddress(address)

  if (normalizedAddress !== address) {
    console.log(`     🔧 Normalized address: "${address}" → "${normalizedAddress}"`)
  }

  // Build search query
  const parts = []
  if (normalizedAddress) {
    parts.push(normalizedAddress)
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
      limit: '3', // Get top 3 results for debugging
      addressdetails: '1',
      countrycodes: 'ca', // Restrict to Canada for better results
    })

    const url = `${NOMINATIM_API_URL}?${params}`
    console.log(`     🔗 API URL: ${url}`)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'B2-School-Directory/1.0', // Required by Nominatim
      },
    })

    if (!response.ok) {
      console.error(`     ❌ HTTP Error: ${response.status} ${response.statusText}`)
      throw new Error(`Nominatim API error: ${response.status}`)
    }

    const results = await response.json()

    console.log(`     📊 Found ${results.length} result(s)`)

    if (!results || results.length === 0) {
      console.log(`     ℹ️  No results found for query: "${searchQuery}"`)
      return null
    }

    // Show all results for debugging
    for (let i = 0; i < Math.min(results.length, 3); i++) {
      const r = results[i]
      console.log(`     ${i + 1}. ${r.display_name}`)
      console.log(`        Type: ${r.type}, Class: ${r.class}`)
      console.log(`        Lat/Lng: ${r.lat}, ${r.lon}`)
      console.log(`        Importance: ${r.importance}`)
    }

    const result = results[0]
    console.log(`     ✓ Using first result: ${result.display_name}`)

    return {
      latitude: Number.parseFloat(result.lat),
      longitude: Number.parseFloat(result.lon),
    }
  } catch (error) {
    console.error(`     ❌ Geocoding error: ${error.message}`)
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

    // Group parents by address to avoid duplicate geocoding
    console.log('📋 Grouping parents by address...\n')
    const addressGroups = new Map()

    for (const doc of snapshot.docs) {
      const parent = doc.data()

      // Skip if already has coordinates and not forcing
      if (!isForce && parent.latitude && parent.longitude) {
        skipped++
        continue
      }

      // Skip if no complete address
      if (!parent.address || !parent.postal_code) {
        skipped++
        continue
      }

      // Create a key for this address (normalize for matching)
      const addressKey = `${parent.address}|${parent.city || ''}|${parent.postal_code}`.toLowerCase().trim()

      if (!addressGroups.has(addressKey)) {
        addressGroups.set(addressKey, {
          address: parent.address,
          city: parent.city,
          postal_code: parent.postal_code,
          parents: [],
        })
      }

      addressGroups.get(addressKey).parents.push({
        doc,
        name: `${parent.first_name} ${parent.last_name}`,
      })
    }

    console.log(`📍 Found ${addressGroups.size} unique addresses to geocode`)
    console.log(`⏭️  Skipped ${skipped} parents (already geocoded or incomplete address)\n`)

    // Process each unique address
    let addressIndex = 0
    for (const group of addressGroups.values()) {
      addressIndex++
      processed += group.parents.length

      console.log(`\n[${addressIndex}/${addressGroups.size}] 🔍 Geocoding address: ${group.address}, ${group.city || 'N/A'}, ${group.postal_code}`)
      console.log(`     👥 ${group.parents.length} parent(s) at this address: ${group.parents.map(p => p.name).join(', ')}`)

      // Geocode the address once
      const coordinates = await geocodeAddress(
        group.address,
        group.city,
        group.postal_code,
        'Canada',
      )

      if (!coordinates) {
        console.log(`     ❌ Failed to geocode`)
        failed += group.parents.length
        continue
      }

      console.log(`     ✅ Found coordinates: ${coordinates.latitude}, ${coordinates.longitude}`)

      // Update all parents at this address
      if (isDryRun) {
        console.log(`     🔍 Dry run - would update ${group.parents.length} parent(s)`)
      } else {
        for (const parent of group.parents) {
          await parent.doc.ref.update({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            updatedAt: new Date(),
          })
        }
        console.log(`     💾 Updated ${group.parents.length} parent(s) in Firestore`)
      }

      geocoded += group.parents.length
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
