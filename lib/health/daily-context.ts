// lib/daily-context.ts
// Computes a DailyContext object for hyper-personalised dashboard rendering.
// Called client-side on dashboard load (no SSR — uses Firebase client SDK).

import { DailyContext, DailyNutrition, DailyMetric, DailyWorkout, StreakRecord, TimeSlot, WeightTrend, CalorieStatus } from '../types'

function getTimeSlot(): TimeSlot {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'morning'
  if (h >= 12 && h < 14) return 'midday'
  if (h >= 14 && h < 17) return 'afternoon'
  if (h >= 17 && h < 21) return 'evening'
  return 'night'
}

function getWeightTrend(metrics: DailyMetric[]): WeightTrend {
  if (metrics.length < 3) return 'nodata'
  const recent = metrics.slice(-7)
  if (recent.length < 2) return 'nodata'
  const first = recent[0].weightKg
  const last  = recent[recent.length - 1].weightKg
  const delta = last - first
  if (Math.abs(delta) < 0.3) return 'stable'
  return delta < 0 ? 'losing' : 'gaining'
}

function getCalorieStatus(logged: number, target: number): CalorieStatus {
  const pct = logged / target
  if (logged > target) return 'over'
  if (pct >= 0.9)  return 'on_track'
  if (pct >= 0.5)  return 'ahead'
  return 'behind'
}

function calcWeeklyDeficit(metrics: DailyMetric[], nutrition: DailyNutrition[], target: number): number {
  // Simple approximation: weekly calorie deficit from logged data
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().slice(0, 10)
  const weekNutrition = nutrition.filter(n => n.date >= weekAgoStr)
  if (weekNutrition.length === 0) return 0
  const avgLogged = weekNutrition.reduce((s, n) => s + n.totalCalories, 0) / weekNutrition.length
  return Math.round((target - avgLogged) * 7)
}

interface ComputeOptions {
  uid: string
  todayNutrition: DailyNutrition | null
  recentMetrics: DailyMetric[]
  recentNutrition: DailyNutrition[]
  todayWorkout: DailyWorkout | null
  streak: StreakRecord | null
  calorieTarget: number
  proteinTarget: number
  carbTarget: number
  fatTarget: number
  trainingDaysPerWeek: number
}

export function computeDailyContext(opts: ComputeOptions): DailyContext {
  const {
    uid, todayNutrition, recentMetrics, recentNutrition,
    todayWorkout, streak, calorieTarget, proteinTarget, carbTarget, fatTarget,
    trainingDaysPerWeek,
  } = opts

  const date = new Date().toISOString().slice(0, 10)
  const timeSlot = getTimeSlot()

  const calorieLogged = todayNutrition?.totalCalories ?? 0
  const calorieRemaining = calorieTarget - calorieLogged
  const calorieStatus = getCalorieStatus(calorieLogged, calorieTarget)

  const proteinLogged = todayNutrition?.totalProteinG ?? 0
  const carbLogged    = todayNutrition?.totalCarbsG ?? 0
  const fatLogged     = todayNutrition?.totalFatG ?? 0

  const proteinPct = Math.min(Math.round((proteinLogged / proteinTarget) * 100), 100)
  const carbPct    = Math.min(Math.round((carbLogged / carbTarget) * 100), 100)
  const fatPct     = Math.min(Math.round((fatLogged / fatTarget) * 100), 100)
  const hydrationPct = Math.min(Math.round(((todayNutrition?.waterGlasses ?? 0) / 8) * 100), 100)

  const weightTrend = getWeightTrend(recentMetrics)
  const weeklyDeficit = calcWeeklyDeficit(recentMetrics, recentNutrition, calorieTarget)

  const streakDays   = streak?.currentStreak ?? 0
  const longestStreak = streak?.longestStreak ?? 0

  // Determine if workout scheduled today (simple: training N days/week → check day of week)
  const dayOfWeek = new Date().getDay()  // 0=Sun
  const workoutDays = trainingDaysPerWeek >= 5
    ? [1,2,3,4,5] : trainingDaysPerWeek >= 4
    ? [1,2,4,5] : trainingDaysPerWeek >= 3
    ? [1,3,5] : [1,4]
  const workoutScheduledToday = workoutDays.includes(dayOfWeek)
  const workoutLogged = todayWorkout != null
  const workoutType = todayWorkout?.programmeDay ?? 'Strength'

  // Priority action
  let priorityAction: DailyContext['priorityAction'] = 'log_meal'
  if (hydrationPct < 40) priorityAction = 'drink_water'
  else if (workoutScheduledToday && !workoutLogged && (timeSlot === 'afternoon' || timeSlot === 'evening')) priorityAction = 'log_workout'
  else if (calorieLogged === 0) priorityAction = 'log_meal'
  else if (recentMetrics.length === 0 || recentMetrics[recentMetrics.length - 1]?.date !== date) priorityAction = 'weigh_in'
  else if (calorieStatus === 'on_track' && workoutLogged) priorityAction = 'rest'

  // Insight badge
  let insightBadge: string | null = null
  if (streakDays >= 7)     insightBadge = `${streakDays} day streak! 🔥`
  else if (proteinPct >= 100) insightBadge = 'Protein target hit! 💪'
  else if (calorieStatus === 'on_track' && timeSlot === 'evening') insightBadge = 'On track today ✓'
  else if (weightTrend === 'losing') insightBadge = 'Weight trending down 📉'

  return {
    uid, date, calorieTarget, calorieLogged, calorieRemaining, calorieStatus,
    proteinPct, carbPct, fatPct, hydrationPct,
    workoutScheduledToday, workoutLogged, workoutType,
    weightTrend, weeklyDeficit, streakDays, longestStreak,
    timeSlot, priorityAction, insightBadge,
  }
}

/** Greeting text based on time slot */
export function getGreeting(timeSlot: TimeSlot, name: string): string {
  const n = name.split(' ')[0]
  switch (timeSlot) {
    case 'morning':   return `Good morning, ${n}`
    case 'midday':    return `Good afternoon, ${n}`
    case 'afternoon': return `Afternoon, ${n}`
    case 'evening':   return `Good evening, ${n}`
    case 'night':     return `Late night, ${n}`
  }
}
