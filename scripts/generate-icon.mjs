/**
 * Generates public/icons/icon.png — the 1024×1024 source icon for
 * @capacitor/assets which then produces all Android icon sizes.
 *
 * Run: node scripts/generate-icon.mjs
 */
import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const SIZE = 1024
const VIOLET = '#7c3aed'
const CYAN   = '#06b6d4'
const BG     = '#0d0b1e'

// Build SVG in memory — sharp accepts SVG buffers directly
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${VIOLET}"/>
      <stop offset="100%" stop-color="${CYAN}"/>
    </linearGradient>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${VIOLET}"/>
      <stop offset="100%" stop-color="${CYAN}"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${SIZE}" height="${SIZE}" rx="230" fill="${BG}"/>

  <!-- Outer glow ring -->
  <circle cx="${SIZE/2}" cy="${SIZE/2}" r="420" fill="none"
    stroke="url(#grad)" stroke-width="3" opacity="0.25"/>

  <!-- Mid glow ring -->
  <circle cx="${SIZE/2}" cy="${SIZE/2}" r="340" fill="url(#grad)" opacity="0.08"/>

  <!-- Inner accent circle -->
  <circle cx="${SIZE/2}" cy="${SIZE/2}" r="260" fill="url(#grad)" opacity="0.12"/>

  <!-- SBH letters -->
  <text x="${SIZE/2}" y="590"
    font-family="Arial Black, Arial, sans-serif"
    font-weight="900"
    font-size="310"
    fill="url(#textGrad)"
    text-anchor="middle"
    letter-spacing="-10">SBH</text>

  <!-- Tagline -->
  <text x="${SIZE/2}" y="690"
    font-family="Arial, sans-serif"
    font-weight="400"
    font-size="52"
    fill="#94a3b8"
    text-anchor="middle"
    letter-spacing="14">SCIENCE BASED HEALTH</text>
</svg>`

// Generate all required sizes from the single SVG
const sizes = [
  { name: 'icon.png',     size: 1024 },
  { name: 'icon-192.png', size: 192  },
  { name: 'icon-512.png', size: 512  },
]

for (const { name, size } of sizes) {
  const outPath = join(outDir, name)
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outPath)
  console.log(`✓ Generated ${outPath} (${size}×${size})`)
}

console.log('\nAll icons generated. Now run:')
console.log('  npx cap add android')
console.log('  npm run android:icons')
console.log('  npx cap sync android')
