#!/usr/bin/env node

/**
 * Committee Roles Population Script
 *
 * This script reads the committees collection from Firestore and generates
 * a committee roles configuration based on the actual roles found in the database.
 *
 * Usage:
 *   node scripts/populateCommitteeRoles.js [--emulator] [--dry-run]
 *
 * Options:
 *   --emulator  - Use Firebase emulator instead of production
 *   --dry-run   - Show what would be generated without writing to file
 *
 * Examples:
 *   node scripts/populateCommitteeRoles.js --emulator
 *   node scripts/populateCommitteeRoles.js --dry-run
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Check command line arguments
const isEmulator = process.argv.includes('--emulator') || process.env.NODE_ENV === 'development'
const isDryRun = process.argv.includes('--dry-run')

// Initialize Firebase Admin SDK
if (isEmulator) {
  // Emulator mode - use project ID without credentials
  console.log('🔧 Running in emulator mode')

  // Set emulator host for Firestore (if not already set)
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'
  }

  admin.initializeApp({
    projectId: 'bottin2-3b41d', // Replace with your actual project ID
  })
} else {
  // Production mode - use service account credentials
  console.log('🚀 Running in production mode')

  const credentialsPath = path.resolve(__dirname, '..', 'credentials', 'firebase-service-account.json')

  if (!fs.existsSync(credentialsPath)) {
    console.error('❌ Firebase service account credentials not found!')
    console.error(`Expected path: ${credentialsPath}`)
    console.error('Please ensure the credentials file exists or use --emulator flag.')
    process.exit(1)
  }

  const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

const db = admin.firestore()

/**
 * Read committees collection and extract role information
 */
async function analyzeCommitteeRoles () {
  try {
    console.log('📊 Analyzing committee roles from database...')

    const committeesSnapshot = await db.collection('committees').get()

    if (committeesSnapshot.empty) {
      console.log('⚠️  No committees found in the database')
      return {}
    }

    const rolesByCommittee = {}
    const allRoles = new Set()
    let totalMembers = 0
    let committeesWithMembers = 0

    for (const doc of committeesSnapshot.docs) {
      const committee = { id: doc.id, ...doc.data() }
      const committeeName = committee.name || doc.id
      const members = committee.members || []

      console.log(`\n📋 Committee: ${committeeName}`)
      console.log(`   Members: ${members.length}`)

      if (members.length === 0) {
        console.log('   No members found')
        continue
      }

      committeesWithMembers++
      totalMembers += members.length

      // Extract roles from this committee
      const committeeRoles = new Set()

      for (const member of members) {
        const role = member.role || 'Member'
        committeeRoles.add(role)
        allRoles.add(role)

        console.log(`   - ${member.email}: ${role} (${member.member_type || 'unknown'})`)
      }

      // Store unique roles for this committee
      const rolesArray = Array.from(committeeRoles).sort()

      // If committee only has "Member" role, provide better defaults
      if (rolesArray.length === 1 && rolesArray[0] === 'Member') {
        rolesByCommittee[committeeName] = ['Membre', 'Porte-parole']
        console.log(`   Unique roles: [${rolesArray.join(', ')}] → Enhanced to: [Membre, Porte-parole]`)
      } else {
        rolesByCommittee[committeeName] = rolesArray
        console.log(`   Unique roles: [${rolesArray.join(', ')}]`)
      }
    }

    console.log(`\n📈 Summary:`)
    console.log(`   Total committees: ${committeesSnapshot.size}`)
    console.log(`   Committees with members: ${committeesWithMembers}`)
    console.log(`   Total members: ${totalMembers}`)
    console.log(`   Unique roles across all committees: [${Array.from(allRoles).sort().join(', ')}]`)

    return {
      rolesByCommittee,
      allRoles: Array.from(allRoles).sort(),
      stats: {
        totalCommittees: committeesSnapshot.size,
        committeesWithMembers,
        totalMembers,
      },
    }
  } catch (error) {
    console.error('❌ Error analyzing committee roles:', error)
    throw error
  }
}

/**
 * Generate the configuration file content
 */
