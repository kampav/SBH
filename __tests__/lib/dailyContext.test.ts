import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { computeDailyContext, getGreeting } from '@/lib/daily-context'
import type { DailyNutrition, DailyMetric, DailyWorkout, StreakRecord } from '@/lib/types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeNutrition(overrides: Partial<DailyNutrition> = {}): DailyNutrition {
  return {
    date: '2026-03-05',
    totalCalories: 1600,
    totalProteinG: 120,
    totalCarbsG: 150,
    totalFatG: 55,
    waterGlasses: 6,
    meals: [],
    ...overrides,
  }
}

function makeMetric(date: string, weightKg: number): DailyMetric {
  return { date, weightKg, bmi: weightKg / (1.65 * 1.65) }
}

function makeWorkout(overrides: Partial<DailyWorkout> = {}): DailyWorkout {
  return {
    date: '2026-03-05',
    programmeDay: 'Upper Push',
    exercises: [],
    totalVolumeKg: 2000,
    durationMinutes: 45,
    estimatedCaloriesBurned: 320,
    ...overrides,
  }
}

function makeStreak(current: number): StreakRecord {
  return {
    currentStreak: current,
    longestStreak: current,
    lastLogDate: '2026-03-04',
    streakType: 'logging',
    milestones: [],
    updatedAt: null as never,
  }
}

const BASE_OPTS = {
  uid: 'test-user',
  calorieTarget: 2000,
  proteinTarget: 160,
  carbTarget: 180,
  fatTarget: 65,
  trainingDaysPerWeek: 3,
}

// Pin clock to a Monday morning (2026-03-02 09:00)
const FIXED_DATE = new Date('2026-03-02T09:00:00')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_DATE)
})
afterEach(() => {
  vi.useRealTimers()
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('computeDailyContext — calorie status', () => {
  it('is "over" when logged > target', () => {
    const ctx = computeDailyContext({
      ...BASE_OPTS,
      todayNutrition: makeNutrition({ totalCalories: 2200 }),
      recentMetrics: [], recentNutrition: [], todayWorkout: null, streak: null,
    })
    expect(ctx.calorieStatus).toBe('over')
    expect(ctx.calorieRemaining).toBe(-200)
  })

  it('is "on_track" when logged ≥ 90% of target', () => {
    const ctx = computeDailyContext({
      ...BASE_OPTS,
      todayNutrition: makeNutrition({ totalCalories: 1850 }),
      recentMetrics: [], recentNutrition: [], todayWorkout: null, streak: null,
    })
    expect(ctx.calorieStatus).toBe('on_track')
  })

  it('is "behind" when logged < 50% of target', () => {
    const ctx = computeDailyContext({
      ...BASE_OPTS,
      todayNutrition: makeNutrition({ totalCalories: 900 }),
      recentMetrics: [], recentNutrition: [], todayWorkout: null, streak: null,
    })
    expect(ctx.calorieStatus).toBe('behind')
  })

  it('logs zero when no nutrition today', () => {
    const ctx = computeDailyContext({
      ...BASE_OPTS,
      todayNutrition: null,
      recentMetrics: [], recentNutrition: [], todayWorkout: null, streak: null,
    })
    expect(ctx.calorieLogged).toBe(0)
  })
})

describe('computeDailyContext — macro percentages', () => {
  it('caps macro percentages at 100', () => {
    const ctx = computeDailyContext({
      ...BASE_OPTS,
      todayNutrition: makeNutrition({ totalProteinG: 300, totalCarbsG: 400, totalFatG: 200 }),
      recentMetrics: [], recentNutrition: [], todayWorkout: null, streak: null,
    })
    expect(ctx.proteinPct).toBe(100)
    expect(ctx.carbPct).toBe(100)
    expect(ctx.fatPct).toBe(100)
  })
})

describe('computeDailyContext — weight trend', () => {
  it('returns "losing" when weight dropped > 0.3kg over 7 days', () => {
    const metrics = [
      makeMetric('2026-02-23', 83.0),
      makeMetric('2026-02-24', 82.8),
      makeMetric('2026-02-25', 82.5),
    ]
    const ctx = computeDailyContext({
      ...BASE_OPTS, todayNutrition: null, recentMetrics: metrics,
      recentNutrition: [], todayWorkout: null, streak: null,
    })
    expect(ctx.weightTrend).toBe('losing')
  })

  it('returns "nodata" with fewer than 3 metrics', () => {
    const ctx = computeDailyContext({
      ...BASE_OPTS, todayNutrition: null,
      recentMetrics: [makeMetric('2026-03-01', 83)],
      recentNutrition: [], todayWorkout: null, streak: null,
    })
    expect(ctx.weightTrend).toBe('nodata')
  })
})

describe('computeDailyContext — streak', () => {
  it('reflects streak from StreakRecord', () => {
    const ctx = computeDailyContext({
      ...BASE_OPTS, todayNutrition: null, recentMetrics: [], recentNutrition: [],
      todayWorkout: null, streak: makeStreak(14),
    })
    expect(ctx.streakDays).toBe(14)
    expect(ctx.longestStreak).toBe(14)
  })

  it('returns zero streak when no record', () => {
    const ctx = computeDailyContext({
      ...BASE_OPTS, todayNutrition: null, recentMetrics: [], recentNutrition: [],
      todayWorkout: null, streak: null,
    })
    expect(ctx.streakDays).toBe(0)
  })
})

describe('computeDailyContext — workout flags', () => {
  it('marks workoutLogged true when todayWorkout is provided', () => {
    const ctx = computeDailyContext({
      ...BASE_OPTS, todayNutrition: null, recentMetrics: [], recentNutrition: [],
      todayWorkout: makeWorkout(), streak: null,
    })
    expect(ctx.workoutLogged).toBe(true)
    expect(ctx.workoutType).toBe('Upper Push')
  })
})

describe('computeDailyContext — insight badge', () => {
  it('shows streak badge when streak ≥ 7', () => {
    const ctx = computeDailyContext({
      ...BASE_OPTS, todayNutrition: null, recentMetrics: [], recentNutrition: [],
      todayWorkout: null, streak: makeStreak(10),
    })
    expect(ctx.insightBadge).toMatch(/10 day streak/)
  })

  it('shows protein badge when protein hit 100%', () => {
    const ctx = computeDailyContext({
      ...BASE_OPTS,
      todayNutrition: makeNutrition({ totalProteinG: 160 }),
      recentMetrics: [], recentNutrition: [], todayWorkout: null, streak: makeStreak(3),
    })
    expect(ctx.insightBadge).toMatch(/protein target/i)
  })
})

// ── getGreeting ────────────────────────────────────────────────────────────────

describe('getGreeting', () => {
  it('returns morning greeting at 9am', () => {
    expect(getGreeting('morning', 'Pav Kumar')).toBe('Good morning, Pav')
  })

  it('uses only first name', () => {
    expect(getGreeting('evening', 'Pav Kumar')).toBe('Good evening, Pav')
  })

  it('handles night slot', () => {
    expect(getGreeting('night', 'Alex')).toMatch(/late night/i)
  })
})
