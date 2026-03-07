// app/api/reports/care-team/route.ts
// Generates a shareable care team summary for Diabetes Pro users.
// GET — Auth: Bearer <firebase-id-token>
// Returns JSON summary (client renders as printable HTML or PDF via browser print).

export const dynamic = 'force-dynamic'
export const runtime  = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp, getAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'
import { UserProfile, CGMDay } from '@/lib/types'

const today      = () => new Date().toISOString().slice(0, 10)
const daysAgoStr = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
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

  // Load profile
  let profile: UserProfile | null = null
  try {
    const snap = await db.collection('users').doc(uid).collection('profile').doc('data').get()
    if (snap.exists) profile = snap.data() as UserProfile
  } catch { /* best-effort */ }

  const startDate = daysAgoStr(30)
  const endDate   = today()

  // Load 30-day glucose data (manual)
  const glucoseSnap = await db
    .collection('users').doc(uid)
    .collection('glucose')
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .orderBy('date')
    .get()

  const glucoseReadings: { date: string; mmol: number; label?: string }[] = []
  glucoseSnap.forEach(doc => {
    const d = doc.data()
    if (d.readings && Array.isArray(d.readings)) {
      d.readings.forEach((r: { mmol: number; label?: string }) => {
        glucoseReadings.push({ date: d.date, mmol: r.mmol, label: r.label })
      })
    }
  })

  // Load 30-day CGM data
  const cgmSnap = await db
    .collection('users').doc(uid)
    .collection('cgm')
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .orderBy('date')
    .get()

  const cgmDays: { date: string; avgMmol: number; tirPct: number; readings: number }[] = []
  cgmSnap.forEach(doc => {
    const d = doc.data() as CGMDay
    cgmDays.push({
      date:     d.date,
      avgMmol:  d.avgMmol,
      tirPct:   d.timeInRangePct,
      readings: d.readings.length,
    })
  })

  // HbA1c entries
  const hba1cSnap = await db
    .collection('users').doc(uid)
    .collection('hba1c')
    .orderBy('date', 'desc')
    .limit(6)
    .get()

  const hba1cEntries: { date: string; pct: number }[] = []
  hba1cSnap.forEach(doc => {
    const d = doc.data()
    hba1cEntries.push({ date: d.date, pct: d.pct })
  })

  // Blood pressure
  const bpSnap = await db
    .collection('users').doc(uid)
    .collection('blood_pressure')
    .where('date', '>=', startDate)
    .orderBy('date')
    .get()

  const bpEntries: { date: string; systolic: number; diastolic: number; pulse: number }[] = []
  bpSnap.forEach(doc => {
    const d = doc.data()
    bpEntries.push({ date: d.date, systolic: d.systolic, diastolic: d.diastolic, pulse: d.pulse })
  })

  // Workout count
  const workoutSnap = await db
    .collection('users').doc(uid)
    .collection('workouts')
    .where('date', '>=', startDate)
    .get()
  const workoutCount = workoutSnap.size

  // Compute aggregates
  const allMmol = [
    ...glucoseReadings.map(r => r.mmol),
    ...cgmDays.map(d => d.avgMmol),
  ]
  const avgGlucose    = allMmol.length
    ? Math.round((allMmol.reduce((s, v) => s + v, 0) / allMmol.length) * 10) / 10
    : null

  const avgTIR = cgmDays.length
    ? Math.round(cgmDays.reduce((s, d) => s + d.tirPct, 0) / cgmDays.length)
    : null

  const avgBP = bpEntries.length ? {
    systolic:  Math.round(bpEntries.reduce((s, e) => s + e.systolic, 0)  / bpEntries.length),
    diastolic: Math.round(bpEntries.reduce((s, e) => s + e.diastolic, 0) / bpEntries.length),
  } : null

  return NextResponse.json({
    reportDate:    endDate,
    periodStart:   startDate,
    periodEnd:     endDate,
    patient: {
      name:      profile?.displayName ?? 'Patient',
      age:       profile?.age,
      sex:       profile?.sex,
      conditions: profile?.conditionProfile?.conditions ?? [],
      medicationManaged: profile?.conditionProfile?.onMedication,
    },
    glucose: {
      manualReadingsCount: glucoseReadings.length,
      cgmDaysCount:        cgmDays.length,
      avgMmol:             avgGlucose,
      avgTimeInRangePct:   avgTIR,
      readings:            glucoseReadings.slice(-30),  // last 30 manual readings
      cgmSummary:          cgmDays,
    },
    hba1c:    hba1cEntries,
    bloodPressure: {
      avg:     avgBP,
      entries: bpEntries.slice(-14),
    },
    lifestyle: {
      workoutsLast30Days: workoutCount,
    },
    disclaimer: 'This report was generated by SBH Health App and is not a substitute for professional medical assessment. Please discuss with your healthcare team.',
  })
}
