import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const { profile, last7Days } = await req.json()
  if (!profile || !last7Days) {
    return NextResponse.json({ error: 'Missing profile or last7Days' }, { status: 400 })
  }

  const daysWithData = last7Days.filter((d: { calories: number }) => d.calories > 0).length
  const daysWithWorkout = last7Days.filter((d: { hadWorkout: boolean }) => d.hadWorkout).length
  const avgCalories = daysWithData > 0
    ? Math.round(last7Days.reduce((s: number, d: { calories: number }) => s + d.calories, 0) / daysWithData)
    : 0

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `You are a science-based health coach. Analyse this user's last 7 days and respond with personalised, specific feedback — not generic advice.

User goal: ${profile.goal ?? 'fat_loss'}
Calorie target: ${profile.calorieTarget} kcal/day | Protein target: ${profile.proteinTargetG}g/day
Current weight: ${profile.weightKg} kg

Last 7 days summary:
- Days with nutrition logged: ${daysWithData}/7
- Days with workout: ${daysWithWorkout}/7
- Average calories on logged days: ${avgCalories} kcal
- Daily breakdown: ${JSON.stringify(last7Days)}

Return ONLY valid JSON with these exact keys:
{"quote":"a personalised one-line motivational insight based on their actual data (not generic)","insights":["specific observation 1","specific observation 2"],"recommendation":"one concrete actionable tip for next week based on their patterns"}
No markdown, no extra text — just the JSON object.`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    return NextResponse.json(JSON.parse(cleaned), { headers: CORS })
  } catch {
    return NextResponse.json({ error: 'Could not parse AI response', raw: text }, { status: 422, headers: CORS })
  }
}
