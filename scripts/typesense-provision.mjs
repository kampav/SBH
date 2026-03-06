#!/usr/bin/env node
/**
 * scripts/typesense-provision.mjs
 *
 * Provisions (or re-creates) the Typesense `foods` collection and verifies
 * the cluster is reachable.  Run this before any import script.
 *
 * Usage:
 *   node scripts/typesense-provision.mjs [--reset]
 *
 *   --reset   Drop and recreate the collection (destroys all indexed data)
 *
 * Requires: TYPESENSE_URL and TYPESENSE_API_KEY in environment
 */

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const TYPESENSE_URL = process.env.TYPESENSE_URL
const TYPESENSE_KEY = process.env.TYPESENSE_API_KEY
const RESET         = process.argv.includes('--reset')
const COLLECTION    = 'foods'

if (!TYPESENSE_URL || !TYPESENSE_KEY) {
  console.error('❌  TYPESENSE_URL and TYPESENSE_API_KEY must be set in the environment.')
  process.exit(1)
}

const HEADERS = { 'X-TYPESENSE-API-KEY': TYPESENSE_KEY, 'Content-Type': 'application/json' }

// ── Schema ────────────────────────────────────────────────────────────────────

const SCHEMA = {
  name: COLLECTION,
  fields: [
    { name: 'id',          type: 'string' },
    { name: 'name',        type: 'string' },
    { name: 'tags',        type: 'string[]', optional: true },
    { name: 'calories',    type: 'int32' },
    { name: 'proteinG',    type: 'float' },
    { name: 'carbsG',      type: 'float' },
    { name: 'fatG',        type: 'float' },
    { name: 'fibreG',      type: 'float',  optional: true },
    { name: 'sodiumMg',    type: 'float',  optional: true },
    { name: 'freeSugarsG', type: 'float',  optional: true },
    { name: 'category',    type: 'string', facet: true },
    { name: 'servingG',    type: 'float',  optional: true },
    { name: 'giEstimate',  type: 'int32',  optional: true },
  ],
  default_sorting_field: 'calories',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const res = await fetch(`${TYPESENSE_URL}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) } }
  catch { return { ok: res.ok, status: res.status, data: text } }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 SBH Typesense Provisioning`)
  console.log(`   URL: ${TYPESENSE_URL}`)
  console.log(`   Collection: ${COLLECTION}`)
  console.log(`   Mode: ${RESET ? 'RESET (drop + create)' : 'ensure-exists'}\n`)

  // 1. Health check
  console.log('1️⃣  Health check…')
  const health = await api('GET', '/health')
  if (!health.ok) {
    console.error(`❌  Cluster unreachable (HTTP ${health.status})`)
    process.exit(1)
  }
  console.log(`   ✅ Cluster healthy`)

  // 2. Check collection
  console.log(`2️⃣  Checking collection "${COLLECTION}"…`)
  const existing = await api('GET', `/collections/${COLLECTION}`)

  if (existing.ok && !RESET) {
    const { num_documents, fields } = existing.data
    console.log(`   ✅ Collection exists — ${num_documents?.toLocaleString() ?? '?'} documents, ${fields?.length ?? '?'} fields`)
    console.log(`\n✅ Nothing to do. Use --reset to drop and recreate.\n`)
    return
  }

  if (existing.ok && RESET) {
    console.log(`   ⚠️  Dropping existing collection…`)
    const del = await api('DELETE', `/collections/${COLLECTION}`)
    if (!del.ok) {
      console.error(`❌  Failed to drop collection: ${JSON.stringify(del.data)}`)
      process.exit(1)
    }
    console.log(`   ✅ Dropped`)
  } else if (!existing.ok && existing.status !== 404) {
    console.error(`❌  Unexpected error checking collection: ${JSON.stringify(existing.data)}`)
    process.exit(1)
  } else {
    console.log(`   ℹ️  Collection does not exist — creating`)
  }

  // 3. Create collection
  console.log(`3️⃣  Creating collection "${COLLECTION}"…`)
  const create = await api('POST', '/collections', SCHEMA)
  if (!create.ok) {
    console.error(`❌  Failed to create collection: ${JSON.stringify(create.data)}`)
    process.exit(1)
  }
  console.log(`   ✅ Collection created with ${SCHEMA.fields.length} fields`)

  // 4. Verify
  console.log(`4️⃣  Verifying…`)
  const verify = await api('GET', `/collections/${COLLECTION}`)
  if (!verify.ok) {
    console.error(`❌  Verification failed`)
    process.exit(1)
  }
  console.log(`   ✅ Collection verified`)

  console.log(`\n🎉 Provisioning complete!`)
  console.log(`   Run next: node scripts/typesense-import.mjs   (local food DB)`)
  console.log(`             node scripts/typesense-import-usda.mjs foundation_food.json`)
  console.log(`             node scripts/typesense-import-ifct.mjs ifct_foods.json\n`)
}

main().catch(err => { console.error(err); process.exit(1) })
