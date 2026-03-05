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

  const { imageBase64, mimeType = 'image/jpeg' } = await req.json()
  if (!imageBase64) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp', data: imageBase64 },
        },
        {
          type: 'text',
          text: `Analyse this food image and estimate nutritional content for the visible portion.
Return ONLY valid JSON with these exact keys (all numeric fields are numbers or null, not strings):
{"name":"food name","servingSize":"estimated portion e.g. 200g","calories":250,"proteinG":20,"carbsG":30,"fatG":8,"fibreG":4,"freeSugarsG":2,"saturatedFatG":2.5,"omega3Mg":150,"sodiumMg":350,"potassiumMg":400,"vitaminCMg":15,"vitaminDMcg":2.5,"calciumMg":80,"ironMg":2,"magnesiumMg":35,"zincMg":1.5,"vitaminB12Mcg":0.5,"folateMcg":30,"vitaminAMcg":50,"giEstimate":55,"glEstimate":11,"confidence":"low|medium|high","notes":"any relevant notes"}
For giEstimate: Glycaemic Index (0-100). Low GI<55 (legumes, oats, most veg), High GI>70 (white bread, white rice, sugary drinks). Use null if cannot be estimated for a mixed dish.
For glEstimate: (giEstimate x (carbsG - fibreG)) / 100. Use null if giEstimate is null.
Estimate all micronutrients as best you can for the food type; use null only if truly impossible.
IMPORTANT: This data is for informational purposes only. Do not provide medical dosing advice.
No markdown, no extra text — just the JSON object.`,
        },
      ],
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    const data = JSON.parse(cleaned)
    return NextResponse.json(data, { headers: CORS })
  } catch {
    return NextResponse.json({ error: 'Could not parse AI response', raw: text }, { status: 422, headers: CORS })
  }
}
