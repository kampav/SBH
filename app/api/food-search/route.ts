// app/api/food-search/route.ts
// Unified food search endpoint.
// Priority: Typesense (when configured) → local FOOD_DATABASE filter
//
// GET /api/food-search?q=chicken&limit=10
// Returns: FoodEntry[] (same shape as FOOD_DATABASE)

import { NextRequest, NextResponse } from 'next/server'
import { searchTypesense, isTypesenseConfigured } from '@/lib/typesense-client'
import { FOOD_DATABASE } from '@/lib/foodDatabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() ?? ''
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '10'), 25)

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [], source: 'empty' })
  }

  // ── Typesense (fast, typo-tolerant) ───────────────────────────────────────
  if (isTypesenseConfigured) {
    const hits = await searchTypesense(q, limit)
    if (hits.length > 0) {
      return NextResponse.json({ results: hits, source: 'typesense' })
    }
  }

  // ── Local FOOD_DATABASE fallback ───────────────────────────────────────────
  const results = FOOD_DATABASE
    .filter(f => {
      const haystack = [f.name, ...f.tags].join(' ').toLowerCase()
      return q.split(' ').every(word => haystack.includes(word))
    })
    .slice(0, limit)

  return NextResponse.json({ results, source: 'local' })
}
