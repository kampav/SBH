import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { calcSleepScore } from '@/lib/health/sleepUtils'
import { SleepEntry, DailyNutrition, DailyWorkout, DailyMetric, UserProfile, WeeklyInsight } from '@/lib/types'

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

// ── Score computation (deterministic — done here, not by Claude) ──────────────

function calcNutritionScore(nutrition: DailyNutrition[], profile: UserProfile): number {
  const logged = nutrition.filter(d => (d.meals?.length ?? 0) > 0)
  if (logged.length === 0) return 0
  const logScore = (logged.length / 7) * 40
  const avgProtein = logged.reduce((s, d) => s + (d.totalProteinG ?? 0), 0) / logged.length
  const proteinPct = Math.min(avgProtein / (profile.proteinTargetG || 1), 1.2)
  const avgCals = logged.reduce((s, d) => s + (d.totalCalories ?? 0), 0) / logged.length
  const calTarget = profile.calorieTarget || 2000
  const calsOff = Math.abs(avgCals - calTarget) / calTarget
  const calorieScore = Math.max(0, 1 - calsOff)
  return Math.round(logScore + (proteinPct * 30) + (calorieScore * 30))
}

function calcWorkoutScore(workouts: DailyWorkout[], profile: UserProfile): number {
  const target = profile.trainingDaysPerWeek || 4
  return Math.min(Math.round((workouts.length / target) * 100), 100)
}

function calcSleepScoreAvg(sleepEntries: SleepEntry[]): number {
  if (sleepEntries.length === 0) return 0
  const avg = sleepEntries.reduce((s, e) => s + calcSleepScore(e.durationH, e.quality), 0) / sleepEntries.length
  return Math.round(avg)
}

function calcOverall(nutrition: number, workout: number, sleep: number): number {
  return Math.round(nutrition * 0.35 + workout * 0.35 + sleep * 0.30)
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { profile, weekData, weekStartDate } = body as {
    profile: UserProfile
    weekData: {
      nutrition: DailyNutrition[]
      workouts: DailyWorkout[]
      metrics: DailyMetric[]
      sleep: SleepEntry[]
    }
    weekStartDate: string
  }

  if (!profile || !weekData || !weekStartDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // ── Compute scores deterministically ─────────────────────────────────────────
  const nutritionScore = calcNutritionScore(weekData.nutrition, profile)
  const workoutScore   = calcWorkoutScore(weekData.workouts, profile)
  const sleepScore     = calcSleepScoreAvg(weekData.sleep)
  const overallScore   = calcOverall(nutritionScore, workoutScore, sleepScore)

  // ── Week summary stats ────────────────────────────────────────────────────────
  const loggedNutrition = weekData.nutrition.filter(d => (d.meals?.length ?? 0) > 0)
  const avgCalories = loggedNutrition.length > 0
    ? Math.round(loggedNutrition.reduce((s, d) => s + (d.totalCalories ?? 0), 0) / loggedNutrition.length)
    : 0
  const avgProteinG = loggedNutrition.length > 0
    ? Math.round(loggedNutrition.reduce((s, d) => s + (d.totalProteinG ?? 0), 0) / loggedNutrition.length)
    : 0
  const avgSleepH = weekData.sleep.length > 0
    ? Math.round(weekData.sleep.reduce((s, e) => s + e.durationH, 0) / weekData.sleep.length * 10) / 10
    : 0
  const sortedMetrics = [...weekData.metrics].sort((a, b) => a.date.localeCompare(b.date))
  const weightDeltaKg = sortedMetrics.length >= 2
    ? Math.round((sortedMetrics[sortedMetrics.length - 1].weightKg - sortedMetrics[0].weightKg) * 10) / 10
    : null

  const weekSummary = {
    avgCalories,
    avgProteinG,
    workoutsLogged: weekData.workouts.length,
    avgSleepH,
    weightDeltaKg,
  }

  // ── Prompt Claude for narrative + highlights + actions only ──────────────────
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: `You are a science-based health coach providing personalised weekly feedback.
IMPORTANT RESTRICTIONS:
- Never provide medical advice, diagnoses, or clinical recommendations
- Never suggest medication dosing or adjustments
- Focus on evidence-based nutrition and exercise science
- Keep tone motivating but realistic
- All output is for informational purposes only`,
    messages: [{
      role: 'user',
      content: `Analyse this user's week and provide personalised feedback.

User profile: goal=${profile.goal}, calorie target=${profile.calorieTarget} kcal, protein target=${profile.proteinTargetG}g

Week summary:
- Nutrition logged: ${loggedNutrition.length}/7 days | Avg calories: ${avgCalories} kcal | Avg protein: ${avgProteinG}g
- Workouts completed: ${weekData.workouts.length} (target: ${profile.trainingDaysPerWeek}/week)
- Sleep: ${weekData.sleep.length} nights logged, avg ${avgSleepH}h
- Weight change this week: ${weightDeltaKg !== null ? `${weightDeltaKg > 0 ? '+' : ''}${weightDeltaKg} kg` : 'not enough data'}

Scores: Nutrition ${nutritionScore}/100, Workout ${workoutScore}/100, Sleep ${sleepScore}/100, Overall ${overallScore}/100

Return ONLY valid JSON with these exact keys:
{
  "narrative": "4-5 sentence personalised summary of their week (mention specific data points)",
  "highlights": ["3 specific observations about their week"],
  "actions": ["3 concrete, actionable tips for next week based on their patterns"]
}
No markdown, no extra text — just the JSON object.`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  let parsed: { narrative: string; highlights: string[]; actions: string[] }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'Could not parse AI response', raw: text }, { status: 422, headers: CORS })
  }

  const insight: WeeklyInsight = {
    weekStartDate,
    generatedAt: new Date().toISOString(),
    narrative: parsed.narrative ?? '',
    highlights: parsed.highlights ?? [],
    actions: parsed.actions ?? [],
    scores: { nutrition: nutritionScore, workout: workoutScore, sleep: sleepScore, overall: overallScore },
    weekData: weekSummary,
  }

  return NextResponse.json(insight, { headers: CORS })
}
