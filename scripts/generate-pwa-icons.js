// Builds the home-screen icons from the school logo (black logo on a white square)
// and favicon.ico from public/favicon.svg.
// Run with: node scripts/generate-pwa-icons.js
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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

// Browser-tab favicon: the logo's lettering is unreadable at 16px, so the tab uses
// public/favicon.svg (the logo's star). Browsers without SVG favicons get this .ico copy.
const faviconSvg = readFileSync(join(__dirname, '../public/favicon.svg'))
const faviconSizes = [16, 32, 48]
const faviconImages = await Promise.all(faviconSizes.map(size =>
  sharp(faviconSvg, { density: 300 }).resize(size, size).png().toBuffer(),
))
const header = Buffer.alloc(6 + 16 * faviconImages.length)
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(faviconImages.length, 4)
let offset = header.length
for (const [i, image] of faviconImages.entries()) {
  const entry = 6 + 16 * i
  header.writeUInt8(faviconSizes[i], entry) // width
  header.writeUInt8(faviconSizes[i], entry + 1) // height
  header.writeUInt16LE(1, entry + 4) // colour planes
  header.writeUInt16LE(32, entry + 6) // bits per pixel
  header.writeUInt32LE(image.length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += image.length
}
writeFileSync(join(__dirname, '../public/favicon.ico'), Buffer.concat([header, ...faviconImages]))
console.log('✅ favicon.ico')
