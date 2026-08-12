import { describe, it, expect } from 'vitest'
import { phaseAt, BREATH_PHASES, CYCLE_SECONDS } from './breathing.js'

describe('breathing schedule', () => {
  it('is a 19 second 4-7-8 cycle', () => {
    expect(BREATH_PHASES.map((p) => p.seconds)).toEqual([4, 7, 8])
    expect(CYCLE_SECONDS).toBe(19)
  })

  it('puts each second in the right phase', () => {
    const labelAt = (t) => phaseAt(t).phase.label
    // inhale: [0, 4)
    expect(labelAt(0)).toBe('Breathe in')
    expect(labelAt(3.99)).toBe('Breathe in')
    // hold: [4, 11)
    expect(labelAt(4)).toBe('Hold')
    expect(labelAt(10.99)).toBe('Hold')
    // exhale: [11, 19)
    expect(labelAt(11)).toBe('Breathe out')
    expect(labelAt(18.99)).toBe('Breathe out')
  })

  it('counts each phase down from its full length to 1, never 0', () => {
    expect(phaseAt(0).remaining).toBe(4)
    expect(phaseAt(3.5).remaining).toBe(1)
    expect(phaseAt(4).remaining).toBe(7)
    expect(phaseAt(10.5).remaining).toBe(1)
    expect(phaseAt(11).remaining).toBe(8)
    expect(phaseAt(18.9).remaining).toBe(1)
  })

  it('never reports a count of 0 or below anywhere in the cycle', () => {
    for (let t = 0; t < CYCLE_SECONDS * 3; t += 0.05) {
      const { remaining, phase } = phaseAt(t)
      expect(remaining).toBeGreaterThanOrEqual(1)
      expect(remaining).toBeLessThanOrEqual(phase.seconds)
    }
  })

  it('loops cleanly and reports the round number', () => {
    expect(phaseAt(19).phase.label).toBe('Breathe in')
    expect(phaseAt(19).remaining).toBe(4)
    expect(phaseAt(0).cycle).toBe(0)
    expect(phaseAt(18.9).cycle).toBe(0)
    expect(phaseAt(19).cycle).toBe(1)
    expect(phaseAt(41).cycle).toBe(2)
  })

  it('holds total phase time exactly across a cycle (no drift)', () => {
    // Sample finely and confirm each phase occupies its stated share of the cycle.
    const step = 0.001
    const tally = { 'Breathe in': 0, Hold: 0, 'Breathe out': 0 }
    for (let t = 0; t < CYCLE_SECONDS; t += step) tally[phaseAt(t).phase.label] += step
    expect(tally['Breathe in']).toBeCloseTo(4, 1)
    expect(tally.Hold).toBeCloseTo(7, 1)
    expect(tally['Breathe out']).toBeCloseTo(8, 1)
  })

  it('shrinks the circle only on the exhale', () => {
    expect(phaseAt(1).phase.scale).toBe(1)
    expect(phaseAt(5).phase.scale).toBe(1)
    expect(phaseAt(12).phase.scale).toBeLessThan(1)
  })

  it('treats junk input as t=0 rather than throwing', () => {
    for (const bad of [undefined, null, NaN, -5, Infinity]) {
      expect(phaseAt(bad).phase.label).toBe('Breathe in')
    }
  })
})
