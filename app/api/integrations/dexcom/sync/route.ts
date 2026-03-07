// app/api/integrations/dexcom/sync/route.ts
// Fetches latest EGV readings from Dexcom and stores in users/{uid}/cgm/{date}.
// POST { days?: number }  — Auth: Bearer <firebase-id-token>

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp, getAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue } from 'firebase-admin/firestore'
import {
  fetchEGVs, egvsToCGMReadings, calcTimeInRange, calcAvgMmol,
  getValidTokens,
} from '@/lib/integrations/dexcom'
import { DexcomCredentials, CGMDay, CGMReading } from '@/lib/types'

export async function POST(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get('Authorization') ?? ''
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let uid: string
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken)
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const db = getAdminDb()
  const integRef = db.collection('users').doc(uid).collection('integrations').doc('dexcom')
  const snap = await integRef.get()

  if (!snap.exists) {
    return NextResponse.json({ error: 'Dexcom not connected' }, { status: 404 })
  }

  let creds = snap.data() as DexcomCredentials

  // Refresh token if needed
  try {
    const fresh = await getValidTokens(creds)
    if (fresh.accessToken !== creds.accessToken) {
      creds = fresh
      await integRef.set({ ...fresh, updatedAt: FieldValue.serverTimestamp() })
    }
  } catch (err) {
    console.error('Dexcom token refresh error:', err)
    return NextResponse.json({ error: 'Token refresh failed — please reconnect Dexcom' }, { status: 401 })
  }

  // Determine date range (default: today + yesterday)
  const body = await req.json().catch(() => ({}))
  const daysBack = Math.min(body.days ?? 2, 14)  // max 14 days
  const dates: string[] = []
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }

  const startDate = dates[0]
  const endDate   = dates[dates.length - 1]

  let raws
  try {
    raws = await fetchEGVs(creds.accessToken, startDate, endDate)
  } catch (err) {
    console.error('Dexcom EGV fetch error:', err)
    return NextResponse.json({ error: 'EGV fetch failed' }, { status: 502 })
  }

  // Group readings by date
  const byDate = new Map<string, CGMReading[]>()
  for (const date of dates) byDate.set(date, [])

  for (const raw of egvsToCGMReadings(raws)) {
    // displayTime format: YYYY-MM-DDTHH:MM:SS
    const date = raws.find(r => r.displayTime.slice(11, 16) === raw.time)?.displayTime.slice(0, 10)
    if (date && byDate.has(date)) byDate.get(date)!.push(raw)
  }

  // Save CGM days
  const saved: string[] = []
  const dateEntries = Array.from(byDate.entries())
  for (const [date, readings] of dateEntries) {
    if (readings.length === 0) continue
    const latest = readings[readings.length - 1]
    const cgmDay: CGMDay = {
      date,
      provider:       'dexcom',
      readings,
      latestValueMmol: latest.valueMmol,
      latestTrend:    latest.trend,
      timeInRangePct: calcTimeInRange(readings),
      avgMmol:        calcAvgMmol(readings),
      syncedAt:       FieldValue.serverTimestamp() as never,
    }
    await db.collection('users').doc(uid).collection('cgm').doc(date).set(cgmDay)
    saved.push(date)
  }

  // Update lastSyncAt on credentials
  await integRef.update({ lastSyncAt: new Date().toISOString() })

  return NextResponse.json({
    success: true,
    datesSync: saved,
    readingsTotal: raws.length,
  })
}
