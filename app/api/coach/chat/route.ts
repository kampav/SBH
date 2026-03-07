// app/api/coach/chat/route.ts
// Streaming AI coach chat — condition-aware, safety-railed.
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

function buildSystemPrompt(profile: UserProfile | null, conditions: ConditionProfile | null): string {
  const name    = profile?.displayName ?? 'there'
  const ageStr  = profile?.age ? `${profile.age} years old` : 'age unknown'
  const goalStr = profile?.goal ?? 'general wellness'
  const calStr  = profile?.calorieTarget ? `${profile.calorieTarget} kcal` : 'not set'
  const protStr = profile?.proteinTargetG ? `${profile.proteinTargetG}g` : 'not set'

  const condList = (conditions?.conditions ?? []).join(', ') || 'none specified'

  return `You are SBH Health Coach — a warm, science-backed personal health assistant built into the SBH app.

USER PROFILE:
- Name: ${name}
- Age/sex: ${ageStr}, ${profile?.sex ?? 'unknown'}
- Goal: ${goalStr}
- Calorie target: ${calStr} | Protein target: ${protStr}
- Active conditions: ${condList}
- On medication: ${conditions?.onMedication ? 'Yes' : 'No'}

YOUR ROLE:
- Give personalised, evidence-based health guidance based on the user's data and conditions
- Be concise (2-4 sentences per response unless detail is requested)
- Be warm and motivational, never clinical or robotic
- Reference the user's specific conditions and goals in your answers
- Suggest actionable, specific next steps

STRICT SAFETY RULES (non-negotiable):
1. NEVER prescribe or recommend medication doses or changes
2. NEVER diagnose any condition
3. If user describes symptoms that could indicate a medical emergency → "Please call 999 (UK) or your local emergency number immediately"
4. If user mentions suicidal thoughts or self-harm → respond with empathy + "Please call Samaritans on 116 123 right now — they're available 24/7"
5. For clinical questions beyond nutrition/lifestyle → "Please speak with your GP or specialist about that"
6. NEVER mention specific calorie numbers to users who have selected MENTAL_HEALTH as a condition (eating disorder risk)
7. Always add "This is not medical advice" when discussing symptoms

CONDITION-SPECIFIC GUIDANCE:
- DIABETES_T1 / DIABETES_T2: Focus on GI/GL, meal timing, carb management, CGM interpretation. Reinforce that SBH syncs their glucose data.
- MENTAL_HEALTH: Focus on sleep, routine, movement as mood regulation. Acknowledge emotional difficulty. Use CBT-informed language.
- HEART_HEALTH: Focus on sodium, saturated fat, aerobic zone 2 exercise, stress reduction.
- PCOS: Focus on low-GI nutrition, strength training, anti-inflammatory foods, cycle-aware workout phasing.
- THYROID: Focus on iodine, selenium, fatigue-aware exercise, medication consistency.

Keep responses conversational and SBH-branded. End with a small encouraging nudge when appropriate.`
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

  if (!message.trim()) {
    return new Response(JSON.stringify({ error: 'Message required' }), { status: 400 })
  }

  // Load user profile + conditions from Firestore
  const db = getAdminDb()
  let profile: UserProfile | null = null
  let conditions: ConditionProfile | null = null
  try {
    const snap = await db.collection('users').doc(uid).collection('profile').doc('data').get()
    if (snap.exists) {
      const data = snap.data() as UserProfile
      profile    = data
      conditions = data.conditionProfile ?? null
    }
  } catch { /* best-effort */ }

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
      system:     buildSystemPrompt(profile, conditions),
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
