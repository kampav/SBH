#!/usr/bin/env node
// scripts/typesense-import.mjs
// Imports FOOD_DATABASE into the Typesense `foods` collection.
// Run AFTER typesense-setup.mjs.
//
// Usage:
//   TYPESENSE_URL=https://xxx.a1.typesense.net TYPESENSE_API_KEY=<admin-key> node scripts/typesense-import.mjs
//
// Uses the JSONL bulk import endpoint for efficiency.

import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { pathToFileURL } from 'url'

const TYPESENSE_URL     = process.env.TYPESENSE_URL
const TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY

if (!TYPESENSE_URL || !TYPESENSE_API_KEY) {
  console.error('Error: TYPESENSE_URL and TYPESENSE_API_KEY must be set.')
  process.exit(1)
}

// ── Load food database via dynamic import of compiled JS ─────────────────────
// We read the TypeScript source and use a lightweight inline transform so this
// script can run without tsx/ts-node in a plain node environment.
// If you have tsx installed, you can also run: tsx scripts/typesense-import.mjs

let FOOD_DATABASE

try {
  // Try loading from dist/compiled if next build has run
  const require = createRequire(import.meta.url)
  // Attempt to load from .next standalone if available
  const dbPath = new URL('../lib/foodDatabase', import.meta.url)
  // Fallback: parse TS file inline (strip types)
  throw new Error('use inline parser')
} catch {
  // Parse the TypeScript file inline — strip type annotations, eval the JS
  const src = readFileSync(new URL('../lib/foodDatabase.ts', import.meta.url), 'utf8')
  // Remove TypeScript-specific syntax
  const js = src
    .replace(/^export type [^;]+;/gm, '')            // remove type alias exports
    .replace(/^export interface [\s\S]*?^\}/gm, '')  // remove interface blocks
    .replace(/: \w+(\[\])?(\s*[,=\)])/g, '$2')       // strip inline type annotations
    .replace(/: 'string' \| [^,;\n]+/g, '')          // remove union type annotations
    .replace(/export const /g, 'const ')
    .replace(/export \{[^}]+\}/g, '')
  // eslint-disable-next-line no-eval
  const mod = {}
  const fn  = new Function('module', 'exports', js + '\nmodule.exports = { FOOD_DATABASE, LOWER_GI_SWAPS }')
  fn(mod, mod)
  FOOD_DATABASE = mod.exports?.FOOD_DATABASE
}

if (!Array.isArray(FOOD_DATABASE) || FOOD_DATABASE.length === 0) {
  console.error('Failed to load FOOD_DATABASE. Run this script from the project root.')
  process.exit(1)
}

const headers = {
  'Content-Type': 'text/plain',
  'X-TYPESENSE-API-KEY': TYPESENSE_API_KEY,
}

async function main() {
  console.log(`Importing ${FOOD_DATABASE.length} food entries into Typesense...`)

  // Build JSONL — each line is one document
  const jsonl = FOOD_DATABASE.map((food, idx) =>
    JSON.stringify({
      id:          String(idx + 1),
      name:        food.name,
      calories:    food.calories,
      proteinG:    food.proteinG,
      carbsG:      food.carbsG,
      fatG:        food.fatG,
      servingSize: food.servingSize,
      emoji:       food.emoji,
      category:    food.category,
      tags:        food.tags,
      gi:          food.gi    ?? undefined,
      fibreG:      food.fibreG ?? undefined,
    })
  ).join('\n')

  const res = await fetch(
    `${TYPESENSE_URL}/collections/foods/documents/import?action=upsert`,
    { method: 'POST', headers, body: jsonl },
  )

  if (!res.ok) {
    console.error('Import request failed:', res.status, await res.text())
    process.exit(1)
  }

  const text = await res.text()
  const lines = text.trim().split('\n')
  const results = lines.map(l => { try { return JSON.parse(l) } catch { return { success: false, error: l } } })

  const succeeded = results.filter(r => r.success).length
  const failed    = results.filter(r => !r.success)

  console.log(`  Imported: ${succeeded}/${FOOD_DATABASE.length} documents`)

  if (failed.length > 0) {
    console.warn('  Failed documents:')
    failed.forEach(f => console.warn('   ', f))
  }

  console.log('\nImport complete!')
  console.log('Test with:')
  console.log(`  curl "${TYPESENSE_URL}/collections/foods/documents/search?q=chicken&query_by=name,tags" \\`)
  console.log(`       -H "X-TYPESENSE-API-KEY: <your-search-only-key>"`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
