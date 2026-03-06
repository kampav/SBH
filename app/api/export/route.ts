// app/api/export/route.ts
// GDPR Art 20 — Data portability: returns all user data as CSV.
// Protected by Firebase ID token verification.

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { getAuth }    from 'firebase-admin/auth'
import { getAdminApp } from '@/lib/firebase/admin'

// ── helpers ───────────────────────────────────────────────────────────────────

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const keys = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v).replace(/"/g, '""')
    return /[",\n\r]/.test(s) ? `"${s}"` : s
  }
  return [
    keys.join(','),
    ...rows.map(r => keys.map(k => escape(r[k])).join(',')),
  ].join('\n')
}

function flattenMeal(meal: Record<string, unknown>, date: string) {
  return { date, ...meal }
}

// ── route ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // 1. Verify ID token
  const auth   = req.headers.get('Authorization') ?? ''
  const token  = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let uid: string
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token)
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const db = getAdminDb()

  // 2. Fetch all user data in parallel
  const [nutritionSnap, workoutsSnap, metricsSnap, glucoseSnap, sleepSnap, profileSnap] =
    await Promise.all([
      db.collection('users').doc(uid).collection('nutrition').get(),
      db.collection('users').doc(uid).collection('workouts').get(),
      db.collection('users').doc(uid).collection('metrics').get(),
      db.collection('users').doc(uid).collection('glucose').get(),
      db.collection('users').doc(uid).collection('sleep').get(),
      db.collection('users').doc(uid).collection('profile').doc('data').get(),
    ])

  // 3. Build CSV sections
  const sections: string[] = []

  // Profile
  if (profileSnap.exists) {
    const p = profileSnap.data() ?? {}
    sections.push('# PROFILE\n' + toCsv([{
      displayName: p.displayName, email: p.email, age: p.age,
      sex: p.sex, heightCm: p.heightCm, weightKg: p.weightKg,
      targetWeightKg: p.targetWeightKg, calorieTarget: p.calorieTarget,
      proteinTargetG: p.proteinTargetG, createdAt: String(p.createdAt ?? ''),
    }]))
  }

  // Nutrition (flatten meals)
  const meals: Record<string, unknown>[] = []
  nutritionSnap.docs.forEach(d => {
    const day = d.data()
    ;(day.meals ?? []).forEach((m: Record<string, unknown>) => meals.push(flattenMeal(m, day.date)))
  })
  if (meals.length) sections.push('\n# NUTRITION MEALS\n' + toCsv(meals))

  // Workouts (flatten sets)
  const sets: Record<string, unknown>[] = []
  workoutsSnap.docs.forEach(d => {
    const day = d.data()
    ;(day.exercises ?? []).forEach((ex: Record<string, unknown>) => {
      ;(ex.sets as Record<string, unknown>[] ?? []).forEach((s: Record<string, unknown>) =>
        sets.push({ date: day.date, exercise: ex.exerciseName, ...s }))
    })
  })
  if (sets.length) sections.push('\n# WORKOUTS\n' + toCsv(sets))

  // Metrics
  const metrics = metricsSnap.docs.map(d => {
    const { date, weightKg, bmi, bodyFatPct } = d.data()
    return { date, weightKg, bmi, bodyFatPct: bodyFatPct ?? '' }
  })
  if (metrics.length) sections.push('\n# BODY METRICS\n' + toCsv(metrics))

  // Glucose readings
  const readings: Record<string, unknown>[] = []
  glucoseSnap.docs.forEach(d => {
    const day = d.data()
    ;(day.readings ?? []).forEach((r: Record<string, unknown>) => readings.push({ date: day.date, ...r }))
  })
  if (readings.length) sections.push('\n# GLUCOSE READINGS\n' + toCsv(readings))

  // Sleep
  const sleep = sleepSnap.docs.map(d => {
    const { date, bedtime, wakeTime, durationH, quality, notes } = d.data()
    return { date, bedtime, wakeTime, durationH, quality, notes: notes ?? '' }
  })
  if (sleep.length) sections.push('\n# SLEEP\n' + toCsv(sleep))

  const csv = [
    `# SBH Data Export — ${new Date().toISOString()}`,
    `# User: ${uid}`,
    `# Generated under GDPR Article 20 (Right to Data Portability)`,
    '',
    ...sections,
  ].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sbh-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
