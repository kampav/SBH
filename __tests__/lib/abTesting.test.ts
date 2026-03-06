import { describe, it, expect } from 'vitest'
import { getVariant, isInExperiment, EXPERIMENTS } from '@/lib/firebase/ab-testing'

// ── getVariant ────────────────────────────────────────────────────────────────

describe('getVariant', () => {
  it('returns a valid variant for a known experiment', () => {
    const variant = getVariant('dashboard_quick_add', 'user123')
    expect(['control', 'quick_add_button']).toContain(variant)
  })

  it('is deterministic — same uid always gets same variant', () => {
    const v1 = getVariant('dashboard_quick_add', 'uid_abc')
    const v2 = getVariant('dashboard_quick_add', 'uid_abc')
    expect(v1).toBe(v2)
  })

  it('different uids may get different variants', () => {
    const variants = new Set(
      Array.from({ length: 50 }, (_, i) => getVariant('dashboard_quick_add', `uid_${i}`))
    )
    // With 50 users and 50/50 split, expect both variants to appear
    expect(variants.size).toBeGreaterThan(1)
  })

  it('returns control for unknown experiment', () => {
    expect(getVariant('nonexistent_experiment', 'uid_abc')).toBe('control')
  })

  it('weight distribution is approximately correct over many users', () => {
    const results = Array.from({ length: 1000 }, (_, i) => getVariant('dashboard_quick_add', `user_${i}`))
    const controlCount = results.filter(r => r === 'control').length
    // Expect ~50% control (±10%)
    expect(controlCount).toBeGreaterThan(400)
    expect(controlCount).toBeLessThan(600)
  })

  it('three-variant experiment distributes weights correctly', () => {
    const results = Array.from({ length: 1000 }, (_, i) => getVariant('calories_display_style', `user_${i}`))
    const control    = results.filter(r => r === 'control').length
    const percentage = results.filter(r => r === 'percentage').length
    const traffic    = results.filter(r => r === 'traffic_light').length
    // weights: [0.5, 0.25, 0.25] → expect control ~500, others ~250 (±15%)
    expect(control).toBeGreaterThan(400)
    expect(percentage).toBeGreaterThan(150)
    expect(traffic).toBeGreaterThan(150)
    expect(control + percentage + traffic).toBe(1000)
  })
})

// ── isInExperiment ────────────────────────────────────────────────────────────

describe('isInExperiment', () => {
  it('returns false for control variant', () => {
    // Find a uid that gets control
    let uid = 'uid_0'
    for (let i = 0; i < 1000; i++) {
      if (getVariant('dashboard_quick_add', `uid_${i}`) === 'control') {
        uid = `uid_${i}`
        break
      }
    }
    expect(isInExperiment('dashboard_quick_add', uid)).toBe(false)
  })

  it('returns true for non-control variant', () => {
    // Find a uid that gets a non-control variant
    let uid = 'uid_0'
    for (let i = 0; i < 1000; i++) {
      if (getVariant('dashboard_quick_add', `uid_${i}`) !== 'control') {
        uid = `uid_${i}`
        break
      }
    }
    expect(isInExperiment('dashboard_quick_add', uid)).toBe(true)
  })
})

// ── EXPERIMENTS registry ──────────────────────────────────────────────────────

describe('EXPERIMENTS registry', () => {
  it('all experiments have variants and weights arrays', () => {
    for (const [name, config] of Object.entries(EXPERIMENTS)) {
      expect(Array.isArray(config.variants), `${name} variants`).toBe(true)
      expect(Array.isArray(config.weights),  `${name} weights`).toBe(true)
    }
  })

  it('all experiment weights sum to 1 (within floating-point tolerance)', () => {
    for (const [name, config] of Object.entries(EXPERIMENTS)) {
      const sum = config.weights.reduce((a, b) => a + b, 0)
      expect(Math.abs(sum - 1), `${name} weights sum`).toBeLessThan(0.001)
    }
  })

  it('variants and weights arrays are same length', () => {
    for (const [name, config] of Object.entries(EXPERIMENTS)) {
      expect(config.variants.length, `${name} lengths match`).toBe(config.weights.length)
    }
  })

  it('every experiment includes a control variant', () => {
    for (const [name, config] of Object.entries(EXPERIMENTS)) {
      expect(config.variants, `${name} has control`).toContain('control')
    }
  })
})
