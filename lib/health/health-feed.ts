import {
  UserProfile, DailyNutrition, DailyWorkout, DailyMetric,
  SleepEntry, MoodEntry, BloodPressureReading, DailyGlucose,
  GlucoseSettings, ConditionKey,
} from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────
export type HealthCardType =
  | 'nutrition' | 'workout' | 'sleep' | 'glucose' | 'blood_pressure'
  | 'mood' | 'weight' | 'hydration' | 'condition_tip' | 'streak'

export interface HealthCard {
  id: string
  type: HealthCardType
  priority: number          // 0-100, higher = render first
  title: string
  subtitle: string
  insight: string
  cta?: { label: string; href: string }
  color: string
  emoji: string
  trend?: 'improving' | 'declining' | 'stable' | 'none'
  value?: string
}

export interface FeedInput {
  profile: UserProfile
  todayNutrition: DailyNutrition | null
  recentWorkouts: DailyWorkout[]
  recentMetrics: DailyMetric[]
  recentSleep: SleepEntry[]
  recentMood: MoodEntry[]
  recentBP: BloodPressureReading[]
  recentGlucose: DailyGlucose | null
  glucoseSettings: GlucoseSettings | null
  today: string   // YYYY-MM-DD
}

// ── Condition-specific tips ────────────────────────────────────────────────────
const CONDITION_TIPS: Record<ConditionKey, { title: string; insight: string }[]> = {
  hypertension: [
    { title: 'DASH Diet', insight: 'Aim for less than 2,300mg sodium today. Swap processed snacks for potassium-rich foods like bananas and sweet potatoes.' },
    { title: 'BP Monitoring', insight: 'Log your blood pressure at the same time each day for accurate trend data — ideally resting, morning or evening.' },
    { title: 'Aerobic Exercise', insight: '30 minutes of moderate cardio (brisk walk, cycling) can reduce systolic BP by 4-9 mmHg over time.' },
  ],
  type2_diabetes: [
    { title: 'Post-Meal Glucose', insight: 'Log a glucose reading 2 hours after your largest meal to track how your body responds to carbohydrates.' },
    { title: 'Protein First Strategy', insight: 'Eating protein before carbs can blunt the post-meal glucose spike by up to 30%. Try it at your next meal.' },
    { title: 'Low-GI Choices', insight: 'Swap white rice for basmati or lentils. These have a GI under 55 and cause a slower, flatter glucose response.' },
  ],
  prediabetes: [
    { title: 'Reduce Ultra-Processed Foods', insight: 'Ultra-processed foods are the largest driver of prediabetes progression. Aim for whole-food meals today.' },
    { title: 'Walk After Meals', insight: 'A 10-minute walk after each meal reduces post-meal glucose spikes by up to 22%.' },
    { title: 'Carb Budget', insight: 'Keep refined carbs under 130g today. Focus on protein, healthy fats, and fibre to improve insulin sensitivity.' },
  ],
  pcos: [
    { title: 'Anti-Inflammatory Eating', insight: 'Prioritise omega-3 rich foods (salmon, walnuts, chia seeds) and reduce refined carbs to lower inflammation markers.' },
    { title: 'Resistance Training', insight: '3 resistance sessions per week improves insulin sensitivity and supports hormonal balance in PCOS.' },
    { title: 'Stress & Cortisol', insight: 'High cortisol worsens PCOS symptoms. Your mood tracker can help identify stress patterns — log a check-in today.' },
  ],
  hypothyroidism: [
    { title: 'Medication Timing', insight: 'Take thyroid medication 30-60 minutes before breakfast on an empty stomach, away from calcium and iron supplements.' },
    { title: 'Selenium & Iodine', insight: 'Include selenium-rich foods (Brazil nuts, tuna) and iodine sources (dairy, eggs) to support thyroid function.' },
    { title: 'Sleep Consistency', insight: 'Poor sleep amplifies hypothyroid fatigue. Aim for 7-9 hours and log your sleep to track patterns.' },
  ],
  anxiety: [
    { title: 'Track Your Triggers', insight: 'Log a mood check-in today. Tracking anxiety patterns over time reveals triggers you can address systematically.' },
    { title: 'Caffeine Awareness', insight: 'More than 400mg caffeine per day can worsen anxiety. Consider cutting off coffee after 2pm.' },
    { title: 'Exercise as Therapy', insight: 'Just 20 minutes of moderate exercise reduces anxiety symptoms as effectively as a low-dose anxiolytic. Log your workout.' },
  ],
  depression: [
    { title: 'Move Today', insight: 'Even a 15-minute walk outdoors has measurable antidepressant effects. Log it as cardio — every step counts.' },
    { title: 'Mood Tracking', insight: 'Log a mood check-in to build your emotional baseline. Patterns often emerge after 2 weeks of consistent tracking.' },
    { title: 'Protein & Brain Health', insight: 'Serotonin is made from tryptophan (found in eggs, poultry, oats). Hitting your protein target supports mood chemistry.' },
  ],
  ibs: [
    { title: 'Low-FODMAP Guide', insight: 'IBS is often triggered by fermentable carbs. Avoid onion, garlic, and excess dairy — add notes when logging meals.' },
    { title: 'Meal Regularity', insight: 'Eating at consistent times reduces gut dysmotility. Try to log meals at similar times each day.' },
    { title: 'Soluble Fibre', insight: 'Soluble fibre (oats, psyllium) soothes IBS-D. Avoid excess insoluble fibre (wheat bran) if prone to IBS-C flares.' },
  ],
  heart_disease: [
    { title: 'Saturated Fat Limit', insight: 'Keep saturated fat under 20g today. Swap butter for olive oil and choose lean proteins over fatty cuts.' },
    { title: 'Cardio is Medicine', insight: '150 minutes of moderate aerobic exercise per week reduces cardiovascular mortality by 35%. Log today\'s session.' },
    { title: 'Resting Heart Rate', insight: 'Log your resting pulse with your BP reading. A resting HR under 70 bpm is a strong cardiac health marker.' },
  ],
  obesity: [
    { title: 'Protein Priority', insight: 'High-protein meals (30g+) reduce hunger hormones for 3-5 hours. Hitting your protein target is the #1 lever for fat loss.' },
    { title: 'Log Everything', insight: 'Consistent food logging — even imperfectly — reduces calorie intake by an average of 300 kcal/day.' },
    { title: 'Step Count Goal', insight: '10,000 steps/day burns roughly 400-500 kcal. Try adding a 20-minute walk after lunch and dinner.' },
  ],
}

