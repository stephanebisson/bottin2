/**
 * Conversion script for migrating i18n translations to vue-banana-i18n format
 *
 * This script converts:
 * - Named parameters {param} → Positional parameters $1, $2, $3
 * - Pluralization patterns → {{PLURAL:$1|singular|plural}} format
 * - Pipe syntax for plurals → Banana-i18n plural format
 *
 * Generates:
 * - Converted translation files (en.json, fr.json)
 * - Parameter mapping file for reference
 * - Backup of original files
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOCALES_DIR = path.join(__dirname, '../src/locales')
const BACKUP_DIR = path.join(__dirname, '../src/locales/backup')

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

/**
 * Extract parameter names from a translation string
 * @param {string} str - Translation string with {param} placeholders
 * @returns {string[]} - Array of parameter names in order of appearance
 */
function extractParameters(str) {
  const regex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g
  const params = []
  let match

  while ((match = regex.exec(str)) !== null) {
    if (!params.includes(match[1])) {
      params.push(match[1])
    }
  }

  return params
}

/**
 * Convert named parameters to positional parameters
 * @param {string} str - Translation string
 * @param {string[]} params - Ordered list of parameter names
 * @returns {string} - String with $1, $2, $3 instead of {param}
 */
function convertToPositionalParams(str, params) {
  let result = str
  for (const [index, param] of params.entries()) {
    const regex = new RegExp(`\\{${param}\\}`, 'g')
    result = result.replace(regex, `$${index + 1}`)
  }
  return result
}

/**
 * Detect and convert pluralization patterns
 * Handles two patterns:
 * 1. Separate keys: "key": "{count} item" + "keyPlural": "{count} items"
 * 2. Pipe syntax: "key": "{count} item | {count} items"
 */
function convertPluralization(translations, locale) {
  const converted = {}
  const processed = new Set()

  for (const [fullKey, value] of Object.entries(translations)) {
    // Skip if already processed
    if (processed.has(fullKey)) {continue}

    // Handle pipe syntax: "{count} enfant | {count} enfants"
    if (typeof value === 'string' && value.includes('|')) {
      const parts = value.split('|').map(p => p.trim())
      if (parts.length === 2) {
        // Extract parameter (usually {count})
        const params = extractParameters(parts[0])
        if (params.length === 1) {
          const singular = convertToPositionalParams(parts[0], params)
          const plural = convertToPositionalParams(parts[1], params)

          // Create banana-i18n plural format
          converted[fullKey] = `{{PLURAL:$1|${singular}|${plural}}}`
          processed.add(fullKey)
          continue
        }
      }
    }

    // Handle separate plural keys: "key" and "keyPlural"
    if (fullKey.endsWith('Plural')) {
      processed.add(fullKey)
      continue // Skip, will be handled by base key
    }

    const pluralKey = fullKey + 'Plural'
    if (translations[pluralKey]) {
      // Found a plural pair
      const singular = value
      const plural = translations[pluralKey]

      // Extract parameters (should be same for both)
      const params = extractParameters(singular)
      const singularConverted = convertToPositionalParams(singular, params)
      const pluralConverted = convertToPositionalParams(plural, params)

      // Create banana-i18n plural format
      converted[fullKey] = `{{PLURAL:$1|${singularConverted}|${pluralConverted}}}`
      processed.add(fullKey)
      processed.add(pluralKey)
    }
  }

  return { converted, processed }
}

/**
 * Convert a nested translation object
 * @param {Object} obj - Translation object
 * @param {string} locale - Locale code (for context)
 * @param {string} prefix - Key prefix for nested objects
 * @param {Object} parameterMap - Map to store parameter order for each key
 * @returns {Object} - Converted translation object
 */
