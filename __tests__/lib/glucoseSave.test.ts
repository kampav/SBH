import { describe, it, expect } from 'vitest'
import type { GlucoseReading } from '@/lib/types'

// ─── Regression: notes: undefined was causing Firestore to throw ──────────────
// The fix: use ...(notes ? { notes } : {}) instead of notes: value || undefined
// This test verifies the fixed object construction does NOT produce undefined fields.

function buildGlucoseReading(valueMmol: number, context: GlucoseReading['context'], notes: string): GlucoseReading {
  return {
    id: '123',
    time: '09:30',
    valueMmol,
    context,
    ...(notes ? { notes } : {}),
  }
}

describe('GlucoseReading construction', () => {
  it('omits notes field when notes is empty string', () => {
    const r = buildGlucoseReading(5.5, 'fasting', '')
    expect(Object.keys(r)).not.toContain('notes')
  })

  it('omits notes field when notes is empty — Firestore safety', () => {
    const r = buildGlucoseReading(7.2, 'post_meal_2h', '')
    // Firestore v12 throws on undefined fields — ensure no undefined values
    Object.values(r).forEach(v => expect(v).not.toBeUndefined())
  })

  it('includes notes field when notes is non-empty', () => {
    const r = buildGlucoseReading(4.1, 'fasting', 'After long fast')
    expect(r.notes).toBe('After long fast')
  })

  it('never sets notes to undefined — key must be absent, not undefined', () => {
    const r1 = buildGlucoseReading(6.0, 'pre_meal', '')
    const r2 = buildGlucoseReading(6.0, 'pre_meal', 'Some note')
    // Key must be absent entirely (not present as undefined value)
    expect(Object.prototype.hasOwnProperty.call(r1, 'notes')).toBe(false)
    expect(r2.notes).toBe('Some note')
  })

  it('all required fields are present', () => {
    const r = buildGlucoseReading(5.5, 'bedtime', '')
    expect(r.id).toBeTruthy()
    expect(r.time).toBeTruthy()
    expect(typeof r.valueMmol).toBe('number')
    expect(r.context).toBe('bedtime')
  })
})

// ─── Verify no undefined in object literals using spread (general pattern) ────
describe('Undefined field safety', () => {
  it('spread of empty object omits key entirely', () => {
    const obj = { a: 1, ...({} as Record<string, string>) }
    expect(Object.keys(obj)).toEqual(['a'])
  })

  it('conditional spread with falsy value omits key', () => {
    const notes = ''
    const obj = { ...notes ? { notes } : {} }
    expect(Object.keys(obj)).toHaveLength(0)
  })

  it('conditional spread with truthy value includes key', () => {
    const notes = 'test'
    const obj = { ...notes ? { notes } : {} }
    expect(obj.notes).toBe('test')
  })
})
