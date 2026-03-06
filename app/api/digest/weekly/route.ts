// app/api/digest/weekly/route.ts
// Weekly nutrition + workout digest — sends a personalised FCM notification.
//
// Auth: same CRON_SECRET as /api/fcm/send-daily
// Can also be called for a single user by including { uid } in the request body
// (CRON_SECRET auth still required).
//
// POST {} (no body)  → processes ALL users (CRON mode)
// POST { uid }       → processes one user only (targeted mode)
//
// Notification content:
//   "Week recap: avg 2,100 kcal · 5/7 workouts · best day Monday"

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET

interface WeekStats {
  avgCalories:    number
  calCompliancePct: number  // % days within ±10% of target
  workoutsLogged: number    // 0-7
  avgProteinG:    number
  bestDay:        string    // e.g. 'Monday'
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function isoDateOffset(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

function buildNotificationText(stats: WeekStats, name: string): { title: string; body: string } {
  const greeting = name ? `${name.split(' ')[0]},` : ''
  const calStr   = stats.avgCalories > 0 ? `avg ${stats.avgCalories.toLocaleString()} kcal` : null
  const workStr  = stats.workoutsLogged > 0 ? `${stats.workoutsLogged}/7 workouts` : null
  const bestStr  = stats.bestDay ? `best day ${stats.bestDay}` : null

  const parts = [calStr, workStr, bestStr].filter(Boolean)
  const body = parts.length > 0 ? `Week recap: ${parts.join(' · ')}` : 'Check your weekly progress in the app!'

  return {
    title: `📊 ${greeting ? greeting + ' ' : ''}Your weekly SBH summary`,
    body,
  }
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({})) as { uid?: string }

    const { getAdminApp }   = await import('@/lib/firebaseAdmin')
    const { getFirestore }  = await import('firebase-admin/firestore')
    const { getMessaging }  = await import('firebase-admin/messaging')

    const adminDb   = getFirestore(getAdminApp())
    const messaging = getMessaging(getAdminApp())

    // ── Collect token docs ────────────────────────────────────────────────────
    let tokenSnap
    if (body.uid) {
      // Single-user targeted mode
      const tokenRef = adminDb.collection('users').doc(body.uid).collection('fcm_tokens')
      tokenSnap = await tokenRef.get()
    } else {
      // All users (CRON mode)
      tokenSnap = await adminDb.collectionGroup('fcm_tokens').get()
    }

    const stats = { sent: 0, skipped: 0, invalid: 0, errors: 0 }
    const staleRefs: FirebaseFirestore.DocumentReference[] = []

    const sendPromises = tokenSnap.docs.map(async (tokenDoc) => {
      const tokenData = tokenDoc.data()
      const token = tokenData?.token as string | undefined
      if (!token) { stats.skipped++; return }

      // ── Resolve uid from path ─────────────────────────────────────────────
      // Path: users/{uid}/fcm_tokens/{docId}
      const pathParts = tokenDoc.ref.path.split('/')
      const uid = pathParts[1]
      if (!uid) { stats.skipped++; return }

      // ── Fetch last 7 days of data ─────────────────────────────────────────
      const dates = Array.from({ length: 7 }, (_, i) => isoDateOffset(i))

      const [nutritionSnaps, workoutSnaps, profileSnap] = await Promise.all([
        Promise.all(dates.map(d => adminDb.doc(`users/${uid}/nutrition/${d}`).get())),
        Promise.all(dates.map(d => adminDb.doc(`users/${uid}/workouts/${d}`).get())),
        adminDb.doc(`users/${uid}/profile/data`).get(),
      ])

      const profile   = profileSnap.exists ? profileSnap.data() as { name?: string; calorieTarget?: number } : {}
      const calTarget = profile.calorieTarget ?? 2000

      // ── Compute weekly stats ──────────────────────────────────────────────
      const nutritionDays = nutritionSnaps
        .map(s => s.exists ? s.data() as { totalCalories?: number; totalProteinG?: number } : null)
        .filter(Boolean) as { totalCalories: number; totalProteinG: number }[]

      const workoutsLogged = workoutSnaps.filter(s => s.exists).length

      const avgCalories = nutritionDays.length > 0
        ? Math.round(nutritionDays.reduce((sum, d) => sum + (d.totalCalories ?? 0), 0) / nutritionDays.length)
        : 0

      const avgProteinG = nutritionDays.length > 0
        ? Math.round(nutritionDays.reduce((sum, d) => sum + (d.totalProteinG ?? 0), 0) / nutritionDays.length)
        : 0

      const compliantDays = nutritionDays.filter(d => {
        const cal = d.totalCalories ?? 0
        return cal >= calTarget * 0.9 && cal <= calTarget * 1.1
      }).length
      const calCompliancePct = nutritionDays.length > 0
        ? Math.round((compliantDays / nutritionDays.length) * 100)
        : 0

      // Best day = day with highest calories logged
      let bestDayIdx = -1
      let bestCal = -1
      nutritionDays.forEach((d, i) => {
        if ((d.totalCalories ?? 0) > bestCal) { bestCal = d.totalCalories ?? 0; bestDayIdx = i }
      })
      const bestDayDate = bestDayIdx >= 0 ? dates[bestDayIdx] : null
      const bestDay     = bestDayDate ? DAY_NAMES[new Date(bestDayDate + 'T12:00:00Z').getDay()] : ''

      const weekStats: WeekStats = { avgCalories, calCompliancePct, workoutsLogged, avgProteinG, bestDay }

      // Skip users with no data this week
      if (avgCalories === 0 && workoutsLogged === 0) { stats.skipped++; return }

      const { title, body: notifBody } = buildNotificationText(weekStats, profile.name ?? '')

      // ── Send notification ─────────────────────────────────────────────────
      try {
        await messaging.send({
          token,
          notification: { title, body: notifBody },
          webpush: {
            notification: {
              title,
              body: notifBody,
              icon:  '/icons/icon-192.png',
              badge: '/icons/icon-96.png',
              tag:   'weekly-digest',
              requireInteraction: false,
            },
            fcmOptions: { link: '/metrics' },
          },
        })
        stats.sent++
      } catch (err: unknown) {
        const code = (err as { errorInfo?: { code?: string } })?.errorInfo?.code ?? ''
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          staleRefs.push(tokenDoc.ref)
          stats.invalid++
        } else {
          stats.errors++
        }
      }
    })

    await Promise.all(sendPromises)

    // ── Purge stale tokens ────────────────────────────────────────────────────
    if (staleRefs.length > 0) {
      const batch = adminDb.batch()
      staleRefs.forEach(ref => batch.delete(ref))
      await batch.commit()
    }

    console.info('[digest/weekly] done', stats)
    return NextResponse.json({ ok: true, stats })
  } catch (err) {
    console.error('[digest/weekly] fatal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
