import { describe, it, expect } from 'vitest'
import {
  createInitialRotationState,
  toDayKey,
  toMonthDay,
  isBirthdayOn,
  weightOf,
  weightedShuffle,
  eligiblePool,
  admitToCycle,
  buildCycleOrder,
  advanceRotation,
  birthdayExperiences,
} from './rotationEngine.js'

/** Deterministic stand-in for Math.random: cycles through the given values. */
function seededRandom(values) {
  let i = 0
  return () => values[i++ % values.length]
}

const pool = [
  { id: 'a', type: 'game', weight: 1, tags: ['common'] },
  { id: 'b', type: 'text', weight: 1, tags: ['common'] },
  { id: 'c', type: 'canvas', weight: 1, tags: ['common'] },
  { id: 'd', type: 'gallery', weight: 1, tags: ['common'] },
]

describe('date helpers', () => {
  it('formats local dates without UTC drift', () => {
    // 23:30 local on the 5th must stay the 5th, even where UTC has rolled over.
    expect(toDayKey(new Date(2026, 2, 5, 23, 30))).toBe('2026-03-05')
    expect(toMonthDay(new Date(2026, 11, 31, 23, 59))).toBe('12-31')
  })

  it('matches a birthday by month-day, ignoring the year', () => {
    expect(isBirthdayOn(new Date(2026, 7, 12), '08-12')).toBe(true)
    expect(isBirthdayOn(new Date(2031, 7, 12), '08-12')).toBe(true)
    expect(isBirthdayOn(new Date(2026, 7, 13), '08-12')).toBe(false)
  })

  it('accepts a full ISO date and ignores its year', () => {
    expect(isBirthdayOn(new Date(2026, 7, 12), '1998-08-12')).toBe(true)
  })

  it('is false for missing or malformed config', () => {
    expect(isBirthdayOn(new Date(2026, 7, 12), undefined)).toBe(false)
    expect(isBirthdayOn(new Date(2026, 7, 12), '')).toBe(false)
    expect(isBirthdayOn(new Date(2026, 7, 12), 'not a date')).toBe(false)
  })
})

describe('weightOf', () => {
  it('defaults to 1 and clamps nonsense to a tiny positive number', () => {
    expect(weightOf({ id: 'x' })).toBe(1)
    expect(weightOf({ id: 'x', weight: 2.5 })).toBe(2.5)
    expect(weightOf({ id: 'x', weight: 0 })).toBeGreaterThan(0)
    expect(weightOf({ id: 'x', weight: -3 })).toBeGreaterThan(0)
    expect(weightOf({ id: 'x', weight: NaN })).toBeGreaterThan(0)
  })
})

describe('weightedShuffle', () => {
  it('returns every item exactly once', () => {
    const out = weightedShuffle(pool, seededRandom([0.1, 0.9, 0.5, 0.3]))
    expect(out).toHaveLength(pool.length)
    expect(new Set(out.map((e) => e.id)).size).toBe(pool.length)
  })

  it('handles empty and single-item input', () => {
    expect(weightedShuffle([])).toEqual([])
    expect(weightedShuffle([pool[0]]).map((e) => e.id)).toEqual(['a'])
  })

  it('places heavier items earlier on average', () => {
    const weighted = [
      { id: 'heavy', weight: 10, tags: [] },
      { id: 'light1', weight: 1, tags: [] },
      { id: 'light2', weight: 1, tags: [] },
    ]
    let heavyFirst = 0
    for (let i = 0; i < 2000; i++) {
      if (weightedShuffle(weighted)[0].id === 'heavy') heavyFirst++
    }
    // True probability is 10/12 ≈ 0.83; assert a loose band to stay non-flaky.
    expect(heavyFirst / 2000).toBeGreaterThan(0.7)
  })
})

