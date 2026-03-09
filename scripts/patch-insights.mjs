import { readFileSync, writeFileSync } from 'fs'

let f = readFileSync('app/api/insights/weekly/route.ts', 'utf8')

// 1. Add moodScore calculation before POST
f = f.replace(
  'export async function POST(req: NextRequest) {',
  `function calcMoodScore(moodEntries: { mood?: number }[]): number {
  if (moodEntries.length === 0) return 0
  const avg = moodEntries.reduce((s, e) => s + (e.mood ?? 5), 0) / moodEntries.length
  return Math.round((avg / 10) * 100)
}

export async function POST(req: NextRequest) {`
)

// 2. Extend body type to include mood + conditions
f = f.replace(
  `    weekData: {
      nutrition: DailyNutrition[]
      workouts: DailyWorkout[]
      metrics: DailyMetric[]
      sleep: SleepEntry[]
    }`,
  `    weekData: {
      nutrition: DailyNutrition[]
      workouts: DailyWorkout[]
      metrics: DailyMetric[]
      sleep: SleepEntry[]
      mood?: { mood?: number; date: string }[]
      conditions?: { conditions?: string[]; onMedication?: boolean }
    }`
)

// 3. Add moodScore computation after existing scores
f = f.replace(
  '  const overallScore   = calcOverall(nutritionScore, workoutScore, sleepScore)',
  `  const moodScore      = calcMoodScore(weekData.mood ?? [])
  const overallScore   = calcOverall(nutritionScore, workoutScore, sleepScore)`
)

// 4. Enrich prompt — add conditions line and mood line
f = f.replace(
  "User profile: goal=${profile.goal}, calorie target=${profile.calorieTarget} kcal, protein target=${profile.proteinTargetG}g\n\nWeek summary:",
  "User profile: goal=${profile.goal}, calorie target=${profile.calorieTarget} kcal, protein target=${profile.proteinTargetG}g\nConditions: ${(weekData.conditions?.conditions ?? []).join(', ') || 'none'}\n\nWeek summary:"
)

f = f.replace(
  '- Weight change this week: ${weightDeltaKg !== null ? `${weightDeltaKg > 0 ? \'+\' : \'\'}${weightDeltaKg} kg` : \'not enough data\'}\n\nScores:',
  '- Weight change this week: ${weightDeltaKg !== null ? `${weightDeltaKg > 0 ? \'+\' : \'\'}${weightDeltaKg} kg` : \'not enough data\'}\n- Mood check-ins: ${(weekData.mood ?? []).length} entries${(weekData.mood ?? []).length > 0 ? ` | avg ${((weekData.mood ?? []).reduce((s, e) => s + (e.mood ?? 5), 0) / (weekData.mood ?? []).length).toFixed(1)}/10` : \'\'}\n\nScores:'
)

f = f.replace(
  'Scores: Nutrition ${nutritionScore}/100, Workout ${workoutScore}/100, Sleep ${sleepScore}/100, Overall ${overallScore}/100',
  'Scores: Nutrition ${nutritionScore}/100, Workout ${workoutScore}/100, Sleep ${sleepScore}/100${moodScore > 0 ? `, Mood ${moodScore}/100` : \'\'}, Overall ${overallScore}/100'
)

// 5. Include moodScore in saved insight scores
f = f.replace(
  'scores: { nutrition: nutritionScore, workout: workoutScore, sleep: sleepScore, overall: overallScore },',
  'scores: { nutrition: nutritionScore, workout: workoutScore, sleep: sleepScore, mood: moodScore, overall: overallScore },'
)

writeFileSync('app/api/insights/weekly/route.ts', f)
console.log('patched insights/weekly route')
