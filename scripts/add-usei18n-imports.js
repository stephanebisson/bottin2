/**
 * Add useI18n import to all Vue files that use $i18n in script sections
 * but don't have the import yet
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
 * Check if a Vue file needs useI18n import
 */
function needsUseI18n(content) {
  // Must have <script setup>
  if (!content.includes('<script setup>')) {
    return false
  }

  // Must use $i18n somewhere in script or template
  if (!content.includes('$i18n')) {
    return false
  }

  // Must NOT already have useI18n import
  if (content.includes("from 'vue-banana-i18n'")) {
    return false
  }

  // Must use $i18n in script section (not just template)
  const scriptMatch = content.match(/<script setup>([\s\S]*?)<\/script>/)
  if (!scriptMatch) {return false}

  const scriptContent = scriptMatch[1]

  // Check if $i18n is used in script (as a variable/function, not in strings/comments)
  return /(?:^|[^'"`])(\$i18n\()/.test(scriptContent)
}

/**
 * Add useI18n import and setup to a Vue file
 */
function addUseI18n(content) {
  // Find the script setup section
  const scriptMatch = content.match(/(<script setup>)([\s\S]*?)(<\/script>)/)
  if (!scriptMatch) {return content}

  const [, openTag, scriptContent, closeTag] = scriptMatch

  // Step 1: Add import after existing imports
  let newScriptContent = scriptContent

  // Find the last import statement
  const importLines = scriptContent.split('\n')
  let lastImportIndex = -1

  for (const [i, importLine] of importLines.entries()) {
    if (importLine.trim().startsWith('import ')) {
      lastImportIndex = i
    }
  }

  if (lastImportIndex >= 0) {
    // Insert after last import
    importLines.splice(lastImportIndex + 1, 0, "  import { useI18n } from 'vue-banana-i18n'")
    newScriptContent = importLines.join('\n')
  } else {
    // No imports, add at beginning
    newScriptContent = "\n  import { useI18n } from 'vue-banana-i18n'\n" + scriptContent
  }

  // Step 2: Add setup code after props/emits or after imports
  const lines = newScriptContent.split('\n')
  let insertIndex = -1

  // Find where to insert (after defineProps/defineEmits or after last import)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim()
    if (line.includes('defineEmits') || line.includes('defineProps')) {
      // Find the closing of this statement
      let depth = 0
      for (let j = i; j < lines.length; j++) {
        const l = lines[j]
        depth += (l.match(/\(/g) || []).length
        depth -= (l.match(/\)/g) || []).length
        if (depth === 0 && l.includes(')')) {
          insertIndex = j + 1
          break
        }
      }
      break
    }
  }

  // If no props/emits found, insert after imports
  if (insertIndex === -1) {
    for (const [i, line] of lines.entries()) {
      if (line.trim().startsWith('import ')) {
        insertIndex = i + 1
      }
    }
    // Find first non-import, non-empty line
    for (let i = insertIndex; i < lines.length; i++) {
      if (lines[i].trim() && !lines[i].trim().startsWith('import ')) {
        insertIndex = i
        break
      }
    }
  }

  if (insertIndex > 0) {
    const i18nSetup = [
      '',
      '  // Get i18n function from vue-banana-i18n',
      '  const bananaI18n = useI18n()',
      '  const $i18n = (key, ...params) => bananaI18n.i18n(key, ...params)'
    ]
    lines.splice(insertIndex, 0, ...i18nSetup)
    newScriptContent = lines.join('\n')
  }

  return content.replace(/<script setup>[\s\S]*?<\/script>/, openTag + newScriptContent + closeTag)
}

/**
 * Main function
 */
function main() {
  console.log('🔄 Adding useI18n imports to Vue files...\n')

  const vueFiles = findVueFiles(SRC_DIR)
  console.log(`📁 Found ${vueFiles.length} Vue files\n`)

  let updatedCount = 0
  const updatedFiles = []

  for (const file of vueFiles) {
    const relativePath = path.relative(SRC_DIR, file)
    const content = fs.readFileSync(file, 'utf8')

    if (needsUseI18n(content)) {
      const newContent = addUseI18n(content)
      fs.writeFileSync(file, newContent, 'utf8')
      updatedCount++
      updatedFiles.push(relativePath)
      console.log(`✅ Updated: ${relativePath}`)
    }
  }

  console.log(`\n✨ Import addition complete!`)
  console.log(`   Updated: ${updatedCount} files`)
  console.log(`   Unchanged: ${vueFiles.length - updatedCount} files`)

  if (updatedFiles.length > 0) {
    console.log('\n📝 Updated files:')
    for (const file of updatedFiles) {
      console.log(`   - ${file}`)
    }
  }
}

// Run the update
try {
  main()
} catch (error) {
  console.error('❌ Error adding imports:', error)
  throw error
}
