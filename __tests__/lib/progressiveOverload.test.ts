import { describe, it, expect } from 'vitest'
import { getSuggestion, formatSuggestion } from '@/lib/health/progressive-overload'
import type { SetLog } from '@/lib/types'

function makeSet(weightKg: number, reps: number, completed = true): SetLog {
  return { setNumber: 1, weightKg, reps, completed, restSeconds: 90 }
}

describe('getSuggestion', () => {
  it('returns start action for empty history', () => {
    const r = getSuggestion([], 'Bench Press', 8, 0)
    expect(r.action).toBe('start')
    expect(r.suggestedWeightKg).toBeNull()
  })

  it('increases weight by 2.5kg for upper body after all sets completed', () => {
    const sets = [makeSet(60, 8), makeSet(60, 8), makeSet(60, 8)]
    const r = getSuggestion(sets, 'Bench Press', 8, 1)
    expect(r.action).toBe('increase')
    expect(r.suggestedWeightKg).toBe(62.5)
  })

  it('increases weight by 5kg for lower body after all sets completed', () => {
    const sets = [makeSet(100, 5), makeSet(100, 5)]
    const r = getSuggestion(sets, 'Squat', 5, 1)
    expect(r.action).toBe('increase')
    expect(r.suggestedWeightKg).toBe(105)
  })

  it('maintains weight when last set underperforms by more than 2 reps', () => {
    const sets = [makeSet(80, 8), makeSet(80, 8), makeSet(80, 4)]
    const r = getSuggestion(sets, 'Bench Press', 8, 2)
    expect(r.action).toBe('maintain')
    expect(r.suggestedWeightKg).toBe(80)
  })

  it('triggers deload on every 12th workout', () => {
    const sets = [makeSet(100, 8), makeSet(100, 8)]
    const r = getSuggestion(sets, 'Bench Press', 8, 12)
    expect(r.action).toBe('deload')
    expect(r.suggestedWeightKg).toBeCloseTo(90, 0)
  })

  it('maintains weight when not all sets completed', () => {
    const sets = [makeSet(70, 8), makeSet(70, 8, false)]
    const r = getSuggestion(sets, 'Overhead Press', 8, 3)
    expect(r.action).toBe('maintain')
  })
})

describe('formatSuggestion', () => {
  it('formats increase suggestion', () => {
    const s = getSuggestion([makeSet(60, 8), makeSet(60, 8)], 'Bench Press', 8, 1)
    const str = formatSuggestion(s)
    expect(str).toContain('↑')
    expect(str).toContain('62.5kg')
  })

  it('formats start suggestion without weight', () => {
    const s = getSuggestion([], 'Deadlift', 5, 0)
    expect(formatSuggestion(s)).toMatch(/start light/i)
  })
})
