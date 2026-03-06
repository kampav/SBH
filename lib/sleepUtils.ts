// lib/sleepUtils.ts
// Pure helper functions for sleep tracking.
// No Firebase / Next.js dependencies — fully unit-testable.

import type { SleepEntry, SleepQuality } from './types'

// ── Constants ─────────────────────────────────────────────────────────────────

export const SLEEP_TARGET_H = 8       // recommended nightly target
export const SLEEP_MIN_H    = 7       // lower bound of healthy range
export const SLEEP_MAX_H    = 9       // upper bound of healthy range

// ── Duration ──────────────────────────────────────────────────────────────────

/**
 * Calculate sleep duration in hours from bedtime → wakeTime strings (HH:MM).
 * Handles midnight crossing (e.g. 22:30 → 06:00 = 7.5 h).
 */
export function calcSleepDuration(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  const bedMins  = bh * 60 + bm
  const wakeMins = wh * 60 + wm
  const diff     = wakeMins >= bedMins ? wakeMins - bedMins : 1440 - bedMins + wakeMins
  return Math.round((diff / 60) * 10) / 10
}

// ── Sleep score ───────────────────────────────────────────────────────────────

/**
 * Compute a 0–100 sleep score.
 * Duration contributes 60 pts (optimal 7–9 h), quality contributes 40 pts.
 */
export function calcSleepScore(durationH: number, quality: SleepQuality): number {
  let durationScore: number
  if (durationH >= SLEEP_MIN_H && durationH <= SLEEP_MAX_H) {
    durationScore = 60
  } else if (durationH < SLEEP_MIN_H) {
    durationScore = Math.max(0, Math.round(60 * (durationH / SLEEP_MIN_H)))
  } else {
    // Over 9 h — slight penalty
    durationScore = Math.max(40, Math.round(60 - (durationH - SLEEP_MAX_H) * 5))
  }
  const qualityScore = Math.round(((quality - 1) / 4) * 40)
  return Math.min(100, durationScore + qualityScore)
}

// ── Labels ────────────────────────────────────────────────────────────────────

export function sleepQualityLabel(quality: SleepQuality): { label: string; color: string } {
  const MAP: Record<SleepQuality, { label: string; color: string }> = {
    1: { label: 'Terrible',  color: '#f43f5e' },
    2: { label: 'Poor',      color: '#f97316' },
    3: { label: 'Fair',      color: '#f59e0b' },
    4: { label: 'Good',      color: '#10b981' },
    5: { label: 'Excellent', color: '#06b6d4' },
  }
  return MAP[quality]
}

export function sleepScoreLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Excellent', color: '#06b6d4' }
  if (score >= 70) return { label: 'Good',      color: '#10b981' }
  if (score >= 50) return { label: 'Fair',       color: '#f59e0b' }
  return              { label: 'Poor',           color: '#f43f5e' }
}

// ── Aggregates ────────────────────────────────────────────────────────────────

export function avgSleepH(entries: SleepEntry[]): number {
  if (!entries.length) return 0
  const sum = entries.reduce((acc, e) => acc + e.durationH, 0)
  return Math.round((sum / entries.length) * 10) / 10
}

/**
 * Total sleep debt (hours) over the provided entries vs targetH per night.
 * Only counts nights where sleep was below target.
 */
export function sleepDebtH(entries: SleepEntry[], targetH = SLEEP_TARGET_H): number {
  return Math.max(
    0,
    Math.round(entries.reduce((acc, e) => acc + Math.max(0, targetH - e.durationH), 0) * 10) / 10,
  )
}

/**
 * Returns last `days` calendar dates (YYYY-MM-DD) ending today,
 * each paired with the matching sleep entry (if any).
 */
export function sleepWeekData(entries: SleepEntry[], days = 7): { date: string; entry: SleepEntry | null }[] {
  const result: { date: string; entry: SleepEntry | null }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date = d.toISOString().slice(0, 10)
    result.push({ date, entry: entries.find(e => e.date === date) ?? null })
  }
  return result
}
