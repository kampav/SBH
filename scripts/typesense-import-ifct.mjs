#!/usr/bin/env node
/**
 * scripts/typesense-import-ifct.mjs
 *
 * Import IFCT (Indian Food Composition Tables 2017) data into the Typesense
 * `foods` collection.
 *
 * Data source: https://www.ifct2017.com  (free, licensed for non-commercial use)
 *   → Download the Excel/CSV files from the IFCT portal
 *   → Convert to JSON array with the structure shown below
 *
 * Expected JSON format (ifct_foods.json):
 * [
 *   {
 *     "food_code": "A001",
 *     "food_name": "Rice, raw, milled",
 *     "food_name_local": "चावल",    // optional
 *     "group": "Cereals and Millets",
 *     "energy_kcal": 345,
 *     "protein_g": 6.8,
 *     "carb_g": 78.2,
 *     "fat_g": 0.5,
 *     "fibre_g": 0.2,
 *     "sodium_mg": 5,
 *     "sugar_g": 0.1,       // optional
 *     "calcium_mg": 10,     // optional
 *     "iron_mg": 0.7,       // optional
 *     "vit_c_mg": 0         // optional
 *   },
 *   ...
 * ]
 *
 * Usage:
 *   node scripts/typesense-import-ifct.mjs [path/to/ifct_foods.json]
 *
 * Requires: TYPESENSE_URL and TYPESENSE_API_KEY in environment
 */

import fs   from 'fs'
import path from 'path'

// ── Config ───────────────────────────────────────────────────────────────────

const TYPESENSE_URL = process.env.TYPESENSE_URL
const TYPESENSE_KEY = process.env.TYPESENSE_API_KEY
const BATCH_SIZE    = 250

if (!TYPESENSE_URL || !TYPESENSE_KEY) {
  console.error('❌  TYPESENSE_URL and TYPESENSE_API_KEY must be set.')
  process.exit(1)
}

// ── IFCT food group → SBH category map ───────────────────────────────────────

const GROUP_CATEGORY_MAP = {
  'cereals and millets':          'carb',
  'starchy roots and tubers':     'carb',
  'legumes and legume products':  'protein',
  'nuts and oil seeds':           'nut_seed',
  'vegetables':                   'veg',
  'fruits':                       'fruit',
  'milk and milk products':       'dairy',
  'egg and egg products':         'protein',
  'meat and meat products':       'protein',
  'fish and fish products':       'protein',
  'fats, oils and their products':'fat',
  'sugar and sugar products':     'carb',
  'spices and condiments':        'veg',
  'miscellaneous foods':          'carb',
}

function mapCategory(group) {
  const key = (group ?? '').toLowerCase().trim()
  for (const [pattern, cat] of Object.entries(GROUP_CATEGORY_MAP)) {
    if (key.includes(pattern.split(' ')[0])) return cat
  }
  return 'carb'
}

// ── Parse IFCT JSON ───────────────────────────────────────────────────────────

function parseIFCT(jsonPath) {
  console.log(`📂 Reading ${jsonPath}…`)
  const raw   = fs.readFileSync(jsonPath, 'utf8')
  const foods = JSON.parse(raw)
  if (!Array.isArray(foods)) {
    console.error('❌  Expected a JSON array at the root of the file.')
    process.exit(1)
  }
  console.log(`📊 ${foods.length} IFCT entries found`)
  return foods
}

// ── Map a single IFCT record to SBH Typesense schema ─────────────────────────

let _idCounter = 1

function mapIFCT(item) {
  const calories = item.energy_kcal ?? item.energy ?? 0
  if (!calories && !item.protein_g) return null

  const tags = []
  if (item.group)           tags.push(item.group.toLowerCase().slice(0, 40))
  if (item.food_name_local) tags.push(item.food_name_local.slice(0, 30))

  return {
    id:          `ifct_${item.food_code ?? _idCounter++}`,
    name:        (item.food_name ?? item.name ?? 'Unknown').slice(0, 120),
    tags,
    calories:    Math.round(calories),
    proteinG:    Math.round((item.protein_g ?? 0) * 10) / 10,
    carbsG:      Math.round((item.carb_g ?? 0) * 10) / 10,
    fatG:        Math.round((item.fat_g ?? 0) * 10) / 10,
    fibreG:      item.fibre_g   != null ? Math.round(item.fibre_g * 10) / 10 : null,
    sodiumMg:    item.sodium_mg != null ? Math.round(item.sodium_mg) : null,
    freeSugarsG: item.sugar_g   != null ? Math.round(item.sugar_g * 10) / 10 : null,
    category:    mapCategory(item.group),
    servingG:    100,
  }
}

// ── Bulk upsert ───────────────────────────────────────────────────────────────

async function bulkUpsert(batch) {
  const jsonl = batch.map(d => JSON.stringify(d)).join('\n')
  const res   = await fetch(
    `${TYPESENSE_URL}/collections/foods/documents/import?action=upsert`,
    {
      method:  'POST',
      headers: { 'X-TYPESENSE-API-KEY': TYPESENSE_KEY, 'Content-Type': 'text/plain' },
      body:    jsonl,
    },
  )
  if (!res.ok) throw new Error(`Typesense HTTP ${res.status}: ${await res.text()}`)
  const lines = (await res.text()).split('\n').filter(Boolean)
  const ok    = lines.filter(l => { try { return JSON.parse(l).success } catch { return false } }).length
  return { ok, fail: lines.length - ok }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const jsonPath = process.argv[2] ?? path.join(process.cwd(), 'ifct_foods.json')

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌  File not found: ${jsonPath}`)
    console.error('   Download IFCT 2017 data from https://www.ifct2017.com and convert to JSON.')
    console.error('   Expected format: JSON array with fields energy_kcal, protein_g, carb_g, fat_g, etc.')
    process.exit(1)
  }

  const ifctFoods = parseIFCT(jsonPath)
  const mapped    = ifctFoods.map(mapIFCT).filter(Boolean)
  console.log(`✅ ${mapped.length} items mapped (${ifctFoods.length - mapped.length} skipped)`)

  let totalOk = 0, totalFail = 0
  const batches = Math.ceil(mapped.length / BATCH_SIZE)
  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const n = Math.floor(i / BATCH_SIZE) + 1
    process.stdout.write(`\r⬆️  Uploading batch ${n}/${batches}…`)
    const { ok, fail } = await bulkUpsert(mapped.slice(i, i + BATCH_SIZE))
    totalOk += ok; totalFail += fail
  }
  console.log(`\n\n🎉 Done! ${totalOk} upserted, ${totalFail} failed`)
}

main().catch(err => { console.error(err); process.exit(1) })
