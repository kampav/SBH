// app/api/coach/chat/route.ts
// Streaming AI coach chat — condition-aware, fully grounded with user's real health data.
// POST { message: string, history: {role,content}[] }
// Auth: Bearer <firebase-id-token>

export const dynamic = 'force-dynamic'
export const runtime  = 'nodejs'

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAdminApp, getAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'
import { UserProfile, ConditionProfile } from '@/lib/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface HealthContext {
  avgCalories7d:       number | null
  avgProteinG7d:       number | null
  nutritionDaysLogged: number
  recentWorkouts:      string[]
  avgSleepH7d:         number | null
  avgSleepQuality7d:   number | null
  latestWeightKg:      number | null
  avgGlucose7d:        number | null
  latestMoodScore:     number | null
  avgMoodScore7d:      number | null
  habitsCompletedToday: number | null
}

function buildSystemPrompt(
  profile: UserProfile | null,
  conditions: ConditionProfile | null,
  health: HealthContext,
): string {
  const name    = profile?.displayName ?? 'there'
  const ageStr  = profile?.age ? `${profile.age} years old` : 'age unknown'
  const goalStr = profile?.goal ?? 'general wellness'
  const calStr  = profile?.calorieTarget ? `${profile.calorieTarget} kcal` : 'not set'
  const protStr = profile?.proteinTargetG ? `${profile.proteinTargetG}g` : 'not set'
  const condList = (conditions?.conditions ?? []).join(', ') || 'none specified'

  const dataLines: string[] = []
  if (health.nutritionDaysLogged > 0) {
    dataLines.push(`- Nutrition logged ${health.nutritionDaysLogged}/7 days this week`)
    if (health.avgCalories7d != null) dataLines.push(`- Avg daily calories: ${Math.round(health.avgCalories7d)} kcal (target: ${calStr})`)
    if (health.avgProteinG7d  != null) dataLines.push(`- Avg daily protein:  ${Math.round(health.avgProteinG7d)}g (target: ${protStr})`)
  } else {
    dataLines.push('- No nutrition logs this week yet')
  }
  if (health.recentWorkouts.length > 0) {
    dataLines.push(`- Recent workouts: ${health.recentWorkouts.slice(0, 3).join(', ')}`)
  } else {
    dataLines.push('- No workouts logged recently')
  }
  if (health.avgSleepH7d != null) {
    dataLines.push(`- Avg sleep last 7d: ${health.avgSleepH7d}h  quality avg: ${health.avgSleepQuality7d}/5`)
  }
  if (health.latestWeightKg != null) {
    dataLines.push(`- Latest weight: ${health.latestWeightKg} kg`)
  }
  if (health.avgGlucose7d != null) {
    dataLines.push(`- Avg glucose last 7d: ${health.avgGlucose7d.toFixed(1)} mmol/L`)
  }
  if (health.avgMoodScore7d != null) {
    dataLines.push(`- Avg mood last 7d: ${health.avgMoodScore7d.toFixed(1)}/10 (latest: ${health.latestMoodScore ?? 'n/a'})`)
  }
  if (health.habitsCompletedToday != null) {
    dataLines.push(`- Habits completed today: ${health.habitsCompletedToday}`)
  }

  return `You are HealthOS Health Coach — a warm, science-backed personal health assistant.

USER PROFILE:
- Name: ${name}
- Age/sex: ${ageStr}, ${profile?.sex ?? 'unknown'}
- Goal: ${goalStr}
- Calorie target: ${calStr} | Protein target: ${protStr}
- Active conditions: ${condList}
- On medication: ${conditions?.onMedication ? 'Yes' : 'No'}

REAL USER DATA (last 7 days — always reference specific numbers in your responses):
${dataLines.join('\n')}

YOUR ROLE:
- Give personalised, evidence-based guidance grounded in the ACTUAL DATA above
- Reference specific numbers (e.g. "you averaged X kcal", "your sleep was Y hours")
- Be concise (2-4 sentences unless detail is requested)
- Be warm and motivational, never clinical or robotic
- Suggest concrete next steps based on the real data

STRICT SAFETY RULES (non-negotiable):
1. NEVER prescribe or recommend medication doses or changes
2. NEVER diagnose any condition
3. If user describes emergency symptoms → "Please call 999 (UK) or your local emergency number immediately"
4. If user mentions suicidal thoughts or self-harm → empathy + "Please call Samaritans on 116 123 right now — they're available 24/7"
5. For clinical questions beyond nutrition/lifestyle → "Please speak with your GP or specialist about that"
6. NEVER mention specific calorie numbers to users with MENTAL_HEALTH condition (eating disorder risk)
7. Always add "This is not medical advice" when discussing symptoms

CONDITION-SPECIFIC GUIDANCE:
- DIABETES_T1 / DIABETES_T2: Focus on GI/GL, meal timing, carb management. Reference their glucose data above.
- MENTAL_HEALTH: Focus on sleep, routine, movement as mood regulation. Reference mood scores. CBT-informed language.
- HEART_HEALTH: Focus on sodium, saturated fat, aerobic zone 2, stress reduction.
- PCOS: Focus on low-GI nutrition, strength training, anti-inflammatory foods, cycle-aware phasing.
- THYROID: Focus on iodine, selenium, fatigue-aware exercise, medication consistency.

Keep responses conversational and HealthOS-branded. End with a small encouraging nudge when appropriate.`
}

