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
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Estimate nutritional content for: ${foodName}${portionText}
Return ONLY valid JSON: {"name":"food name","servingSize":"e.g. 200g or 1 cup","calories":250,"proteinG":20,"carbsG":30,"fatG":8,"confidence":"low|medium|high","notes":"any notes"}
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
