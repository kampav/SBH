#!/usr/bin/env node
// scripts/typesense-setup.mjs
// Creates (or re-creates) the `foods` collection in Typesense.
//
// Usage:
//   TYPESENSE_URL=https://xxx.a1.typesense.net TYPESENSE_API_KEY=<admin-key> node scripts/typesense-setup.mjs
//
// Prerequisites:
//   - Typesense server running (cloud.typesense.org or self-hosted)
//   - Admin API key (not the search-only key)

const TYPESENSE_URL     = process.env.TYPESENSE_URL
const TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY

if (!TYPESENSE_URL || !TYPESENSE_API_KEY) {
  console.error('Error: TYPESENSE_URL and TYPESENSE_API_KEY must be set.')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  'X-TYPESENSE-API-KEY': TYPESENSE_API_KEY,
}

const COLLECTION_SCHEMA = {
  name: 'foods',
  fields: [
    { name: 'id',            type: 'string'         },
    { name: 'name',          type: 'string'         },
    { name: 'calories',      type: 'int32'          },
    { name: 'proteinG',      type: 'float'          },
    { name: 'carbsG',        type: 'float'          },
    { name: 'fatG',          type: 'float'          },
    { name: 'servingSize',   type: 'string'         },
    { name: 'emoji',         type: 'string', index: false },
    { name: 'category',      type: 'string', facet: true  },
    { name: 'tags',          type: 'string[]'       },
    { name: 'gi',            type: 'int32',  optional: true },
    { name: 'fibreG',        type: 'float',  optional: true },
  ],
  default_sorting_field: 'calories',
}

async function main() {
  // 1. Try to delete existing collection (ignore 404)
  console.log('Deleting existing `foods` collection (if any)...')
  const delRes = await fetch(`${TYPESENSE_URL}/collections/foods`, {
    method: 'DELETE',
    headers,
  })
  if (delRes.ok) {
    console.log('  Deleted existing collection.')
  } else if (delRes.status === 404) {
    console.log('  No existing collection — skipping delete.')
  } else {
    const txt = await delRes.text()
    console.error('  Unexpected error deleting collection:', delRes.status, txt)
    process.exit(1)
  }

  // 2. Create collection
  console.log('Creating `foods` collection...')
  const createRes = await fetch(`${TYPESENSE_URL}/collections`, {
    method: 'POST',
    headers,
    body: JSON.stringify(COLLECTION_SCHEMA),
  })
  if (!createRes.ok) {
    const txt = await createRes.text()
    console.error('  Failed to create collection:', createRes.status, txt)
    process.exit(1)
  }
  const created = await createRes.json()
  console.log('  Collection created:', created.name)
  console.log('\nSetup complete! Run `node scripts/typesense-import.mjs` to import food data.')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
