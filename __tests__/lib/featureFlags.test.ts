import { describe, it, expect } from 'vitest'
import { isEnabled, useFlag, FLAGS } from '@/lib/feature-flags'
import type { FlagKey } from '@/lib/feature-flags'

describe('isEnabled', () => {
  it('returns true for core.calorie_tracking (always free)', () => {
    expect(isEnabled('core.calorie_tracking', 'free')).toBe(true)
  })

  it('returns true for pro.photo_recognition (currently free phase)', () => {
    // During free phase all flags default true
    expect(isEnabled('pro.photo_recognition', 'free')).toBe(true)
  })

  it('returns true for premium.ai_coach (currently free phase)', () => {
    expect(isEnabled('premium.ai_coach', 'premium')).toBe(true)
  })

  it('all flags return true during free phase (default: true)', () => {
    const allFlags = Object.keys(FLAGS) as FlagKey[]
    allFlags.forEach(flag => {
      expect(isEnabled(flag, 'free')).toBe(true)
    })
  })

  it('defaults tier to "free" when omitted', () => {
    expect(isEnabled('core.workout_logging')).toBe(true)
  })
})

describe('useFlag (sync hook during free phase)', () => {
  it('returns same result as isEnabled', () => {
    expect(useFlag('core.glucose_tracking', 'free')).toBe(isEnabled('core.glucose_tracking', 'free'))
    expect(useFlag('premium.meal_plans', 'premium')).toBe(isEnabled('premium.meal_plans', 'premium'))
  })
})

describe('FLAGS structure', () => {
  it('contains expected core flags', () => {
    expect(FLAGS['core.calorie_tracking']).toBeDefined()
    expect(FLAGS['core.workout_logging']).toBeDefined()
    expect(FLAGS['core.weight_tracker']).toBeDefined()
    expect(FLAGS['core.barcode_scan']).toBeDefined()
    expect(FLAGS['core.glucose_tracking']).toBeDefined()
  })

  it('contains kill-switch flags', () => {
    expect(FLAGS['ops.food_photo_api']).toBeDefined()
    expect(FLAGS['ops.ai_insights']).toBeDefined()
    expect(FLAGS['ops.glucose_nudge']).toBeDefined()
  })

  it('each flag has a default and tiers array', () => {
    Object.values(FLAGS).forEach(flag => {
      expect(typeof flag.default).toBe('boolean')
      expect(Array.isArray(flag.tiers)).toBe(true)
      expect(flag.tiers.length).toBeGreaterThan(0)
    })
  })
})
