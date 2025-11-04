import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

// Paths
const svgPath = join(__dirname, '../public/favicon.svg')
const iconsDir = join(__dirname, '../public/icons')

// Create icons directory if it doesn't exist
try {
  mkdirSync(iconsDir, { recursive: true })
  console.log('✅ Created icons directory')
} catch (error) {
  if (error.code !== 'EEXIST') {throw error}
}

// Read SVG file
const svgBuffer = readFileSync(svgPath)

// Generate icons
console.log('🎨 Generating PWA icons...\n')

const promises = sizes.map(async size => {
  const outputPath = join(iconsDir, `icon-${size}x${size}.png`)

  try {
    await sharp(svgBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(outputPath)

    console.log(`✅ Generated ${size}x${size} icon`)
  } catch (error) {
    console.error(`❌ Failed to generate ${size}x${size} icon:`, error.message)
  }
})

await Promise.all(promises)

console.log('\n🎉 All PWA icons generated successfully!')