function generateConfigContent (analysis) {
  const { rolesByCommittee, allRoles, stats } = analysis

  const configContent = `/**
 * Committee Roles Configuration
 * 
 * Define valid roles for each committee by name.
 * This configuration is used to populate role selection dropdowns
 * when parents select committee memberships.
 * 
 * Generated automatically from database on ${new Date().toISOString()}
 * 
 * Statistics:
 * - Total committees: ${stats.totalCommittees}
 * - Committees with members: ${stats.committeesWithMembers} 
 * - Total members: ${stats.totalMembers}
 * - Unique roles: ${allRoles.length}
 */

// Default roles for committees without specific role configurations  
const DEFAULT_ROLES = [
  "Membre",
  "Porte-parole"
]

// Committee-specific role configurations
// Key: committee name (must match exactly with committee.name in database)
// Value: array of valid role names for that committee
export const COMMITTEE_ROLES = {
${Object.entries(rolesByCommittee).map(([name, roles]) =>
  `  ${JSON.stringify(name)}: ${JSON.stringify(roles, null, 2).replace(/\n/g, '\n  ')},`,
).join('\n')}
  
  // Default fallback for committees not specifically configured
  // This will be used for any committee not listed above
  '*': DEFAULT_ROLES
}

/**
 * Get valid roles for a specific committee
 * @param {string} committeeName - Name of the committee
 * @returns {string[]} Array of valid role names
 */
export const getCommitteeRoles = (committeeName) => {
  if (!committeeName) {
    return DEFAULT_ROLES
  }
  
  // Check for exact committee name match
  if (COMMITTEE_ROLES[committeeName]) {
    return COMMITTEE_ROLES[committeeName]
  }
  
  // Fallback to default roles
  return COMMITTEE_ROLES['*'] || DEFAULT_ROLES
}

/**
 * Get all configured committee names
 * @returns {string[]} Array of committee names that have specific role configurations
 */
export const getConfiguredCommitteeNames = () => {
  return Object.keys(COMMITTEE_ROLES).filter(name => name !== '*')
}

/**
 * Check if a role is valid for a specific committee
 * @param {string} committeeName - Name of the committee
 * @param {string} role - Role to validate
 * @returns {boolean} True if role is valid for the committee
 */
export const isValidRole = (committeeName, role) => {
  const validRoles = getCommitteeRoles(committeeName)
  return validRoles.includes(role)
}

/**
 * Get statistics about the committee configuration
 * @returns {Object} Configuration statistics
 */
export const getConfigStats = () => ({
  totalCommittees: ${stats.totalCommittees},
  committeesWithMembers: ${stats.committeesWithMembers},
  totalMembers: ${stats.totalMembers},
  uniqueRoles: ${allRoles.length},
  generatedAt: '${new Date().toISOString()}'
})
`

  return configContent
}

/**
 * Write the configuration to file
 */
async function writeConfigFile (content) {
  const configPath = path.resolve(__dirname, '..', 'src', 'config', 'committees.js')

  try {
    // Create backup of existing file
    if (fs.existsSync(configPath)) {
      const backupPath = `${configPath}.backup.${Date.now()}`
      fs.copyFileSync(configPath, backupPath)
      console.log(`💾 Created backup: ${path.basename(backupPath)}`)
    }

    // Write new configuration
    fs.writeFileSync(configPath, content, 'utf8')
    console.log(`✅ Configuration written to: ${configPath}`)

    return true
  } catch (error) {
    console.error('❌ Error writing configuration file:', error)
    return false
  }
}

/**
 * Main function
 */
async function main () {
  try {
    console.log('🚀 Starting committee roles population...')

    if (isDryRun) {
      console.log('🔍 DRY RUN MODE - No files will be modified')
    }

    // Analyze committee roles from database
    const analysis = await analyzeCommitteeRoles()

    if (Object.keys(analysis.rolesByCommittee).length === 0) {
      console.log('⚠️  No committees with members found. Nothing to generate.')
      process.exit(0)
    }

    // Generate configuration content
    const configContent = generateConfigContent(analysis)

    if (isDryRun) {
      console.log('\n📄 Generated configuration (DRY RUN):')
      console.log('=' * 80)
      console.log(configContent)
      console.log('=' * 80)
    } else {
      // Write to file
      const success = await writeConfigFile(configContent)

      if (success) {
        console.log('\n🎉 Committee roles configuration has been successfully generated!')
        console.log('📍 Location: src/config/committees.js')
        console.log('🔄 The form will now use roles found in your actual database.')
      } else {
        console.error('❌ Failed to write configuration file')
        process.exit(1)
      }
    }
  } catch (error) {
    console.error('💥 Script failed:', error)
    process.exit(1)
  } finally {
    // Clean up Firebase connection
    if (admin.apps.length > 0) {
      await admin.app().delete()
    }
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Script interrupted by user')
  if (admin.apps.length > 0) {
    await admin.app().delete()
  }
  process.exit(0)
})

// Run the script
main()
