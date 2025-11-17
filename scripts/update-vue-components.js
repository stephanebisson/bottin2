/**
 * Update Vue components to use $i18n() instead of $t()
 *
 * This script:
 * 1. Finds all Vue files using $t() or t()
 * 2. Replaces $t() with $i18n() in templates
 * 3. Removes useI18n imports and usage
 * 4. Updates parameter passing from object to positional
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SRC_DIR = path.join(__dirname, '../src')

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
 * Update a single Vue file
 */
function updateVueFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false

  // 1. Replace $t( with $i18n( in templates and script
  const before = content
  content = content.replace(/\$t\(/g, '$i18n(')
  if (content !== before) {
    modified = true
  }

  // 2. Remove useI18n import
  const importPattern = /import\s+\{[^}]*useI18n[^}]*\}\s+from\s+['"]@\/composables\/useI18n['"]\s*\n?/g
  if (importPattern.test(content)) {
    content = content.replace(importPattern, '')
    modified = true
  }

  // 3. Remove useI18n usage (const { t, locale } = useI18n())
  const useI18nPattern = /const\s+\{[^}]*\}\s*=\s*useI18n\(\)\s*\n?/g
  if (useI18nPattern.test(content)) {
    content = content.replace(useI18nPattern, '')
    modified = true
  }

  // 4. Replace t( with $i18n( in script sections
  const tFunctionPattern = /\bt\(/g
  if (tFunctionPattern.test(content)) {
    content = content.replace(tFunctionPattern, '$i18n(')
    modified = true
  }

  return { content, modified }
}

/**
 * Main function
 */
function main() {
  console.log('🔄 Updating Vue components to use vue-banana-i18n...\n')

  // Find all Vue files
  const vueFiles = findVueFiles(SRC_DIR)

  console.log(`📁 Found ${vueFiles.length} Vue files\n`)

  let updatedCount = 0
  const updatedFiles = []

  for (const file of vueFiles) {
    const relativePath = path.relative(SRC_DIR, file)
    const { content, modified } = updateVueFile(file)

    if (modified) {
      fs.writeFileSync(file, content, 'utf8')
      updatedCount++
      updatedFiles.push(relativePath)
      console.log(`✅ Updated: ${relativePath}`)
    }
  }

  console.log(`\n✨ Component update complete!`)
  console.log(`   Updated: ${updatedCount} files`)
  console.log(`   Unchanged: ${vueFiles.length - updatedCount} files`)

  if (updatedFiles.length > 0) {
    console.log('\n📝 Updated files:')
    for (const file of updatedFiles) {console.log(`   - ${file}`)}
  }

  console.log('\n⚠️  Note: Parameter conversion from object to positional must be done manually.')
  console.log('   Example: $i18n("key", { count: 5 }) → $i18n("key", 5)')
  console.log('   Refer to parameter-mapping.json for parameter order.')
}

// Run the update
try {
  main()
} catch (error) {
  console.error('❌ Error updating components:', error)
  process.exit(1)
}
