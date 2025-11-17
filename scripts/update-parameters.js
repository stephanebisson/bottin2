/**
 * Convert parameter passing from object notation to positional
 *
 * Converts: $i18n('key', { param1: value1, param2: value2 })
 * To: $i18n('key', value1, value2)
 *
 * Uses parameter-mapping.json to determine correct order
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SRC_DIR = path.join(__dirname, '../src')
const LOCALES_DIR = path.join(__dirname, '../src/locales')

/**
 * Recursively find all Vue files
 */
function findVueFiles(dir, files = []) {
  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory() && item !== 'node_modules') {
      findVueFiles(fullPath, files)
    } else if (stat.isFile() && item.endsWith('.vue')) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Convert parameter syntax in a Vue file
 */
function convertParameters(content, parameterMap) {
  let modified = false

  // Match $i18n('key', { params }) patterns
  const pattern = /\$i18n\(\s*['"]([^'"]+)['"]\s*,\s*\{([^}]+)\}\s*\)/g

  content = content.replace(pattern, (match, key, paramsString) => {
    // Check if we have parameter mapping for this key
    if (!parameterMap[key]) {
      // No mapping, leave as is
      return match
    }

    const expectedParams = parameterMap[key]

    // Parse the object parameters
    const paramPairs = paramsString
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0)

    const parsedParams = {}
    for (const pair of paramPairs) {
      const colonIndex = pair.indexOf(':')
      if (colonIndex > 0) {
        const paramName = pair.slice(0, Math.max(0, colonIndex)).trim()
        const paramValue = pair.slice(Math.max(0, colonIndex + 1)).trim()
        parsedParams[paramName] = paramValue
      }
    }

    // Build positional parameters in correct order
    const positionalParams = expectedParams.map(paramName => {
      return parsedParams[paramName] || 'undefined'
    })

    modified = true
    return `$i18n('${key}', ${positionalParams.join(', ')})`
  })

  return { content, modified }
}

/**
 * Main function
 */
function main() {
  console.log('🔄 Converting parameter syntax to positional...\n')

  // Read parameter mapping
  const mappingFile = path.join(LOCALES_DIR, 'parameter-mapping.json')
  const parameterMaps = JSON.parse(fs.readFileSync(mappingFile, 'utf8'))
  const parameterMap = parameterMaps.en || {}

  console.log(`📋 Loaded ${Object.keys(parameterMap).length} parameter mappings\n`)

  // Find all Vue files
  const vueFiles = findVueFiles(SRC_DIR)
  console.log(`📁 Found ${vueFiles.length} Vue files\n`)

  let updatedCount = 0
  const updatedFiles = []

  for (const file of vueFiles) {
    const relativePath = path.relative(SRC_DIR, file)
    const content = fs.readFileSync(file, 'utf8')

    const { content: newContent, modified } = convertParameters(content, parameterMap)

    if (modified) {
      fs.writeFileSync(file, newContent, 'utf8')
      updatedCount++
      updatedFiles.push(relativePath)
      console.log(`✅ Updated: ${relativePath}`)
    }
  }

  console.log(`\n✨ Parameter conversion complete!`)
  console.log(`   Updated: ${updatedCount} files`)
  console.log(`   Unchanged: ${vueFiles.length - updatedCount} files`)

  if (updatedFiles.length > 0) {
    console.log('\n📝 Updated files:')
    for (const file of updatedFiles) {console.log(`   - ${file}`)}
  }
}

// Run the update
try {
  main()
} catch (error) {
  console.error('❌ Error converting parameters:', error)
  process.exit(1)
}
