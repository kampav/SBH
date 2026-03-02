// ─── Gamification: XP, Streaks, Badges, Tips ──────────────────────────────────

export const DAILY_TIPS: string[] = [
  "Protein is your best friend. Hit your protein target first — everything else follows.",
  "Progressive overload is the #1 driver of muscle growth. Add 2.5kg or 1 rep each week.",
  "Sleep is free anabolic. Aim for 7-9 hours — growth hormone peaks during deep sleep.",
  "You can't out-train a bad diet. Nutrition drives ~80% of body composition changes.",
  "Compound movements (squats, deadlifts, presses) give the best return on your time.",
  "Consistency beats perfection. 80% effort 5 days a week beats 100% effort 2 days.",
  "Your body adapts in 4-6 weeks. Stick with the programme before changing anything.",
  "Creatine monohydrate is the most proven supplement. 5g/day, every day.",
  "Track your lifts. What gets measured gets improved.",
  "Deload weeks are not optional — they're where you actually grow.",
  "Morning training isn't magic. The best workout time is when you'll actually do it.",
  "Protein synthesis stays elevated ~48h post-workout. Space your sessions wisely.",
  "Calorie deficit for fat loss, surplus for muscle — you can't do both simultaneously (mostly).",
  "Water retention can mask fat loss. Stay hydrated and don't panic at the scale.",
  "You're 1% better today than yesterday. Compound that over 365 days.",
  "Rest between sets matters. 2-3 min for strength, 60-90s for hypertrophy.",
  "Your weakest muscle group needs priority — put it first in the session.",
  "BMI is a rough guide. Body fat % and strength metrics tell the real story.",
  "Eat your protein from whole food sources first, then supplement the gap.",
  "Stress and cortisol can stall progress. Recovery is training too.",
  "Science-based training isn't complicated: lift heavy, eat enough protein, sleep, repeat.",
  "Jeremy Ethier's golden rule: progressive overload + sufficient protein = results.",
  "Form before weight. A lighter lift with perfect form builds more muscle than ego lifting.",
  "Nutrition around workouts matters less than total daily intake. Get the basics right first.",
  "Muscle weighs more than fat. The scale might not move, but your shape is changing.",
  "You're more capable than you think. The hardest rep is always the first one today.",
  "Habits compound. One logged meal, one workout, one good night's sleep — they add up.",
  "Don't skip leg day. Your legs are half your body and your biggest calorie burner.",
  "Research shows 10-20 working sets per muscle per week is the optimal range for growth.",
  "The best programme is the one you'll actually follow. Adjust, don't quit.",
]

export function getDailyTip(): string {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length]
}

// ─── XP System ───────────────────────────────────────────────────────────────
export const XP_PER_WORKOUT = 150
export const XP_PER_NUTRITION_DAY = 75
export const XP_PER_WEIGHT_LOG = 25

export function computeXP(workoutDates: string[], nutritionDates: string[], metricDates: string[]): number {
  return (
    workoutDates.length * XP_PER_WORKOUT +
    nutritionDates.length * XP_PER_NUTRITION_DAY +
    metricDates.length * XP_PER_WEIGHT_LOG
  )
}

export function getLevel(xp: number): { level: number; title: string; nextLevelXP: number; currentLevelXP: number } {
  const levels = [
    { level: 1, title: 'Beginner', threshold: 0 },
    { level: 2, title: 'Committed', threshold: 500 },
    { level: 3, title: 'Consistent', threshold: 1200 },
    { level: 4, title: 'Dedicated', threshold: 2500 },
    { level: 5, title: 'Iron Will', threshold: 5000 },
    { level: 6, title: 'Elite', threshold: 10000 },
    { level: 7, title: 'Legend', threshold: 20000 },
  ]
  let current = levels[0]
  for (const l of levels) {
    if (xp >= l.threshold) current = l
    else break
  }
  const nextIndex = levels.findIndex(l => l.level === current.level) + 1
  const next = levels[nextIndex] ?? { threshold: 99999 }
  return {
    level: current.level,
    title: current.title,
    nextLevelXP: next.threshold,
    currentLevelXP: current.threshold,
  }
}