describe('pool filtering', () => {
  const mixed = [
    ...pool,
    { id: 'bday1', weight: 1, tags: ['birthday'] },
    { id: 'bday2', weight: 1, tags: ['birthday'] },
  ]

  it('excludes birthday-exclusive experiences from the normal pool', () => {
    expect(eligiblePool(mixed).map((e) => e.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('collects birthday experiences in authored order', () => {
    expect(birthdayExperiences(mixed).map((e) => e.id)).toEqual(['bday1', 'bday2'])
  })
})

describe('admitToCycle', () => {
  it('always admits common experiences', () => {
    expect(admitToCycle(pool, () => 0.99).map((e) => e.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('admits a special experience only when the roll beats its weight', () => {
    const withSpecial = [...pool, { id: 'rare', weight: 0.25, tags: ['special'] }]
    expect(admitToCycle(withSpecial, () => 0.9).map((e) => e.id)).not.toContain('rare')
    expect(admitToCycle(withSpecial, () => 0.1).map((e) => e.id)).toContain('rare')
  })

  it('makes special experiences genuinely rarer over many cycles', () => {
    const withSpecial = [...pool, { id: 'rare', weight: 0.25, tags: ['special'] }]
    let admitted = 0
    for (let i = 0; i < 4000; i++) {
      if (admitToCycle(withSpecial).some((e) => e.id === 'rare')) admitted++
    }
    const rate = admitted / 4000
    expect(rate).toBeGreaterThan(0.18)
    expect(rate).toBeLessThan(0.32)
  })

  it('never returns empty for a non-empty pool, even if every roll fails', () => {
    const allSpecial = [
      { id: 's1', weight: 0.1, tags: ['special'] },
      { id: 's2', weight: 0.5, tags: ['special'] },
    ]
    const admitted = admitToCycle(allSpecial, () => 0.99)
    expect(admitted).toHaveLength(1)
    expect(admitted[0].id).toBe('s2') // highest weight wins the fallback
  })

  it('returns empty for an empty pool', () => {
    expect(admitToCycle([])).toEqual([])
  })
})

describe('buildCycleOrder', () => {
  it('avoids reproducing the previous cycle order verbatim', () => {
    for (let i = 0; i < 200; i++) {
      const lastOrder = ['a', 'b', 'c', 'd']
      const order = buildCycleOrder(pool, { lastOrder })
      expect(order).not.toEqual(lastOrder)
    }
  })

  it('accepts the unavoidable repeat when the pool holds a single item', () => {
    expect(buildCycleOrder([pool[0]], { lastOrder: ['a'] })).toEqual(['a'])
  })
})

describe('advanceRotation', () => {
  it('never repeats an experience until the whole pool has been shown', () => {
    let state = createInitialRotationState()
    const shown = []
    for (let i = 0; i < pool.length; i++) {
      const result = advanceRotation(state, pool)
      state = result.state
      shown.push(result.experience.id)
    }
    expect(new Set(shown).size).toBe(pool.length)
  })

  it('holds that guarantee across many consecutive cycles', () => {
    let state = createInitialRotationState()
    for (let cycle = 0; cycle < 50; cycle++) {
      const shown = []
      for (let i = 0; i < pool.length; i++) {
        const result = advanceRotation(state, pool)
        state = result.state
        shown.push(result.experience.id)
      }
      expect(new Set(shown).size, `cycle ${cycle} repeated an experience`).toBe(pool.length)
    }
  })

  it('does not repeat the exact same order in back-to-back cycles', () => {
    let state = createInitialRotationState()
    const runCycle = () => {
      const shown = []
      for (let i = 0; i < pool.length; i++) {
        const result = advanceRotation(state, pool)
        state = result.state
        shown.push(result.experience.id)
      }
      return shown
    }
    let previous = runCycle()
    for (let cycle = 0; cycle < 60; cycle++) {
      const current = runCycle()
      expect(current).not.toEqual(previous)
      previous = current
    }
  })

  it('is pure — it does not mutate the state it is given', () => {
    const state = createInitialRotationState()
    const snapshot = JSON.parse(JSON.stringify(state))
    advanceRotation(state, pool)
    expect(state).toEqual(snapshot)
  })

  it('tracks seen ids and clears them when the cycle resets', () => {
    let state = createInitialRotationState()
    for (let i = 0; i < pool.length; i++) {
      state = advanceRotation(state, pool).state
    }
    expect(state.seenIds).toHaveLength(pool.length)
    expect(state.order).toHaveLength(0)

    const next = advanceRotation(state, pool)
    expect(next.state.seenIds).toHaveLength(1)
    expect(next.state.cycleCount).toBe(1)
    expect(next.state.lastOrder).toHaveLength(pool.length)
  })

  it('reports the current experience id', () => {
    const result = advanceRotation(createInitialRotationState(), pool)
    expect(result.state.currentId).toBe(result.experience.id)
  })

  it('recovers when persisted ids no longer exist in the pool', () => {
    const stale = {
      ...createInitialRotationState(),
      order: ['gone-1', 'gone-2'],
      seenIds: ['also-gone'],
    }
    const result = advanceRotation(stale, pool)
    expect(pool.map((e) => e.id)).toContain(result.experience.id)
    expect(result.state.seenIds).toEqual([result.experience.id])
  })

  it('ignores birthday-exclusive experiences in the normal rotation', () => {
    const mixed = [...pool, { id: 'bday', weight: 1, tags: ['birthday'] }]
    let state = createInitialRotationState()
    for (let i = 0; i < 40; i++) {
      const result = advanceRotation(state, mixed)
      state = result.state
      expect(result.experience.id).not.toBe('bday')
    }
  })

  it('returns a null experience for an empty pool instead of throwing', () => {
    const result = advanceRotation(createInitialRotationState(), [])
    expect(result.experience).toBeNull()
  })

  it('tolerates corrupted persisted state', () => {
    const result = advanceRotation({ order: 'nope', seenIds: null, cycleCount: 'x' }, pool)
    expect(result.experience).not.toBeNull()
    expect(Array.isArray(result.state.order)).toBe(true)
  })
})
