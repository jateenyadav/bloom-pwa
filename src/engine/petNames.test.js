import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PET_NAMES,
  createInitialPetNameState,
  shuffleNames,
  nextPetName,
  capitalize,
} from './petNames.js'

/** Deterministic pseudo-random so shuffles are reproducible in tests. */
function seededRandom(seed = 1) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

/** Drive N consecutive picks, threading state through like the app does. */
function pickMany(count, pool, random = seededRandom()) {
  let state = createInitialPetNameState()
  const names = []
  for (let i = 0; i < count; i++) {
    const result = nextPetName(state, pool, { random })
    names.push(result.name)
    state = result.state
  }
  return names
}

describe('nextPetName', () => {
  it('returns a name from the pool', () => {
    const { name } = nextPetName(createInitialPetNameState(), DEFAULT_PET_NAMES)
    expect(DEFAULT_PET_NAMES).toContain(name)
  })

  it('never repeats a name until the whole pool has been used', () => {
    const pool = ['a', 'b', 'c', 'd', 'e']
    const names = pickMany(pool.length * 12, pool)

    // Split into consecutive windows of pool.length; each must be a permutation.
    for (let i = 0; i < names.length; i += pool.length) {
      const cycle = names.slice(i, i + pool.length)
      expect(new Set(cycle).size).toBe(pool.length)
      expect([...cycle].sort()).toEqual([...pool].sort())
    }
  })

  it('never yields the same name twice in a row, including across bag refills', () => {
    const pool = ['a', 'b', 'c']
    const names = pickMany(300, pool)
    for (let i = 1; i < names.length; i++) {
      expect(names[i]).not.toBe(names[i - 1])
    }
  })

  it('is stable with a single-name pool', () => {
    const names = pickMany(5, ['only'])
    expect(names).toEqual(['only', 'only', 'only', 'only', 'only'])
  })

  it('does not mutate the state it is given', () => {
    const state = { bag: ['a', 'b'], last: 'z' }
    const snapshot = JSON.parse(JSON.stringify(state))
    nextPetName(state, ['a', 'b'])
    expect(state).toEqual(snapshot)
  })

  it('does not mutate the pool it is given', () => {
    const pool = ['a', 'b', 'c']
    const snapshot = [...pool]
    let state = createInitialPetNameState()
    for (let i = 0; i < 10; i++) state = nextPetName(state, pool).state
    expect(pool).toEqual(snapshot)
  })

  it('drops stale names when the pool shrinks between calls', () => {
    // Simulates editing personal.json: the persisted bag still holds removed names.
    const stale = { bag: ['gone', 'alsogone', 'kept'], last: 'gone' }
    const { name } = nextPetName(stale, ['kept', 'fresh'])
    expect(['kept', 'fresh']).toContain(name)
  })

  it('picks up names newly added to the pool', () => {
    const pool = ['a', 'b', 'added']
    const names = pickMany(30, pool)
    expect(names).toContain('added')
  })

  it('returns null for an empty pool rather than throwing', () => {
    expect(nextPetName(createInitialPetNameState(), []).name).toBeNull()
    expect(nextPetName(createInitialPetNameState(), undefined).name).not.toBeNull()
  })

  it('ignores blank and non-string entries in the pool', () => {
    const names = pickMany(20, ['ok', '', '   ', null, 42, 'fine'])
    expect(new Set(names)).toEqual(new Set(['ok', 'fine']))
  })

  it('tolerates corrupted persisted state', () => {
    for (const junk of [null, undefined, {}, { bag: 'nope' }, { bag: null, last: 7 }]) {
      const { name } = nextPetName(junk, ['a', 'b'])
      expect(['a', 'b']).toContain(name)
    }
  })

  it('produces different orders from different seeds', () => {
    const pool = ['a', 'b', 'c', 'd', 'e', 'f']
    const first = pickMany(6, pool, seededRandom(1)).join()
    const second = pickMany(6, pool, seededRandom(999)).join()
    expect(first).not.toBe(second)
  })
})

describe('shuffleNames', () => {
  it('returns a permutation without mutating the input', () => {
    const pool = ['a', 'b', 'c', 'd']
    const snapshot = [...pool]
    const shuffled = shuffleNames(pool, seededRandom(7))
    expect([...shuffled].sort()).toEqual([...snapshot].sort())
    expect(pool).toEqual(snapshot)
  })
})

describe('capitalize', () => {
  it('sentence-cases a name', () => {
    expect(capitalize('babe')).toBe('Babe')
    expect(capitalize('kuchu puchu')).toBe('Kuchu puchu')
  })

  it('passes through empty values', () => {
    expect(capitalize('')).toBe('')
    expect(capitalize(null)).toBeNull()
  })
})
