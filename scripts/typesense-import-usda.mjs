#!/usr/bin/env node
/**
 * scripts/typesense-import-usda.mjs
 *
 * Import USDA FoodData Central JSON into the Typesense `foods` collection.
 *
 * Data source: https://fdc.nal.usda.gov/download-data
 *   → FoodData Central "Foundation Foods" JSON (foundation_food.json)
 *   → or "SR Legacy" JSON (sr_legacy_food.json)
 *
 * Usage:
 *   1. Download foundation_food.json (or sr_legacy_food.json) from the USDA site
 *   2. Place it in the project root or pass the path as an argument
 *   3. TYPESENSE_URL and TYPESENSE_API_KEY must be set in the environment
 *      (or copied from .env.local if you have that file)
 *
 *   node scripts/typesense-import-usda.mjs [path/to/foundation_food.json]
 *
 * Notes:
 *   - Sends documents in batches of 250 (JSONL bulk endpoint)
 *   - Maps USDA nutrient IDs to the SBH schema (calories, protein, carbs, fat, fibre, sodium)
 *   - GI estimate is NOT in USDA data — field is omitted (will default to null in Typesense)
 *   - Run scripts/typesense-setup.mjs first to ensure the collection exists
 */

import fs   from 'fs'
import path from 'path'

// ── Config ───────────────────────────────────────────────────────────────────

const TYPESENSE_URL = process.env.TYPESENSE_URL
const TYPESENSE_KEY = process.env.TYPESENSE_API_KEY
const BATCH_SIZE    = 250

if (!TYPESENSE_URL || !TYPESENSE_KEY) {
  console.error('❌  TYPESENSE_URL and TYPESENSE_API_KEY must be set in the environment.')
  process.exit(1)
}

// ── USDA nutrient ID → SBH field map ─────────────────────────────────────────
// USDA nutrient IDs (from Foundation Foods / SR Legacy):
//   1008 = Energy (kcal)
//   1003 = Protein (g)
//   1005 = Carbohydrate, by difference (g)
//   1004 = Total lipid (fat) (g)
//   1079 = Fiber, total dietary (g)
//   1093 = Sodium, Na (mg)
//   2000 = Sugars, total including NLEA (g)

const NUTRIENT_MAP = {
  1008: 'calories',
  1003: 'proteinG',
  1005: 'carbsG',
  1004: 'fatG',
  1079: 'fibreG',
  1093: 'sodiumMg',
  2000: 'freeSugarsG',
}

// ── Parse USDA JSON ───────────────────────────────────────────────────────────

function parseUSDA(jsonPath) {
  console.log(`📂 Reading ${jsonPath}…`)
  const raw  = fs.readFileSync(jsonPath, 'utf8')
  const json = JSON.parse(raw)

  // Foundation Foods format: { FoundationFoods: [...] }
  // SR Legacy format:        { SRLegacyFoods:   [...] }
  // Branded Foods format:    { BrandedFoods:    [...] }
  const foods =
    json.FoundationFoods   ??
    json.SRLegacyFoods     ??
    json.BrandedFoods      ??
    (Array.isArray(json) ? json : null)

  if (!foods) {
    console.error('❌  Unrecognised USDA JSON format. Expected FoundationFoods, SRLegacyFoods, or BrandedFoods key.')
    process.exit(1)
  }

  console.log(`📊 ${foods.length} food items found`)
  return foods
}

// ── Map a single USDA food item to SBH Typesense schema ──────────────────────

function mapFood(item) {
  const nutrientValues = {}
  const nutrients = item.foodNutrients ?? item.nutrients ?? []
  for (const n of nutrients) {
    const id     = n.nutrient?.id ?? n.nutrientId ?? n.id
    const amount = n.amount ?? n.value ?? 0
    const field  = NUTRIENT_MAP[id]
    if (field) nutrientValues[field] = Math.round(amount * 10) / 10
  }

  const calories = nutrientValues.calories ?? 0

  // Skip items with no meaningful nutritional data
  if (calories === 0 && !nutrientValues.proteinG) return null

  // Build category tag from USDA food category
  const cat  = item.foodCategory?.description ?? item.wweiaFoodCategory?.wweiaFoodCategoryDescription ?? ''
  const tags = cat ? [cat.toLowerCase().slice(0, 30)] : []

  return {
    id:          String(item.fdcId),
    name:        (item.description ?? item.lowercaseDescription ?? 'Unknown').slice(0, 120),
    tags,
    calories:    Math.round(calories),
    proteinG:    nutrientValues.proteinG   ?? 0,
    carbsG:      nutrientValues.carbsG     ?? 0,
    fatG:        nutrientValues.fatG       ?? 0,
    fibreG:      nutrientValues.fibreG     ?? null,
    sodiumMg:    nutrientValues.sodiumMg   ?? null,
    freeSugarsG: nutrientValues.freeSugarsG ?? null,
    category:    'usda',
    servingG:    100,
  }
}

// ── Bulk upsert to Typesense ──────────────────────────────────────────────────

async function bulkUpsert(batch) {
  const jsonl = batch.map(d => JSON.stringify(d)).join('\n')
  const res   = await fetch(
    `${TYPESENSE_URL}/collections/foods/documents/import?action=upsert`,
    {
      method:  'POST',
      headers: {
        'X-TYPESENSE-API-KEY': TYPESENSE_KEY,
        'Content-Type':        'text/plain',
      },
      body: jsonl,
    },
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Typesense HTTP ${res.status}: ${err}`)
  }

  const lines = (await res.text()).split('\n').filter(Boolean)
  const ok    = lines.filter(l => { try { return JSON.parse(l).success } catch { return false } }).length
  const fail  = lines.length - ok
  return { ok, fail }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const jsonPath = process.argv[2] ?? path.join(process.cwd(), 'foundation_food.json')

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌  File not found: ${jsonPath}`)
    console.error('   Download from https://fdc.nal.usda.gov/download-data (Foundation Foods JSON)')
    process.exit(1)
  }

  const usdaFoods = parseUSDA(jsonPath)
  const mapped    = usdaFoods.map(mapFood).filter(Boolean)
  console.log(`✅ ${mapped.length} items mapped (${usdaFoods.length - mapped.length} skipped — no calorie data)`)

  let totalOk   = 0
  let totalFail = 0
  const batches = Math.ceil(mapped.length / BATCH_SIZE)

  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const batch     = mapped.slice(i, i + BATCH_SIZE)
    const batchNum  = Math.floor(i / BATCH_SIZE) + 1
    process.stdout.write(`\r⬆️  Uploading batch ${batchNum}/${batches}…`)
    const { ok, fail } = await bulkUpsert(batch)
    totalOk   += ok
    totalFail += fail
  }

  console.log(`\n\n🎉 Done! ${totalOk} upserted, ${totalFail} failed`)
  if (totalFail > 0) {
    console.warn(`⚠️  ${totalFail} documents failed. Re-run to retry.`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
