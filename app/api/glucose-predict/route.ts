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
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500, headers: CORS })
  }

  const { meal, recentReadings = [], baselineMmol, profile } = await req.json()
  if (!meal || baselineMmol == null) {
    return NextResponse.json({ error: 'meal and baselineMmol are required' }, { status: 400, headers: CORS })
  }

  const netCarbs = Math.max(0, (meal.carbsG ?? 0) - (meal.fibreG ?? 0))

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 768,
    system: `You are a nutritional science assistant providing glucose response estimates based on food composition.
CRITICAL SAFETY RULES — follow these without exception:
1. NEVER suggest insulin doses, medication adjustments, correction boluses, basal rates, or any pharmaceutical intervention.
2. NEVER use terms like "correction dose", "bolus", "basal", "injection", or any clinical dosing language.
3. ALWAYS include a safety disclaimer that predictions are estimates for informational purposes only.
4. Base all predictions solely on nutritional science: glycaemic index, macronutrient interactions, fibre content, and meal timing.
5. Predictions are for healthy lifestyle awareness, not medical treatment guidance.`,
    messages: [{
      role: 'user',
      content: `Estimate the post-meal blood glucose response curve for this meal.

Meal: ${meal.name ?? 'Unknown food'}
Carbohydrates: ${meal.carbsG ?? 0}g total, ${meal.fibreG ?? 0}g fibre, net carbs: ${netCarbs}g
Fat: ${meal.fatG ?? 0}g, Protein: ${meal.proteinG ?? 0}g
Glycaemic Index estimate: ${meal.giEstimate ?? 'unknown'}
Glycaemic Load estimate: ${meal.glEstimate ?? 'unknown'}
User current glucose: ${baselineMmol} mmol/L
User goal: ${profile?.goal ?? 'not specified'}
Recent post-meal readings (for context): ${JSON.stringify(recentReadings.slice(-8))}

Scientific considerations:
- Fat and protein significantly slow glucose absorption
- Higher fibre lowers effective GI
- High baseline amplifies peak glucose
- Protein can cause delayed secondary rise
- Typical peak for mixed meal: 45-90 minutes

Predict glucose at 0, 30, 60, 90, 120, 150, 180 minutes after eating.

Return ONLY valid JSON:
{
  "curve": [
    {"minutesAfterMeal":0,"predictedMmol":<number>},
    {"minutesAfterMeal":30,"predictedMmol":<number>},
    {"minutesAfterMeal":60,"predictedMmol":<number>},
    {"minutesAfterMeal":90,"predictedMmol":<number>},
    {"minutesAfterMeal":120,"predictedMmol":<number>},
    {"minutesAfterMeal":150,"predictedMmol":<number>},
    {"minutesAfterMeal":180,"predictedMmol":<number>}
  ],
  "peakMmol":<number>,
  "peakMinutes":<number>,
  "confidenceNote":"brief note on prediction confidence based on available data",
  "safetyDisclaimer":"This glucose prediction is an estimate based on nutritional science and is for informational purposes only. It does not constitute medical advice. Always consult your healthcare team for treatment decisions."
}
No markdown, no extra text — just the JSON object.`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    const data = JSON.parse(cleaned)
    // Validate peak is physiologically plausible
    if (typeof data.peakMmol !== 'number' || data.peakMmol < 2 || data.peakMmol > 25) {
      return NextResponse.json({ error: 'AI returned implausible glucose value' }, { status: 422, headers: CORS })
    }
    return NextResponse.json(data, { headers: CORS })
  } catch {
    return NextResponse.json({ error: 'Could not parse AI response', raw: text }, { status: 422, headers: CORS })
  }
}
