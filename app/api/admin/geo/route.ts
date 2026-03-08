export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp, getAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'

interface GeoRule {
  id: string
  countryCode: string
  blockedFeatures: string[]
  allowedFeatures: string[]
  updatedAt?: string
}

async function verifyAdminToken(req: NextRequest): Promise<string> {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) throw new Error('No token')
  const decoded = await getAuth(getAdminApp()).verifyIdToken(token)
  const adminUids = (process.env.ADMIN_UIDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (!adminUids.includes(decoded.uid)) throw new Error('Not admin')
  return decoded.uid
}

export async function GET(req: NextRequest) {
  try {
    await verifyAdminToken(req)
    const db = getAdminDb()
    const snap = await db.collection('admin_geo_rules').get()
    const rules: GeoRule[] = snap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<GeoRule, 'id'>),
    }))
    return NextResponse.json({ rules })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: msg === 'Not admin' ? 403 : 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdminToken(req)
    const body = await req.json() as { action: 'upsert' | 'delete'; rule: Partial<GeoRule> }
    const { action, rule } = body
    const db = getAdminDb()

    if (!rule.id) {
      return NextResponse.json({ error: 'Missing rule id' }, { status: 400 })
    }

    const ref = db.collection('admin_geo_rules').doc(rule.id)

    if (action === 'upsert') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _omit, ...rest } = rule
      await ref.set(
        { ...rest, updatedAt: new Date().toISOString() },
        { merge: true }
      )
    } else if (action === 'delete') {
      await ref.delete()
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: msg === 'Not admin' ? 403 : 401 })
  }
}
