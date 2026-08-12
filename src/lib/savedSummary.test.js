/**
 * Tests for the menu's "Saved on this device" summary.
 *
 * These exist because of a real bug: the first version of the panel hand-listed the
 * store keys and left out hugs, bubbles, and stickers — so someone who had only
 * popped bubbles was told "Nothing saved yet" while the store held 7. The fix was to
 * derive the summary from the pool, and the test that matters most is the one
 * asserting every `saves` descriptor in the pool can actually surface.
 */
import { describe, expect, it } from 'vitest'
import { savedLabel, savedSummary } from './savedSummary.js'
import { experiencePool } from '../experiences/index.js'

/** A state where every collection holds exactly one thing. */
const oneOfEach = {
  gratitude: ['a'],
  wishes: ['a'],
  moods: [{ date: '2026-01-01', mood: 'sunny' }],
  capsules: [{ id: 'c1' }],
  stickers: ['s1'],
  hugs: 1,
  bubblesPopped: 1,
}

const empty = {
  gratitude: [],
  wishes: [],
  moods: [],
  capsules: [],
  stickers: [],
  hugs: 0,
  bubblesPopped: 0,
}

describe('savedLabel', () => {
  it('returns null for an experience that saves nothing', () => {
    expect(savedLabel({ id: 'x' }, empty)).toBe(null)
  })

  it('returns null while the collection is empty, so no tile shows "0 wishes"', () => {
    const entry = { saves: { key: 'wishes', label: 'wishes', count: (s) => s.wishes.length } }
    expect(savedLabel(entry, empty)).toBe(null)
  })

  it('uses the singular form for exactly one', () => {
    const entry = {
      saves: { key: 'wishes', label: 'wishes', one: 'wish', count: (s) => s.wishes.length },
    }
    expect(savedLabel(entry, { wishes: ['a'] })).toBe('1 wish')
    expect(savedLabel(entry, { wishes: ['a', 'b'] })).toBe('2 wishes')
  })

  it('falls back to the plural label when no singular is given', () => {
    const entry = { saves: { key: 'k', label: 'of 12 found', count: () => 1 } }
    expect(savedLabel(entry, empty)).toBe('1 of 12 found')
  })

  it('reads async collections from the passed-in count, not the store', () => {
    const entry = { saves: { key: 'photos', label: 'photos', one: 'photo', async: true } }
    expect(savedLabel(entry, empty, 0)).toBe(null)
    expect(savedLabel(entry, empty, 1)).toBe('1 photo')
    expect(savedLabel(entry, empty, 4)).toBe('4 photos')
  })
})

describe('savedSummary', () => {
  it('says nothing at all when nothing is saved', () => {
    expect(savedSummary(experiencePool, empty, 0)).toEqual([])
  })

  it('surfaces EVERY saves key in the pool — the bug this module exists for', () => {
    const summary = savedSummary(experiencePool, oneOfEach, 1)
    const reported = new Set(summary.map((part) => part.key))
    const expected = new Set(
      experiencePool.filter((entry) => entry.saves).map((entry) => entry.saves.key)
    )
    expect(reported).toEqual(expected)
  })

  it('counts a shared key once (star catcher and the sticker book share stickers)', () => {
    const shared = experiencePool.filter((e) => e.saves?.key === 'stickers')
    expect(shared.length).toBeGreaterThan(1) // guards the premise of this test

    const keys = savedSummary(experiencePool, oneOfEach, 1).map((part) => part.key)
    expect(keys.filter((key) => key === 'stickers')).toHaveLength(1)
  })

  it('omits only the empty collections', () => {
    const state = { ...empty, bubblesPopped: 7 }
    const summary = savedSummary(experiencePool, state, 0)
    expect(summary).toEqual([{ key: 'bubblesPopped', text: '7 bubbles popped' }])
  })

  it('pluralises each part independently', () => {
    const state = { ...empty, hugs: 1, wishes: ['a', 'b'] }
    const texts = savedSummary(experiencePool, state, 0).map((part) => part.text)
    expect(texts).toContain('1 hug')
    expect(texts).toContain('2 wishes')
  })

  it('reports photos from the async count', () => {
    const summary = savedSummary(experiencePool, empty, 3)
    expect(summary).toEqual([{ key: 'photos', text: '3 photos' }])
  })
})
