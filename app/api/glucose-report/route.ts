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

  const { profile, glucoseHistory = [], hba1cHistory = [], nutritionHistory = [], settings, reportDateRange } = await req.json()

  // Compute summary statistics
  const allReadings = glucoseHistory.flatMap((d: { readings: { valueMmol: number }[] }) => d.readings ?? [])
  const avgGlucose = allReadings.length > 0
    ? (allReadings.reduce((s: number, r: { valueMmol: number }) => s + r.valueMmol, 0) / allReadings.length).toFixed(1)
    : 'insufficient data'

  const lowMmol = settings?.targetRangeLowMmol ?? 4.0
  const highMmol = settings?.targetRangeHighMmol ?? 8.0
  const inRange = allReadings.filter((r: { valueMmol: number }) => r.valueMmol >= lowMmol && r.valueMmol <= highMmol).length
  const tirPct = allReadings.length > 0 ? Math.round((inRange / allReadings.length) * 100) : 0
  const totalDays = glucoseHistory.length

  const avgCarbs = nutritionHistory.length > 0
    ? Math.round(nutritionHistory.reduce((s: number, d: { totalCarbsG: number }) => s + (d.totalCarbsG ?? 0), 0) / nutritionHistory.length)
    : 0

  const latestHbA1c = hba1cHistory.length > 0
    ? `${hba1cHistory[0].valuePct}% (${hba1cHistory[0].source}, ${hba1cHistory[0].date})`
    : 'No clinic reading recorded'

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system: `You are generating a factual clinical monitoring summary for a patient to share with their healthcare team.
RULES:
1. Write in neutral, professional clinical language using UK English.
2. Never suggest or imply medication changes, insulin dosing adjustments, or treatment modifications.
3. Report only facts: averages, trends, time-in-range, notable patterns, and observations.
4. Do not make diagnoses or clinical recommendations — only describe what the data shows.
5. Use mmol/L units throughout.
6. Structure the summary with clear paragraphs: Overview, Glucose Patterns, Nutritional Context, Observations.
7. End with the mandatory disclaimer provided.`,
    messages: [{
      role: 'user',
      content: `Generate a clinical monitoring summary for the following patient data.

Patient: ${profile?.displayName ?? 'Patient'}
Report period: ${reportDateRange?.from ?? '30 days ago'} to ${reportDateRange?.to ?? 'today'}
Age: ${profile?.age ?? 'not specified'}, Sex: ${profile?.sex ?? 'not specified'}

GLUCOSE DATA:
- Total days with readings: ${totalDays}
- Total readings: ${allReadings.length}
- Average glucose: ${avgGlucose} mmol/L
- Time in target range (${lowMmol}–${highMmol} mmol/L): ${tirPct}%
- Latest HbA1c: ${latestHbA1c}

NUTRITION DATA:
- Average daily carbohydrate intake: ${avgCarbs}g
- Days logged: ${nutritionHistory.length}

Write 3-4 paragraphs covering: overall glucose control summary, notable patterns or variability, nutritional context, and any trends worth discussing with a clinician.

End the summary with exactly this text on a new line:
"This report was auto-generated from patient self-monitoring data and is for informational purposes only. It does not constitute medical advice and should not be used as the sole basis for clinical decision-making."`,
    }],
  })

  const summary = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  return NextResponse.json({
    summary,
    generatedAt: new Date().toISOString(),
    stats: { avgGlucose, tirPct, totalDays, totalReadings: allReadings.length, avgCarbs, latestHbA1c },
  }, { headers: CORS })
}
