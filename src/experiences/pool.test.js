/**
 * Tests for the experience registry itself.
 *
 * The pool is plain data that four different consumers read — the rotation engine,
 * the App, the menu, and the store — and a malformed entry fails at runtime in a
 * place far from the mistake. These assertions keep the contract in the file's
 * header honest.
 */
import { describe, expect, it } from 'vitest'
import { experiencePool } from './index.js'
import { STICKERS } from './stickers.js'
import { advanceRotation, createInitialRotationState } from '../engine/rotationEngine.js'

describe('experiencePool', () => {
  it('has at least ten things to do', () => {
    // The whole point of the pool: enough that a week of opens never repeats.
    expect(experiencePool.length).toBeGreaterThanOrEqual(10)
  })

  it('gives every entry a unique id', () => {
    const ids = experiencePool.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every entry the fields its consumers need', () => {
    for (const entry of experiencePool) {
      expect(typeof entry.id, `${entry.id} id`).toBe('string')
      expect(typeof entry.component, `${entry.id} component`).toBe('function')
      expect(typeof entry.title, `${entry.id} title`).toBe('string')
      expect(entry.weight, `${entry.id} weight`).toBeGreaterThan(0)
      expect(Array.isArray(entry.tags), `${entry.id} tags`).toBe(true)
      // The menu renders these for every tile, so a missing one is a visible hole.
      expect(typeof entry.glyph, `${entry.id} glyph`).toBe('string')
      expect(typeof entry.blurb, `${entry.id} blurb`).toBe('string')
    }
  })

  it('gives every `saves` descriptor a usable shape', () => {
    for (const entry of experiencePool) {
      if (!entry.saves) continue
      expect(typeof entry.saves.key, `${entry.id} saves.key`).toBe('string')
      expect(typeof entry.saves.label, `${entry.id} saves.label`).toBe('string')
      // Either it counts synchronously from the store, or it's flagged async.
      if (!entry.saves.async) {
        expect(typeof entry.saves.count, `${entry.id} saves.count`).toBe('function')
      }
    }
  })

  it('counts saved items without throwing on a fresh, empty state', () => {
    // The menu calls these on first run, when every collection is empty.
    const emptyState = {
      gratitude: [],
      wishes: [],
      moods: [],
      capsules: [],
      stickers: [],
      hugs: 0,
      bubblesPopped: 0,
    }
    for (const entry of experiencePool) {
      if (!entry.saves?.count) continue
      expect(entry.saves.count(emptyState), `${entry.id}`).toBe(0)
    }
  })

  it('works with the rotation engine — a full cycle visits everything once', () => {
    // The engine is tested on its own; this checks the real pool satisfies it.
    let state = createInitialRotationState()
    const seen = []
    const commonCount = experiencePool.filter((entry) => entry.tags.includes('common')).length

    for (let i = 0; i < commonCount; i++) {
      const result = advanceRotation(state, experiencePool)
      state = result.state
      seen.push(result.experience.id)
    }

    expect(new Set(seen).size).toBe(seen.length)
  })
})

describe('stickers', () => {
  it('gives every sticker a unique id', () => {
    const ids = STICKERS.map((sticker) => sticker.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every sticker the fields the book renders', () => {
    for (const sticker of STICKERS) {
      expect(typeof sticker.id).toBe('string')
      expect(typeof sticker.glyph).toBe('string')
      expect(typeof sticker.name).toBe('string')
      expect(typeof sticker.note).toBe('string')
    }
  })
})
