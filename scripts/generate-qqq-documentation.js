/**
 * Generate qqq.json message documentation for vue-banana-i18n
 *
 * This script creates comprehensive documentation for all translation keys,
 * following the banana-i18n/MediaWiki documentation standard.
 *
 * For each message key, it provides:
 * - Purpose and context
 * - Parameters documentation
 * - Usage location hints
 * - Special notes (pluralization, tone, etc.)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOCALES_DIR = path.join(__dirname, '../src/locales')

/**
 * Generate documentation for a translation key
 */
function generateDocumentation(key, value, parameterMap) {
  const parts = []

  // Determine context from key structure
  const [section, ...rest] = key.split('.')
  const subsection = rest.length > 1 ? rest[0] : null
  const field = rest.at(-1)

  // Add context based on section
  const contexts = {
    nav: 'Navigation menu item',
    common: 'Common UI element',
    classes: 'Classes page',
    students: 'Students page',
    parents: 'Parents page',
    directory: 'Families directory page',
    staff: 'Staff directory page',
    committees: 'Committees page',
    themes: 'Theme selector',
    dashboard: 'Dashboard page',
    auth: 'Authentication flow',
    validation: 'Form validation message',
    profile: 'User profile page',
    admin: 'Administration panel',
    updateForm: 'Parent information update form',
    updateSuccess: 'Update success page',
    staffUpdate: 'Staff information update form',
    map: 'Family map page',
    feedback: 'Feedback system',
    footer: 'Page footer',
    languageSelector: 'Language selector component',
    messages: 'Messaging system',
    easterEgg: 'Easter egg feature',
    pwa: 'Progressive Web App feature'
  }

  const context = contexts[section] || 'Application'
  parts.push(context)

  // Add specific purpose hints
  if (field.includes('title') || field.includes('Title')) {
    parts.push('- Page or section title')
  } else if (field.includes('description') || field.includes('Description')) {
    parts.push('- Descriptive text')
  } else if (field.includes('button') || field.includes('Button')) {
    parts.push('- Button label')
  } else if (field.includes('placeholder') || field.includes('Placeholder')) {
    parts.push('- Input field placeholder text')
  } else if (field.includes('error') || field.includes('Error')) {
    parts.push('- Error message')
  } else if (field.includes('loading') || field.includes('Loading')) {
    parts.push('- Loading indicator message')
  } else if (field.includes('success') || field.includes('Success')) {
    parts.push('- Success message')
  } else if (field.includes('warning') || field.includes('Warning')) {
    parts.push('- Warning message')
  }

  // Add parameter documentation
  const params = parameterMap[key]
  if (params && params.length > 0) {
    parts.push(`- Parameters: ${params.map((p, i) => `$${i + 1} = ${p}`).join(', ')}`)
  }

  // Add pluralization note
  if (typeof value === 'string' && value.includes('PLURAL')) {
    parts.push('- Supports plural forms based on count')
  }

  // Add notes for specific patterns
  if (field.includes('Count') || field.includes('Loaded')) {
    parts.push('- Displays count of items')
  }

  if (field === 'firstName' || field === 'lastName' || field === 'name') {
    parts.push('- Label for name field')
  }

  if (field === 'email') {
    parts.push('- Label for email field')
  }

  if (field === 'phone') {
    parts.push('- Label for phone number field')
  }

  if (section === 'validation') {
    parts.push('- Shown when validation fails')
  }

  // French-specific capitalization note
  if (section === 'nav' || section === 'common') {
    parts.push('- French: Use sentence case (capitalize first word only)')
  }

  return parts.join('. ')
}

/**
 * Recursively build qqq documentation object
 */
function buildQqqDocumentation(obj, parameterMap, prefix = '') {
  const qqq = {}

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively process nested objects
      qqq[key] = buildQqqDocumentation(value, parameterMap, fullKey)
    } else {
      // Generate documentation for this key
      qqq[key] = generateDocumentation(fullKey, value, parameterMap)
    }
  }

  return qqq
}

/**
 * Main function
 */
function main() {
  console.log('📝 Generating qqq.json message documentation...\n')

  // Read English translations as base structure
  const enFile = path.join(LOCALES_DIR, 'en.json')
  const translations = JSON.parse(fs.readFileSync(enFile, 'utf8'))

  // Read parameter mapping
  const mappingFile = path.join(LOCALES_DIR, 'parameter-mapping.json')
  const parameterMaps = JSON.parse(fs.readFileSync(mappingFile, 'utf8'))
  const parameterMap = parameterMaps.en || {}

  // Build qqq documentation
  const qqq = {
    '@metadata': {
      authors: ['Claude Code'],
      description: 'Message documentation for the B2 School Directory application. This file documents each translation key to help translators understand context and usage.'
    },
    ...buildQqqDocumentation(translations, parameterMap)
  }

  // Write qqq.json file
  const qqqFile = path.join(LOCALES_DIR, 'qqq.json')
  fs.writeFileSync(qqqFile, JSON.stringify(qqq, null, 2) + '\n', 'utf8')

  console.log(`✅ Generated qqq.json with ${Object.keys(translations).length} main sections`)
  console.log(`   File: ${qqqFile}`)
  console.log(`   Total documented keys: ~${countKeys(translations)} keys`)
  console.log('\n📚 Documentation includes:')
  console.log('   - Context for each message (which page/component)')
  console.log('   - Parameter descriptions (what each $1, $2 represents)')
  console.log('   - Special notes (pluralization, validation, etc.)')
  console.log('   - French capitalization guidelines')
  console.log('\n✨ qqq.json generation complete!')
}

/**
 * Count total keys in nested object
 */
function countKeys(obj) {
  let count = 0
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      count += countKeys(value)
    } else {
      count++
    }
  }
  return count
}

// Run the generation
try {
  main()
} catch (error) {
  console.error('❌ Error generating qqq.json:', error)
  process.exit(1)
}
