// Builds the home-screen icons from the school logo: black logo on a white square.
// Run with: node scripts/generate-pwa-icons.js
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const logoPath = join(__dirname, '../src/assets/EF_logo.jpg')
const iconsDir = join(__dirname, '../public/icons')

// Logo width as a share of the icon. Maskable icons get more margin because
// Android crops them to a circle or rounded square (safe zone: centre 80%).
const icons = [
  { file: 'icon-192x192.png', size: 192, logo: 0.8 },
  { file: 'icon-512x512.png', size: 512, logo: 0.8 },
  { file: 'icon-maskable-192x192.png', size: 192, logo: 0.66 },
  { file: 'icon-maskable-512x512.png', size: 512, logo: 0.66 },
  // iOS rounds the corners itself and fills transparency with black
  { file: 'apple-touch-icon.png', size: 180, logo: 0.8 },
]

mkdirSync(iconsDir, { recursive: true })

// The logo is a CMYK JPEG on a white background; convert it once to a square sRGB image
const logo = await sharp(logoPath)
  .toColourspace('srgb')
  .flatten({ background: '#ffffff' })
  .resize(1400, 1400, { fit: 'contain', background: '#ffffff' })
  .png()
  .toBuffer()

for (const { file, size, logo: ratio } of icons) {
  const logoSize = Math.round(size * ratio)
  const resizedLogo = await sharp(logo).resize(logoSize, logoSize).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 3, background: '#ffffff' } })
    .composite([{ input: resizedLogo, gravity: 'centre' }])
    .png()
    .toFile(join(iconsDir, file))
  console.log(`✅ ${file}`)
}