export async function POST(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get('Authorization') ?? ''
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!idToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  let uid: string
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken)
    uid = decoded.uid
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const message: string    = body.message ?? ''
  const history: { role: 'user' | 'assistant'; content: string }[] = body.history ?? []
  const systemOverride: string | undefined = body.systemOverride

  if (!message.trim()) {
    return new Response(JSON.stringify({ error: 'Message required' }), { status: 400 })
  }

  const db = getAdminDb()
  let profile: UserProfile | null = null
  let conditions: ConditionProfile | null = null
  const healthCtx: HealthContext = {
    avgCalories7d: null, avgProteinG7d: null, nutritionDaysLogged: 0,
    recentWorkouts: [], avgSleepH7d: null, avgSleepQuality7d: null,
    latestWeightKg: null, avgGlucose7d: null,
    latestMoodScore: null, avgMoodScore7d: null, habitsCompletedToday: null,
  }

  if (!systemOverride) {
    try {
      // Profile
      const profileSnap = await db.collection('users').doc(uid).collection('profile').doc('data').get()
      if (profileSnap.exists) {
        const data = profileSnap.data() as UserProfile
        profile    = data
        conditions = data.conditionProfile ?? null
      }

      const sevenDaysAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
      const todayStr = new Date().toISOString().slice(0, 10)
      const conditionKeys = (conditions?.conditions ?? []) as string[]
      const isDiabetic     = conditionKeys.some(c => c === 'DIABETES_T1' || c === 'DIABETES_T2')
      const isMentalHealth = conditionKeys.includes('MENTAL_HEALTH')

      // Parallel fetch of all health data
      const [nutritionSnaps, workoutSnaps, sleepSnaps, metricSnaps, habitLogSnap, glucoseSnaps, moodSnaps] =
        await Promise.all([
          db.collection('users').doc(uid).collection('nutrition')
            .where('date', '>=', sevenDaysAgoStr).orderBy('date', 'desc').limit(7).get().catch(() => null),
          db.collection('users').doc(uid).collection('workouts')
            .orderBy('date', 'desc').limit(5).get().catch(() => null),
          db.collection('users').doc(uid).collection('sleep')
            .where('date', '>=', sevenDaysAgoStr).orderBy('date', 'desc').limit(7).get().catch(() => null),
          db.collection('users').doc(uid).collection('metrics')
            .orderBy('date', 'desc').limit(1).get().catch(() => null),
          db.collection('users').doc(uid).collection('habit_logs').doc(todayStr).get().catch(() => null),
          isDiabetic
            ? db.collection('users').doc(uid).collection('glucose')
                .where('date', '>=', sevenDaysAgoStr).orderBy('date', 'desc').limit(7).get().catch(() => null)
            : Promise.resolve(null),
          isMentalHealth
            ? db.collection('users').doc(uid).collection('mood')
                .where('date', '>=', sevenDaysAgoStr).orderBy('date', 'desc').limit(7).get().catch(() => null)
            : Promise.resolve(null),
        ])

      // Process nutrition
      const loggedNutrition = (nutritionSnaps?.docs ?? []).filter(d => (d.data().meals?.length ?? 0) > 0)
      healthCtx.nutritionDaysLogged = loggedNutrition.length
      if (loggedNutrition.length > 0) {
        healthCtx.avgCalories7d = loggedNutrition.reduce((s, d) => s + (d.data().totalCalories ?? 0), 0) / loggedNutrition.length
        healthCtx.avgProteinG7d = loggedNutrition.reduce((s, d) => s + (d.data().totalProteinG  ?? 0), 0) / loggedNutrition.length
      }

      // Process workouts
      healthCtx.recentWorkouts = (workoutSnaps?.docs ?? []).map(d => {
        const w = d.data()
        return `${w.programmeName ?? 'Workout'} (${d.id})`
      })

      // Process sleep
      const sleepDocs = sleepSnaps?.docs ?? []
      if (sleepDocs.length > 0) {
        healthCtx.avgSleepH7d       = Math.round((sleepDocs.reduce((s, d) => s + (d.data().durationH ?? 0), 0) / sleepDocs.length) * 10) / 10
        healthCtx.avgSleepQuality7d = Math.round(sleepDocs.reduce((s, d) => s + (d.data().quality  ?? 0), 0) / sleepDocs.length * 10) / 10
      }

      // Latest weight
      const latestMetricDoc = metricSnaps?.docs[0]
      if (latestMetricDoc) healthCtx.latestWeightKg = latestMetricDoc.data().weightKg ?? null

      // Habits completed today
      if (habitLogSnap?.exists) {
        const logData = habitLogSnap.data() ?? {}
        healthCtx.habitsCompletedToday = Object.values(logData).filter((v: unknown) => (v as number) > 0).length
      }

      // Glucose (diabetics only)
      if (isDiabetic && glucoseSnaps) {
        const allReadings: number[] = []
        glucoseSnaps.docs.forEach(d => {
          const readings = d.data().readings ?? []
          readings.forEach((r: { valueMmol: number }) => { if (r.valueMmol) allReadings.push(r.valueMmol) })
        })
        if (allReadings.length > 0) {
          healthCtx.avgGlucose7d = allReadings.reduce((s, v) => s + v, 0) / allReadings.length
        }
      }

      // Mood (mental health only)
      if (isMentalHealth && moodSnaps) {
        const moodScores = moodSnaps.docs.map(d => d.data().mood ?? 0).filter(Boolean)
        if (moodScores.length > 0) {
          healthCtx.avgMoodScore7d  = Math.round((moodScores.reduce((s, v) => s + v, 0) / moodScores.length) * 10) / 10
          healthCtx.latestMoodScore = moodSnaps.docs[0].data().mood ?? null
        }
      }

    } catch { /* best-effort — proceed without health data */ }
  }

  const systemPrompt = systemOverride ?? buildSystemPrompt(profile, conditions, healthCtx)

  // Build messages array (keep last 20 for context)
  const recentHistory = history.slice(-20)
  const messages: Anthropic.MessageParam[] = [
    ...recentHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  // Streaming response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stream: any
  try {
    stream = await client.messages.stream({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system:     systemPrompt,
      messages,
    })
  } catch (err) {
    console.error('[coach/chat] Anthropic stream error:', err)
    return new Response(
      JSON.stringify({ error: 'AI service unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch (err) {
        console.error('[coach/chat] stream read error:', err)
        controller.error('Stream error')
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
