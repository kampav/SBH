// app/api/coach/daily-checkin/route.ts
// Generates (and caches) a personalised morning coach message for today.
// GET — Auth: Bearer <firebase-id-token>
// Returns cached message if already generated today.

export const dynamic = 'force-dynamic'
export const runtime  = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAdminApp, getAdminDb } from '@/lib/firebase/admin'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue } from 'firebase-admin/firestore'
import { UserProfile, ConditionProfile } from '@/lib/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const today = () => new Date().toISOString().slice(0, 10)

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

  const db    = getAdminDb()
  const date  = today()
  const ref   = db.collection('users').doc(uid).collection('coach').doc(date)

  // Return cached message if it exists for today
  const cached = await ref.get()
  if (cached.exists) {
    return NextResponse.json(cached.data())
  }

  // Load user profile
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

  const name      = profile?.displayName ?? 'there'
  const condList  = (conditions?.conditions ?? []).join(', ') || 'general wellness'
  const goal      = profile?.goal ?? 'feel better'
  const hour      = new Date().getHours()
  const timeSlot  = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  const prompt = `You are SBH Health Coach. Write a personalised daily ${timeSlot} check-in message for ${name}.

Their active conditions: ${condList}
Their goal: ${goal}
Today's date: ${date}

Return ONLY a JSON object with exactly these three keys:
{
  "greeting": "A warm 1-2 sentence personalised ${timeSlot} message that references their conditions/goal",
  "focus": "One specific, actionable focus for today (1 sentence, concrete)",
  "reflection": "An evening reflection prompt they can journal on tonight (1 sentence, open-ended question)"
}

RULES:
- No medication advice, no diagnosis, no clinical claims
- If conditions include MENTAL_HEALTH: avoid calorie numbers, focus on energy and mood
- If conditions include DIABETES_T1 or DIABETES_T2: mention glucose stability or meal timing
- Keep each field to 1-2 sentences max
- Warm, motivational, science-backed tone`

  let checkin = {
    greeting:   `Good ${timeSlot}, ${name}! Ready to have a great health day?`,
    focus:      'Log your meals and stay hydrated — small steps add up.',
    reflection: 'What went well today, and what would you do differently tomorrow?',
  }

  try {
    const resp = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = resp.content[0].type === 'text' ? resp.content[0].text.trim() : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.greeting && parsed.focus && parsed.reflection) {
        checkin = parsed
      }
    }
  } catch { /* fall back to defaults */ }

  const doc = {
    ...checkin,
    date,
    conditions: condList,
    generatedAt: FieldValue.serverTimestamp(),
  }

  await ref.set(doc)

  return NextResponse.json(doc)
}
