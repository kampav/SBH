// scripts/generate-icons.mjs
// Generates HealthOS app icons (PNG + WebP) in all required sizes using SVG + sharp.
// Run: node scripts/generate-icons.mjs
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'icons')

const SIZES = [48, 72, 96, 128, 192, 256, 512]

function makeSvg(size) {
  const r = Math.round(size * 0.22)
  const pad = Math.round(size * 0.08)
  const fontSize = Math.round(size * 0.52)
  const dotR = Math.round(size * 0.075)
  const dotCX = size - pad - dotR
  const dotCY = size - pad - dotR
  // small OS text size
  const osFontSize = Math.round(size * 0.155)
  const osY = size - pad - dotR * 2.5

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d0820"/>
      <stop offset="100%" stop-color="#060A12"/>
    </linearGradient>
    <radialGradient id="glow" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.04"/>
    </radialGradient>
    <linearGradient id="hgrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c4b5fd"/>
      <stop offset="45%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <linearGradient id="dotgrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <clipPath id="rounded">
      <rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" rx="${r}" ry="${r}"/>
    </clipPath>
  </defs>

  <!-- Background -->
  <rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" rx="${r}" ry="${r}" fill="url(#bg)"/>
  <!-- Glow overlay -->
  <rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" rx="${r}" ry="${r}" fill="url(#glow)"/>

  <!-- H letter -->
  <text
    x="${Math.round(size * 0.49)}"
    y="${Math.round(size * 0.555)}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${fontSize}"
    font-weight="900"
    text-anchor="middle"
    dominant-baseline="middle"
    fill="url(#hgrad)"
  >H</text>

  <!-- Accent dot (bottom-right) -->
  <circle cx="${dotCX}" cy="${dotCY}" r="${dotR}" fill="url(#dotgrad)"/>
</svg>`
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  for (const size of SIZES) {
    process.stdout.write(`Generating ${size}×${size}… `)
    const svg = Buffer.from(makeSvg(size))

    const pngPath = path.join(OUT_DIR, `icon-${size}.png`)
    const webpPath = path.join(OUT_DIR, `icon-${size}.webp`)

    await sharp(svg).png().toFile(pngPath)
    await sharp(svg).webp({ quality: 92 }).toFile(webpPath)

    console.log('✓')
  }

  console.log('\nAll icons generated in public/icons/')
}

main().catch(err => {
  console.error('Icon generation failed:', err.message)
  process.exit(1)
})