function convertTranslations(obj, locale, prefix = '', parameterMap = {}) {
  const result = {}

  // First pass: identify and convert pluralization patterns
  const flatTranslations = {}
  function flattenObject(o, p = '') {
    for (const [key, value] of Object.entries(o)) {
      const fullKey = p ? `${p}.${key}` : key
      if (typeof value === 'object' && value !== null) {
        flattenObject(value, fullKey)
      } else {
        flatTranslations[fullKey] = value
      }
    }
  }
  flattenObject(obj, prefix)

  const { converted: pluralConversions, processed: processedKeys } = convertPluralization(flatTranslations, locale)

  // Second pass: convert all translations
  function processObject(o, p = '') {
    const converted = {}

    for (const [key, value] of Object.entries(o)) {
      const fullKey = p ? `${p}.${key}` : key

      // Skip if this key was processed as part of a plural pair
      if (processedKeys.has(fullKey)) {
        // Use the converted plural version if this is the base key
        if (!fullKey.endsWith('Plural') && pluralConversions[fullKey]) {
          converted[key] = pluralConversions[fullKey]
          // Store parameter mapping
          parameterMap[fullKey] = ['count']
        }
        continue
      }

      if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        converted[key] = processObject(value, fullKey)
      } else if (typeof value === 'string') {
        // Extract parameters
        const params = extractParameters(value)

        // Convert to positional parameters
        const convertedValue = convertToPositionalParams(value, params)

        converted[key] = convertedValue

        // Store parameter mapping if parameters exist
        if (params.length > 0) {
          parameterMap[fullKey] = params
        }
      } else {
        // Keep non-string values as-is
        converted[key] = value
      }
    }

    return converted
  }

  return processObject(obj)
}

/**
 * Main conversion function
 */
function main() {
  console.log('🔄 Starting i18n conversion to vue-banana-i18n format...\n')

  const locales = ['en', 'fr']
  const parameterMaps = {}

  for (const locale of locales) {
    const inputFile = path.join(LOCALES_DIR, `${locale}.json`)
    const outputFile = path.join(LOCALES_DIR, `${locale}.json`)
    const backupFile = path.join(BACKUP_DIR, `${locale}.json.backup`)

    console.log(`📖 Processing ${locale}.json...`)

    // Read original file
    const originalContent = fs.readFileSync(inputFile, 'utf8')
    const translations = JSON.parse(originalContent)

    // Create backup
    fs.writeFileSync(backupFile, originalContent, 'utf8')
    console.log(`   ✅ Backup created: ${backupFile}`)

    // Convert translations
    const parameterMap = {}
    const converted = convertTranslations(translations, locale, '', parameterMap)
    parameterMaps[locale] = parameterMap

    // Write converted file
    fs.writeFileSync(outputFile, JSON.stringify(converted, null, 2) + '\n', 'utf8')
    console.log(`   ✅ Converted file written: ${outputFile}`)
    console.log(`   📊 Parameters mapped: ${Object.keys(parameterMap).length} keys\n`)
  }

  // Write parameter mapping file
  const mappingFile = path.join(LOCALES_DIR, 'parameter-mapping.json')
  fs.writeFileSync(
    mappingFile,
    JSON.stringify(parameterMaps, null, 2) + '\n',
    'utf8'
  )
  console.log(`📋 Parameter mapping written: ${mappingFile}`)

  // Generate summary
  console.log('\n✨ Conversion complete!')
  console.log('\n📝 Summary:')
  console.log(`   - Original files backed up to: ${BACKUP_DIR}`)
  console.log(`   - Converted files: ${locales.map(l => `${l}.json`).join(', ')}`)
  console.log(`   - Parameter mappings saved for component updates`)
  console.log(`   - Total translations with parameters:`)
  for (const locale of locales) {
    console.log(`     - ${locale}: ${Object.keys(parameterMaps[locale]).length} keys`)
  }

  console.log('\n🔍 Next steps:')
  console.log('   1. Review converted translation files')
  console.log('   2. Generate qqq.json documentation')
  console.log('   3. Update plugin configuration')
  console.log('   4. Update Vue components to use $i18n()')
}

// Run the conversion
try {
  main()
} catch (error) {
  console.error('❌ Error during conversion:', error)
  process.exit(1)
}
