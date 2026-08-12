/**
 * Turning the pool's `saves` descriptors into human-readable counts.
 *
 * Pure functions in their own module for two reasons: the menu stays a render of
 * what it's handed, and this is unit-testable — which matters, because the first
 * version of the menu hand-listed the store keys in its summary paragraph and
 * silently omitted three of them. An experience that remembers something must show
 * up here automatically, or "Saved on this device" quietly lies.
 */

/** Pluralise using the descriptor's `one` form, falling back to the plural. */
function phrase(count, saves) {
  return `${count} ${count === 1 ? saves.one ?? saves.label : saves.label}`
}

/**
 * The "you have N of these" badge for a single tile, or null when it's empty.
 *
 * `photoCount` is passed in because photos live in IndexedDB rather than the store,
 * so they can't be counted synchronously from state like everything else.
 */
export function savedLabel(experience, state, photoCount = 0) {
  const saves = experience.saves
  if (!saves) return null
  const count = saves.async ? photoCount : saves.count?.(state)
  if (!count) return null
  return phrase(count, saves)
}

/**
 * Every non-empty collection across the whole pool, as `{ key, text }` entries.
 *
 * Derived from the pool rather than a hand-written list, so adding an experience
 * needs no edit here. Deduplicated by `saves.key`: Star Catcher and the Sticker Book
 * both point at `stickers`, and the summary should count those once.
 */
export function savedSummary(pool, state, photoCount = 0) {
  const seen = new Set()
  const parts = []

  for (const experience of pool) {
    const saves = experience.saves
    if (!saves || seen.has(saves.key)) continue
    seen.add(saves.key)

    const count = saves.async ? photoCount : saves.count?.(state)
    if (!count) continue
    parts.push({ key: saves.key, text: phrase(count, saves) })
  }

  return parts
}