export function getLevelProgress(xp: number): number {
  const { nextLevelXP, currentLevelXP } = getLevel(xp)
  if (nextLevelXP === 99999) return 100
  return Math.min(((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100, 100)
}

// ─── Streaks ──────────────────────────────────────────────────────────────────
export function computeStreak(sortedDates: string[]): number {
  if (!sortedDates.length) return 0
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const unique = Array.from(new Set(sortedDates)).sort().reverse()
  if (unique[0] !== today && unique[0] !== yesterday) return 0
  let streak = 1
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1])
    const curr = new Date(unique[i])
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000)
    if (diff === 1) streak++
    else break
  }
  return streak
}

// ─── Streak Helpers ───────────────────────────────────────────────────────────
export function computeWorkoutStreak(sortedWorkoutDates: string[]): number {
  return computeStreak(sortedWorkoutDates)
}

export const STREAK_MILESTONES = [7, 14, 30, 60, 100]

export function isStreakMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak)
}

// ─── Week Calendar ────────────────────────────────────────────────────────────
export interface WeekDayStatus {
  date: string
  dayName: string
  hasWorkout: boolean
  hasNutrition: boolean
  isToday: boolean
}

export function computeWeekCalendar(
  workoutDates: string[],
  nutritionDates: string[],
): WeekDayStatus[] {
  const today = new Date()
  const dow = today.getDay() // 0=Sun
  const diffToMon = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMon)

  const wSet = new Set(workoutDates)
  const nSet = new Set(nutritionDates)
  const todayStr = today.toISOString().slice(0, 10)
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    return {
      date: dateStr,
      dayName: DAY_NAMES[i],
      hasWorkout: wSet.has(dateStr),
      hasNutrition: nSet.has(dateStr),
      isToday: dateStr === todayStr,
    }
  })
}

// ─── Badges ───────────────────────────────────────────────────────────────────
export interface Badge {
  id: string
  name: string
  desc: string
  icon: string
  color: string
  earned: boolean
}

export function computeBadges(stats: {
  totalWorkouts: number
  totalNutritionDays: number
  totalWeightLogs: number
  workoutStreak: number
  allStreak: number
  xp: number
}): Badge[] {
  return [
    {
      id: 'first_step',
      name: 'First Step',
      desc: 'Log your first workout',
      icon: '🎯',
      color: '#10b981',
      earned: stats.totalWorkouts >= 1,
    },
    {
      id: 'fuel_up',
      name: 'Fuel Up',
      desc: 'Log your first nutrition day',
      icon: '🥗',
      color: '#6366f1',
      earned: stats.totalNutritionDays >= 1,
    },
    {
      id: 'scale_warrior',
      name: 'Scale Warrior',
      desc: 'Log weight 7 days',
      icon: '⚖️',
      color: '#f59e0b',
      earned: stats.totalWeightLogs >= 7,
    },
    {
      id: 'week_warrior',
      name: 'Week Warrior',
      desc: '7-day workout streak',
      icon: '🔥',
      color: '#ef4444',
      earned: stats.workoutStreak >= 7,
    },
    {
      id: 'iron_will',
      name: 'Iron Will',
      desc: '30-day all-activity streak',
      icon: '⚡',
      color: '#8b5cf6',
      earned: stats.allStreak >= 30,
    },
    {
      id: 'strength_10',
      name: 'Ten Workouts',
      desc: 'Complete 10 workouts',
      icon: '💪',
      color: '#10b981',
      earned: stats.totalWorkouts >= 10,
    },
    {
      id: 'protein_king',
      name: 'Protein King',
      desc: 'Log nutrition 14 days',
      icon: '👑',
      color: '#f59e0b',
      earned: stats.totalNutritionDays >= 14,
    },
    {
      id: 'elite',
      name: 'Elite',
      desc: 'Reach Level 5 (5000 XP)',
      icon: '🏆',
      color: '#6366f1',
      earned: stats.xp >= 5000,
    },
  ]
}
