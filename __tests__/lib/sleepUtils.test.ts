import { describe, it, expect } from 'vitest'
import {
  calcSleepDuration, calcSleepScore, sleepQualityLabel, sleepScoreLabel,
  avgSleepH, sleepDebtH, sleepWeekData, SLEEP_TARGET_H,
} from '@/lib/health/sleepUtils'
import type { SleepEntry } from '@/lib/types'

// ── helpers ───────────────────────────────────────────────────────────────────

function makeEntry(date: string, durationH: number, quality: 1|2|3|4|5): SleepEntry {
  return {
    id: `sleep_${date}`, date, bedtime: '22:30', wakeTime: '06:30',
    durationH, quality, loggedAt: new Date() as unknown as import('@/lib/types').FirestoreTimestamp,
  }
}

// ── calcSleepDuration ─────────────────────────────────────────────────────────

describe('calcSleepDuration', () => {
  it('handles same-night sleep (23:00 → 07:00 = 8h)', () => {
    expect(calcSleepDuration('23:00', '07:00')).toBe(8)
  })
  it('handles midnight crossing (22:30 → 06:30 = 8h)', () => {
    expect(calcSleepDuration('22:30', '06:30')).toBe(8)
  })
  it('handles very late bedtime (01:00 → 09:00 = 8h)', () => {
    expect(calcSleepDuration('01:00', '09:00')).toBe(8)
  })
  it('handles short nap (14:00 → 14:30 = 0.5h)', () => {
    expect(calcSleepDuration('14:00', '14:30')).toBe(0.5)
  })
  it('handles next-day crossover near midnight (23:45 → 00:15 = 0.5h)', () => {
    expect(calcSleepDuration('23:45', '00:15')).toBe(0.5)
  })
})

// ── calcSleepScore ────────────────────────────────────────────────────────────

describe('calcSleepScore', () => {
  it('returns 100 for 8h quality=5', () => {
    expect(calcSleepScore(8, 5)).toBe(100)
  })
  it('returns 60 for 8h quality=1 (perfect duration, poor quality)', () => {
    expect(calcSleepScore(8, 1)).toBe(60)
  })
  it('returns 0 for 0h quality=1', () => {
    expect(calcSleepScore(0, 1)).toBe(0)
  })
  it('scores within 0-100 for all quality values at 6h (under target)', () => {
    for (let q = 1; q <= 5; q++) {
      const s = calcSleepScore(6, q as 1|2|3|4|5)
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThanOrEqual(100)
    }
  })
  it('penalises over-sleep slightly (10h gives less than 8h at same quality)', () => {
    expect(calcSleepScore(10, 5)).toBeLessThan(calcSleepScore(8, 5))
  })
})

// ── sleepQualityLabel ─────────────────────────────────────────────────────────

describe('sleepQualityLabel', () => {
  it('returns Terrible for quality=1', () => {
    expect(sleepQualityLabel(1).label).toBe('Terrible')
  })
  it('returns Excellent for quality=5', () => {
    expect(sleepQualityLabel(5).label).toBe('Excellent')
  })
  it('returns a color string for each quality', () => {
    for (let q = 1; q <= 5; q++) {
      expect(sleepQualityLabel(q as 1|2|3|4|5).color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

// ── sleepScoreLabel ───────────────────────────────────────────────────────────

describe('sleepScoreLabel', () => {
  it('Excellent for score >= 85', () => {
    expect(sleepScoreLabel(90).label).toBe('Excellent')
  })
  it('Good for score 70-84', () => {
    expect(sleepScoreLabel(75).label).toBe('Good')
  })
  it('Fair for score 50-69', () => {
    expect(sleepScoreLabel(55).label).toBe('Fair')
  })
  it('Poor for score < 50', () => {
    expect(sleepScoreLabel(30).label).toBe('Poor')
  })
})

// ── avgSleepH ─────────────────────────────────────────────────────────────────

describe('avgSleepH', () => {
  it('returns 0 for empty array', () => {
    expect(avgSleepH([])).toBe(0)
  })
  it('returns correct average', () => {
    const entries = [
      makeEntry('2026-03-01', 6, 3),
      makeEntry('2026-03-02', 8, 4),
      makeEntry('2026-03-03', 7, 4),
    ]
    expect(avgSleepH(entries)).toBe(7)
  })
  it('rounds to 1 decimal place', () => {
    const entries = [makeEntry('2026-03-01', 7.3, 4), makeEntry('2026-03-02', 6.8, 4)]
    // (7.3 + 6.8) / 2 = 7.05 → rounds to 7.1
    expect(avgSleepH(entries)).toBe(7.1)
  })
})

// ── sleepDebtH ────────────────────────────────────────────────────────────────

describe('sleepDebtH', () => {
  it('returns 0 with no entries', () => {
    expect(sleepDebtH([], 8)).toBe(0)
  })
  it('returns 0 when all nights meet target', () => {
    const entries = [makeEntry('2026-03-01', 8, 4), makeEntry('2026-03-02', 9, 5)]
    expect(sleepDebtH(entries, 8)).toBe(0)
  })
  it('calculates correct debt', () => {
    // 3 nights, each short by 2h → debt = 6h
    const entries = [
      makeEntry('2026-03-01', 6, 3),
      makeEntry('2026-03-02', 6, 3),
      makeEntry('2026-03-03', 6, 3),
    ]
    expect(sleepDebtH(entries, 8)).toBe(6)
  })
  it('uses SLEEP_TARGET_H as default target', () => {
    const entries = [makeEntry('2026-03-01', SLEEP_TARGET_H - 2, 3)]
    expect(sleepDebtH(entries)).toBe(2)
  })
})

// ── sleepWeekData ─────────────────────────────────────────────────────────────

describe('sleepWeekData', () => {
  it('returns 7 entries for 7-day window', () => {
    const result = sleepWeekData([], 7)
    expect(result).toHaveLength(7)
  })
  it('matches entries to correct dates', () => {
    const today = new Date().toISOString().slice(0, 10)
    const entry = makeEntry(today, 8, 5)
    const result = sleepWeekData([entry], 7)
    const todayRow = result.find(r => r.date === today)
    expect(todayRow?.entry).not.toBeNull()
    expect(todayRow?.entry?.durationH).toBe(8)
  })
  it('returns null entry for days with no data', () => {
    const result = sleepWeekData([], 7)
    expect(result.every(r => r.entry === null)).toBe(true)
  })
})