function conditionEmoji(condition: ConditionKey): string {
  const map: Record<ConditionKey, string> = {
    type2_diabetes: '🩸', prediabetes: '🩸', hypertension: '❤️',
    pcos: '🌸', hypothyroidism: '🦋', anxiety: '🧠',
    depression: '💙', ibs: '🫁', heart_disease: '❤️', obesity: '⚖️',
  }
  return map[condition] ?? '💊'
}

function bpCat(sys: number, dia: number): 'normal' | 'elevated' | 'stage1' | 'high' {
  if (sys < 120 && dia < 80) return 'normal'
  if (sys < 130 && dia < 80) return 'elevated'
  if (sys < 140 || dia < 90) return 'stage1'
  return 'high'
}

// ── Main export ───────────────────────────────────────────────────────────────
export function computeHealthFeed(input: FeedInput): { score: number; cards: HealthCard[] } {
  const {
    profile, todayNutrition, recentWorkouts, recentMetrics,
    recentSleep, recentMood, recentBP, recentGlucose,
    glucoseSettings, today,
  } = input
  const conditions = profile.conditionProfile?.conditions ?? []
  const cards: HealthCard[] = []

  // ── Daily Health Score ────────────────────────────────────────────────────
  let score = 0

  // Nutrition (25 pts)
  let nutritionScore = 0
  if (todayNutrition?.totalCalories) {
    const r = todayNutrition.totalCalories / profile.calorieTarget
    nutritionScore = r >= 0.85 && r <= 1.15 ? 25 : r >= 0.7 && r <= 1.25 ? 15 : 5
  }
  score += nutritionScore

  // Workout (20 pts)
  const workedOutToday = recentWorkouts.some(w => w.date === today)
  const last3 = new Date(today); last3.setDate(last3.getDate() - 3)
  const recentWorkoutCount = recentWorkouts.filter(w => w.date >= last3.toISOString().slice(0, 10)).length
  score += workedOutToday ? 20 : recentWorkoutCount > 0 ? 10 : 0

  // Sleep (20 pts)
  const lastSleep = recentSleep.length ? recentSleep[recentSleep.length - 1] : null
  if (lastSleep) {
    const { durationH, quality } = lastSleep
    score += durationH >= 7 && durationH <= 9 && quality >= 4 ? 20
           : durationH >= 6 && durationH <= 10 && quality >= 3 ? 12 : 5
  }

  // Hydration (10 pts)
  const glasses = todayNutrition?.waterGlasses ?? 0
  score += glasses >= 8 ? 10 : glasses >= 5 ? 6 : glasses >= 2 ? 3 : 0

  // Mood (10 pts — only if logged)
  const todayMood = recentMood.find(m => m.date === today)
  score += todayMood ? (todayMood.mood >= 3 ? 10 : 5) : 0

  // Weight (5 pts)
  const wk = new Date(today); wk.setDate(wk.getDate() - 7)
  const loggedWeight = recentMetrics.some(m => m.date >= wk.toISOString().slice(0, 10))
  score += loggedWeight ? 5 : 0

  // Glucose (5 pts if tracking, else full points)
  if (glucoseSettings?.consentGiven && recentGlucose?.readings?.length) {
    const inRange = recentGlucose.readings.filter(r =>
      r.valueMmol >= glucoseSettings.targetRangeLowMmol &&
      r.valueMmol <= glucoseSettings.targetRangeHighMmol
    ).length
    score += Math.round((inRange / recentGlucose.readings.length) * 5)
  } else {
    score += 5
  }

  // BP (5 pts if tracking, else full for non-cardiac users)
  if (recentBP.length > 0) {
    const latest = recentBP[recentBP.length - 1]
    const cat = bpCat(latest.systolic, latest.diastolic)
    score += cat === 'normal' ? 5 : cat === 'elevated' ? 3 : 1
  } else if (!conditions.includes('hypertension') && !conditions.includes('heart_disease')) {
    score += 5
  }

  score = Math.min(Math.round(score), 100)

  // ── Build cards ───────────────────────────────────────────────────────────

  // — Nutrition
  if (!todayNutrition?.totalCalories) {
    cards.push({
      id: 'nutrition-log', type: 'nutrition', priority: 90,
      title: 'Log your first meal', subtitle: 'Nutrition tracking',
      insight: 'Start logging today\'s meals to stay on track with your calorie and protein targets.',
      cta: { label: 'Log a meal', href: '/nutrition' },
      color: '#10b981', emoji: '🥗', trend: 'none',
    })
  } else {
    const calRatio = todayNutrition.totalCalories / profile.calorieTarget
    const protRatio = todayNutrition.totalProteinG / profile.proteinTargetG
    const over = calRatio > 1.2
    const lowProt = protRatio < 0.5
    cards.push({
      id: 'nutrition-status', type: 'nutrition',
      priority: over ? 75 : lowProt ? 60 : 30,
      title: over ? 'Calories over target' : lowProt ? 'Protein needs a boost' : 'Nutrition on track',
      subtitle: `${todayNutrition.totalCalories} kcal · ${todayNutrition.totalProteinG}g protein`,
      insight: over
        ? `You're ${Math.round(todayNutrition.totalCalories - profile.calorieTarget)} kcal over. A protein-rich dinner keeps you satiated without more calories.`
        : lowProt
        ? `${Math.round(protRatio * 100)}% of protein target hit. Add Greek yoghurt, cottage cheese, or a protein shake.`
        : `Calories within range and protein at ${Math.round(protRatio * 100)}% of target. Strong day.`,
      cta: { label: 'View nutrition', href: '/nutrition' },
      color: '#10b981', emoji: '🥗',
      trend: over ? 'declining' : protRatio >= 0.8 ? 'improving' : 'stable',
      value: `${todayNutrition.totalCalories} kcal`,
    })
  }

  // — Workout
  if (!workedOutToday) {
    cards.push({
      id: 'workout-log', type: 'workout', priority: 80,
      title: 'No workout logged today', subtitle: 'Resistance training',
      insight: 'Consistency beats perfection. Even 30 minutes builds the habit. Your programme is ready.',
      cta: { label: 'Start workout', href: '/workout' },
      color: '#6366f1', emoji: '🏋️', trend: 'none',
    })
  } else {
    const doneToday = [...recentWorkouts].filter(w => w.date === today).pop()
    cards.push({
      id: 'workout-done', type: 'workout', priority: 15,
      title: 'Workout complete', subtitle: doneToday ? `${doneToday.durationMinutes} min · ${Math.round(doneToday.totalVolumeKg)}kg volume` : 'Done today',
      insight: 'Muscles are adapting. Ensure you hit your protein target for optimal recovery.',
      cta: { label: 'View history', href: '/workout/history' },
      color: '#6366f1', emoji: '🏋️', trend: 'improving',
      value: doneToday ? `${doneToday.durationMinutes}m` : undefined,
    })
  }

  // — Sleep
  if (!lastSleep) {
    cards.push({
      id: 'sleep-log', type: 'sleep', priority: 50,
      title: 'Log last night\'s sleep', subtitle: 'Sleep tracking',
      insight: 'Sleep is where muscles repair and fat-loss hormones reset. Log to track recovery quality.',
      cta: { label: 'Log sleep', href: '/sleep' },
      color: '#8b5cf6', emoji: '🌙', trend: 'none',
    })
  } else {
    const { durationH, quality } = lastSleep
    const good = durationH >= 7 && durationH <= 9 && quality >= 4
    const poor = durationH < 6
    cards.push({
      id: 'sleep-status', type: 'sleep',
      priority: good ? 10 : poor ? 70 : 35,
      title: good ? 'Excellent sleep' : poor ? 'Sleep debt detected' : 'Sleep could improve',
      subtitle: `${durationH.toFixed(1)}h · Quality ${quality}/5`,
      insight: good
        ? 'Quality sleep is boosting your recovery and cognitive performance today.'
        : poor
        ? 'Under 6 hours impairs muscle protein synthesis by 18% and spikes cortisol. Aim for 7-9 hours tonight.'
        : 'Aim for 7-9 hours with consistent bed and wake times for optimal recovery.',
      cta: { label: 'Sleep tracker', href: '/sleep' },
      color: '#8b5cf6', emoji: '🌙',
      trend: good ? 'improving' : 'declining',
      value: `${durationH.toFixed(1)}h`,
    })
  }

  // — Hydration
  if (glasses < 6) {
    cards.push({
      id: 'hydration', type: 'hydration', priority: 55,
      title: glasses === 0 ? 'Start hydrating now' : `${glasses} glasses logged`,
      subtitle: 'Hydration tracking',
      insight: 'Mild dehydration (1-2%) reduces strength output by 10% and impairs focus. Target 8 glasses today.',
      cta: { label: 'Log water', href: '/nutrition' },
      color: '#06b6d4', emoji: '💧', trend: 'none',
      value: `${glasses}/8`,
    })
  }

  // — Mood
  if (!todayMood) {
    const condBoost = conditions.some(c => c === 'anxiety' || c === 'depression') ? 30 : 0
    cards.push({
      id: 'mood-log', type: 'mood', priority: 40 + condBoost,
      title: 'How are you feeling today?', subtitle: 'Mood & mental wellness',
      insight: 'Daily mood check-ins take 30 seconds and reveal patterns that transform mental health management.',
      cta: { label: 'Log mood', href: '/mood' },
      color: '#a78bfa', emoji: '🧠', trend: 'none',
    })
  } else {
    const low = todayMood.mood <= 2 || todayMood.anxiety >= 4
    const moodLabels = ['', 'Very Low', 'Low', 'Neutral', 'Good', 'Great']
    cards.push({
      id: 'mood-status', type: 'mood',
      priority: low ? 65 : 10,
      title: low ? 'Tough day — be kind to yourself' : `Mood: ${moodLabels[todayMood.mood]}`,
      subtitle: `Energy ${todayMood.energy}/5 · Anxiety ${todayMood.anxiety}/5`,
      insight: low
        ? 'Physical movement, even a 10-min walk, reliably lifts mood. Protein intake also affects serotonin — keep logging.'
        : 'Good mental state — this is when habits form most easily. Make the most of your energy today.',
      cta: { label: 'Mood tracker', href: '/mood' },
      color: '#a78bfa', emoji: '🧠',
      trend: low ? 'declining' : 'improving',
    })
  }

  // — Blood Pressure
  const bpCondition = conditions.includes('hypertension') || conditions.includes('heart_disease')
  if (recentBP.length === 0) {
    if (bpCondition) {
      cards.push({
        id: 'bp-log', type: 'blood_pressure', priority: 75,
        title: 'Log your blood pressure', subtitle: 'Heart health monitoring',
        insight: 'Regular monitoring is the most effective way to manage hypertension. Aim for daily readings at the same time.',
        cta: { label: 'Log BP', href: '/blood-pressure' },
        color: '#ef4444', emoji: '❤️', trend: 'none',
      })
    }
  } else {
    const latestBP = recentBP[recentBP.length - 1]
    const cat = bpCat(latestBP.systolic, latestBP.diastolic)
    const isHigh = cat === 'stage1' || cat === 'high'
    cards.push({
      id: 'bp-status', type: 'blood_pressure',
      priority: isHigh ? 85 : bpCondition ? 25 : 15,
      title: isHigh ? `BP elevated: ${latestBP.systolic}/${latestBP.diastolic}` : `BP healthy: ${latestBP.systolic}/${latestBP.diastolic}`,
      subtitle: `${latestBP.date} · ${latestBP.time}`,
      insight: isHigh
        ? 'Sustained elevated BP increases stroke risk. Reduce sodium and stress. Consult your GP if this persists.'
        : 'Blood pressure is in a healthy range. Keep up the consistent monitoring.',
      cta: { label: 'BP tracker', href: '/blood-pressure' },
      color: isHigh ? '#ef4444' : '#10b981',
      emoji: isHigh ? '⚠️' : '❤️',
      trend: isHigh ? 'declining' : 'stable',
      value: `${latestBP.systolic}/${latestBP.diastolic}`,
    })
  }

  // — Weight / Metrics
  if (!loggedWeight) {
    cards.push({
      id: 'weight-log', type: 'weight', priority: 45,
      title: 'No weight logged this week', subtitle: 'Body metrics',
      insight: 'Weekly weigh-ins (same time, same conditions) are the best way to track fat loss trends. Log today.',
      cta: { label: 'Log weight', href: '/metrics' },
      color: '#f59e0b', emoji: '⚖️', trend: 'none',
    })
  } else {
    const sorted = [...recentMetrics].sort((a, b) => a.date.localeCompare(b.date))
    const newest = sorted[sorted.length - 1]
    const oldest = sorted[0]
    const delta = newest.weightKg - oldest.weightKg
    cards.push({
      id: 'weight-status', type: 'weight', priority: 12,
      title: delta < -0.2 ? 'Losing fat' : delta > 0.5 ? 'Weight trending up' : 'Weight stable',
      subtitle: `${newest.weightKg}kg · ${newest.date}`,
      insight: delta < -0.2
        ? `Down ${Math.abs(delta).toFixed(1)}kg. Keep your calorie deficit consistent and prioritise protein.`
        : delta > 0.5
        ? `Up ${delta.toFixed(1)}kg. Check your calorie intake — are you in a surplus?`
        : 'Weight stable — adjust calories if you want to change trajectory.',
      cta: { label: 'Body metrics', href: '/metrics' },
      color: delta < -0.2 ? '#10b981' : delta > 0.5 ? '#f59e0b' : '#6366f1',
      emoji: '⚖️',
      trend: delta < -0.2 ? 'improving' : delta > 0.5 ? 'declining' : 'stable',
      value: `${newest.weightKg}kg`,
    })
  }

  // — Condition-specific tip cards (one per condition)
  for (const condition of conditions) {
    const tips = CONDITION_TIPS[condition]
    if (!tips) continue
    const tip = tips[new Date().getDay() % tips.length]
    cards.push({
      id: `condition-${condition}`, type: 'condition_tip', priority: 35,
      title: tip.title,
      subtitle: condition.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      insight: tip.insight,
      color: '#06b6d4',
      emoji: conditionEmoji(condition),
      trend: 'none',
    })
  }

  cards.sort((a, b) => b.priority - a.priority)
  return { score, cards }
}

// Score label helper
export function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: '#10b981' }
  if (score >= 60) return { label: 'Good', color: '#22d3ee' }
  if (score >= 40) return { label: 'Fair', color: '#f59e0b' }
  if (score >= 20) return { label: 'Needs Attention', color: '#f97316' }
  return { label: 'Getting Started', color: '#8b5cf6' }
}
