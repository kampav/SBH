// lib/typesense-client.ts
// Typesense food search client — server-side only.
// Configure by setting TYPESENSE_URL + TYPESENSE_API_KEY env vars.
// Falls back gracefully to empty results when not configured — the API
// route (/api/food-search) then falls back to the local FOOD_DATABASE.
//
// To provision Typesense: https://cloud.typesense.org (~$20/mo)
// Collection schema is defined in scripts/typesense-setup.mjs.

const TYPESENSE_URL     = process.env.TYPESENSE_URL      // e.g. https://xxx.a1.typesense.net
const TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY  // search-only API key

export const isTypesenseConfigured = Boolean(TYPESENSE_URL && TYPESENSE_API_KEY)

export interface TypesenseFoodDoc {
  id: string
  name: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  servingSize: string
  emoji: string
  category: string
  gi?: number
  fibreG?: number
  tags: string[]
}

/**
 * Search the Typesense `foods` collection.
 * Returns an empty array if Typesense is not configured or the request fails.
 * @param query   Search term (typo-tolerant)
 * @param perPage Max results to return (default 10)
 */
export async function searchTypesense(
  query: string,
  perPage = 10,
): Promise<TypesenseFoodDoc[]> {
  if (!isTypesenseConfigured) return []
  try {
    const params = new URLSearchParams({
      q: query,
      query_by: 'name,tags',
      per_page: String(perPage),
      sort_by: '_text_match:desc',
      typo_tokens_threshold: '1',
    })
    const res = await fetch(
      `${TYPESENSE_URL}/collections/foods/documents/search?${params}`,
      {
        headers: { 'X-TYPESENSE-API-KEY': TYPESENSE_API_KEY! },
        next: { revalidate: 0 },
      },
    )
    if (!res.ok) return []
    const data = await res.json() as {
      hits?: Array<{ document: TypesenseFoodDoc }>
    }
    return (data.hits ?? []).map(h => h.document)
  } catch {
    return []
  }
}
