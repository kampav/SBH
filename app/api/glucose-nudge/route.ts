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

// Words that must never appear in nudge output
const FORBIDDEN_DOSING_WORDS = ['insulin', 'bolus', 'basal', 'injection', 'syringe', 'correction dose', 'units of']

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500, headers: CORS })
  }

  const { reading, settings, recentMeals = [], profile } = await req.json()
  if (!reading || !settings) {
    return NextResponse.json({ error: 'reading and settings are required' }, { status: 400, headers: CORS })
  }

  const isHypo = reading.valueMmol < settings.hypoThresholdMmol
  const isSevereHypo = reading.valueMmol < 3.0
  const context = reading.context?.replace(/_/g, ' ') ?? 'unspecified'

  const recentMealSummary = recentMeals.length > 0
    ? recentMeals.slice(-4).map((m: { name: string; carbsG: number; glEstimate?: number; time: string }) =>
        `${m.name} (${m.carbsG}g carbs, GL ${m.glEstimate ?? '?'}, at ${m.time})`
      ).join('; ')
    : 'No meals logged today'

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `You are a supportive health coach providing lifestyle and nutrition guidance for blood glucose management.
ABSOLUTE RULES — never violate these:
1. NEVER mention insulin, medication, doses, units, bolus, basal, injection, or any pharmaceutical treatment.
2. NEVER suggest adjusting any medication.
3. If glucose is critically low (< 3.0 mmol/L), advise eating 15g of fast-acting carbohydrates (e.g. 3 glucose tablets, 150ml fruit juice) and resting. This first-aid guidance is the ONLY exception where you mention a specific action for low glucose.
4. All other suggestions must be food-based, hydration-based, activity-based, or stress-management-based.
5. Keep the response concise and actionable — 2-3 sentences maximum for the nudge.
6. Be warm and supportive, not alarming.`,
    messages: [{
      role: 'user',
      content: `A user has logged a blood glucose reading that is outside their target range.

Reading: ${reading.valueMmol.toFixed(1)} mmol/L
Context: ${context}
Status: ${isSevereHypo ? 'CRITICALLY LOW' : isHypo ? 'Below target (hypo)' : 'Above target (hyper)'}
Target range: ${settings.targetRangeLowMmol}–${settings.targetRangeHighMmol} mmol/L
Today's recent meals: ${recentMealSummary}
User goal: ${profile?.goal ?? 'general health'}

${isSevereHypo
  ? 'This is a critically low reading. Provide immediate first-aid guidance only.'
  : isHypo
  ? 'Provide a brief supportive nudge about why this might have happened and a food-based suggestion.'
  : 'Provide a brief supportive nudge about likely contributors and a practical lifestyle suggestion to help next time.'
}

Return ONLY valid JSON:
{
  "nudge": "main 1-2 sentence supportive message",
  "actionItems": ["specific action 1", "specific action 2"],
  "urgency": "${isSevereHypo ? 'high' : isHypo ? 'medium' : 'low'}"
}
No markdown, no extra text.`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    const data = JSON.parse(cleaned)

    // Safety filter: block any response containing dosing language
    const combined = `${data.nudge} ${(data.actionItems ?? []).join(' ')}`.toLowerCase()
    if (FORBIDDEN_DOSING_WORDS.some(w => combined.includes(w))) {
      return NextResponse.json(
        { error: 'Safety filter triggered — response contained prohibited medical content' },
        { status: 422, headers: CORS }
      )
    }

    return NextResponse.json(data, { headers: CORS })
  } catch {
    return NextResponse.json({ error: 'Could not parse AI response', raw: text }, { status: 422, headers: CORS })
  }
}
