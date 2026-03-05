import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

// CORS headers for Capacitor WebView (origin: https://localhost)
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

  const { foodName, servingSize } = await req.json()
  if (!foodName) return NextResponse.json({ error: 'No food name provided' }, { status: 400 })

  const portionText = servingSize ? ` (${servingSize})` : ''

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 768,
    messages: [{
      role: 'user',
      content: `Estimate nutritional content for: ${foodName}${portionText}
Return ONLY valid JSON with these exact keys (all numeric fields are numbers or null, not strings):
{"name":"food name","servingSize":"e.g. 200g or 1 cup","calories":250,"proteinG":20,"carbsG":30,"fatG":8,"fibreG":3,"freeSugarsG":1,"saturatedFatG":2,"omega3Mg":100,"sodiumMg":300,"potassiumMg":350,"vitaminCMg":10,"vitaminDMcg":1,"calciumMg":60,"ironMg":1.5,"magnesiumMg":30,"zincMg":1,"vitaminB12Mcg":0.3,"folateMcg":25,"vitaminAMcg":40,"giEstimate":52,"glEstimate":10,"confidence":"low|medium|high","notes":"any notes"}
For giEstimate (0-100): white bread=75, white rice=72, basmati=58, brown rice=50, oats=55, lentils/dal=30, chickpeas=33, banana=51, sweet potato=44, chicken/fish/eggs=0.
For glEstimate: (giEstimate x (carbsG - fibreG)) / 100.
Estimate all micronutrients as best you can; use null only if truly impossible.
IMPORTANT: This is nutritional information only. Never provide insulin dosing or medical treatment advice.
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
