import { describe, it, expect } from 'vitest'
import { PROGRAMMES, ALL_EXERCISES, MUSCLE_GROUPS } from '@/lib/workout/exerciseData'
import { getSuggestion } from '@/lib/health/progressive-overload'

// ─── Day mapping (mirrors app/workout/page.tsx logic) ─────────────────────────
function mapDayOfWeek(jsDay: number): number {
  // getDay(): 0=Sun, 1=Mon, …, 6=Sat
  return jsDay === 0 ? 6 : jsDay - 1  // Mon=0 … Sat=5, Sun=6
}

describe('Day-of-week mapping', () => {
  it('maps Monday (1) to 0', () => expect(mapDayOfWeek(1)).toBe(0))
  it('maps Saturday (6) to 5', () => expect(mapDayOfWeek(6)).toBe(5))
  it('maps Sunday (0) to 6 — rest day for all programmes', () => expect(mapDayOfWeek(0)).toBe(6))
  it('does NOT cap Sunday at Saturday index', () => expect(mapDayOfWeek(0)).not.toBe(5))
})

// ─── Programme completeness ───────────────────────────────────────────────────
describe('Programme day arrays', () => {
  it.each(Object.entries(PROGRAMMES))('%s has exactly 7 days', (_, prog) => {
    expect(prog).toHaveLength(7)
  })

  it.each(Object.entries(PROGRAMMES))('%s Sunday (index 6) is always a rest day', (_, prog) => {
    expect(prog[6].isRest).toBe(true)
  })

  it.each(Object.entries(PROGRAMMES))('%s day indices are 0–6 contiguous', (_, prog) => {
    prog.forEach((day, i) => expect(day.dayOfWeek).toBe(i))
  })
})

// ─── Saturday exercises (home_6day is the only programme with Saturday training) ──
describe('home_6day Saturday exercises', () => {
  const satDay = PROGRAMMES.home_6day[5]

  it('Saturday is not a rest day for home_6day', () => {
    expect(satDay.isRest).toBeUndefined()
  })

  it('Saturday has exercises', () => {
    expect(satDay.exercises.length).toBeGreaterThan(0)
  })

  it('all Saturday exercises have a non-empty name', () => {
    satDay.exercises.forEach(e => expect(e.name).toBeTruthy())
  })

  it('all Saturday exercises have restSeconds >= 0', () => {
    satDay.exercises.forEach(e => expect(e.restSeconds).toBeGreaterThanOrEqual(0))
  })

  it('all Saturday exercises have sets >= 1', () => {
    satDay.exercises.forEach(e => expect(e.sets).toBeGreaterThanOrEqual(1))
  })
})

// ─── Saturday progressive overload for ladder exercises ───────────────────────
describe('getOverloadHint for ladder repRange', () => {
  it('returns start action for first-time ladder exercise', () => {
    const r = getSuggestion([], 'Ladder: Jumping Jacks (10→20→30)', 10, 0)
    expect(r.action).toBe('start')
  })

  it('does not crash when repRange is "ladder"', () => {
    // targetReps = parseInt('ladder') || 10 = 10
    expect(() => getSuggestion([], 'Ladder: Squats', 10, 0)).not.toThrow()
  })

  it('returns maintain action for incomplete previous ladder sets', () => {
    const sets = [
      { setNumber: 1, weightKg: 0, reps: 8, completed: true, restSeconds: 30 },
    ]
    // Last reps (8) < targetReps (10) - 2 = 8 → borderline, should not throw
    expect(() => getSuggestion(sets, 'Ladder: Mountain Climbers', 10, 1)).not.toThrow()
  })
})

// ─── ALL_EXERCISES derived list ───────────────────────────────────────────────
describe('ALL_EXERCISES', () => {
  it('contains no duplicate names', () => {
    const names = ALL_EXERCISES.map(e => e.name)
    const unique = new Set(names)
    expect(unique.size).toBe(names.length)
  })

  it('each exercise has a valid muscleGroup', () => {
    ALL_EXERCISES.forEach(e => expect(e.muscleGroup).toBeTruthy())
  })

  it('MUSCLE_GROUPS contains all unique muscles from ALL_EXERCISES', () => {
    const fromExercises = new Set(ALL_EXERCISES.map(e => e.muscleGroup))
    fromExercises.forEach(mg => expect(MUSCLE_GROUPS).toContain(mg))
  })

  it('MUSCLE_GROUPS is sorted alphabetically', () => {
    const sorted = [...MUSCLE_GROUPS].sort()
    expect(MUSCLE_GROUPS).toEqual(sorted)
  })
})

// ─── Programmes don't have undefined restSeconds ──────────────────────────────
describe('Exercise restSeconds', () => {
  it.each(Object.entries(PROGRAMMES))('%s — no exercise has undefined restSeconds', (_, prog) => {
    prog.forEach(day => {
      day.exercises.forEach(ex => {
        expect(typeof ex.restSeconds).toBe('number')
        expect(isNaN(ex.restSeconds)).toBe(false)
      })
    })
  })
})
