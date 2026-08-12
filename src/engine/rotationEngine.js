/**
 * Bloom's daily rotation engine.
 *
 * Pure functions only — no React, no localStorage, no Date.now(). Everything that
 * varies (the current date, the random source, the persisted state) is passed in,
 * which makes the whole engine deterministic and unit-testable. The React/storage
 * wiring lives in src/store/useBloomStore.js and src/hooks/useDailyExperience.js.
 *
 * ── The model ──────────────────────────────────────────────────────────────────
 * A *cycle* is one full pass through the pool. Opening the app consumes the next
 * id from the cycle's `order`; when the order is exhausted the cycle resets and a
 * fresh order is built. So an experience can never repeat until every experience
 * in that cycle has been shown, and two consecutive cycles never share the exact
 * same order.
 *
 * ── How `weight` works ─────────────────────────────────────────────────────────
 * Two distinct jobs, because "appears less often" can't be expressed by ordering
 * alone (if everything appears exactly once per cycle, ordering changes nothing):
 *
 *   1. Experiences tagged `special` are *admitted* into a cycle with probability
 *      equal to their weight. A weight of 0.25 means it joins roughly one cycle in
 *      four — genuinely rarer than the common set.
 *   2. Within a cycle, weight biases position: heavier experiences tend to come
 *      earlier (weighted sampling without replacement).
 *
 * Common experiences (no `special` tag) are always admitted; weight only nudges
 * their position.
 */

/** Experiences tagged with this are rare — admitted into a cycle by chance. */
export const SPECIAL_TAG = 'special'

/** Experiences tagged with this are birthday-only and never enter the normal pool. */
export const BIRTHDAY_TAG = 'birthday'

/** Shape of a never-opened-before user. Exported so the store and tests agree. */
export function createInitialRotationState() {
  return {
    /** Ids remaining in the current cycle, in the order they'll be shown. */
    order: [],
    /** Ids already consumed in the current cycle. */
    seenIds: [],
    /** The full order of the previous cycle, used to avoid repeating it verbatim. */
    lastOrder: [],
    /** How many cycles have completed — handy for debugging and future content gating. */
    cycleCount: 0,
    /** Id currently being shown, once committed. */
    currentId: null,
  }
}

/** Local-date "YYYY-MM-DD". Uses local getters, never toISOString (which is UTC). */
export function toDayKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Local "MM-DD" for the given date. */
export function toMonthDay(date) {
  return toDayKey(date).slice(5)
}

/**
 * True when `date` falls on the configured birthday.
 * `birthdayDate` is "MM-DD" or "YYYY-MM-DD" (the year is ignored either way, so
 * the birthday recurs annually). Returns false for missing/malformed input.
 */
export function isBirthdayOn(date, birthdayDate) {
  if (typeof birthdayDate !== 'string') return false
  const match = birthdayDate.trim().match(/(\d{2})-(\d{2})$/)
  if (!match) return false
  return toMonthDay(date) === `${match[1]}-${match[2]}`
}

/** Weight of an experience, clamped to something sane. Defaults to 1. */
export function weightOf(experience) {
  const raw = typeof experience?.weight === 'number' ? experience.weight : 1
  if (!Number.isFinite(raw) || raw <= 0) return 0.0001
  return raw
}

function hasTag(experience, tag) {
  return Array.isArray(experience?.tags) && experience.tags.includes(tag)
}

export function isSpecial(experience) {
  return hasTag(experience, SPECIAL_TAG)
}

export function isBirthdayExclusive(experience) {
  return hasTag(experience, BIRTHDAY_TAG)
}

/**
 * Weighted sampling without replacement.
 * Each draw picks an item with probability proportional to its remaining weight,
 * so heavier items land earlier on average. `random` must return [0, 1).
 */
export function weightedShuffle(experiences, random = Math.random) {
  const remaining = [...experiences]
  const result = []

  while (remaining.length > 0) {
    const total = remaining.reduce((sum, item) => sum + weightOf(item), 0)
    let threshold = random() * total
    let index = remaining.length - 1 // fallback guards against float drift

    for (let i = 0; i < remaining.length; i++) {
      threshold -= weightOf(remaining[i])
      if (threshold < 0) {
        index = i
        break
      }
    }

    result.push(remaining[index])
    remaining.splice(index, 1)
  }

  return result
}

/**
 * The experiences eligible for the normal (non-birthday) rotation:
 * everything that isn't birthday-exclusive.
 */
export function eligiblePool(pool) {
  return pool.filter((experience) => !isBirthdayExclusive(experience))
}

/**
 * Decide which experiences are admitted into one cycle.
 * Common ones always; `special` ones with probability = weight.
 * Guarantees a non-empty result whenever the pool is non-empty (if chance excludes
 * everything, the highest-weighted candidate is admitted anyway).
 */
export function admitToCycle(pool, random = Math.random) {
  const candidates = eligiblePool(pool)
  if (candidates.length === 0) return []

  const admitted = candidates.filter((experience) => {
    if (!isSpecial(experience)) return true
    return random() < Math.min(1, weightOf(experience))
  })

  if (admitted.length > 0) return admitted

  return [
    candidates.reduce((best, item) => (weightOf(item) > weightOf(best) ? item : best), candidates[0]),
  ]
}

const sameOrder = (a, b) => a.length === b.length && a.every((id, i) => id === b[i])

/**
 * Build the id order for a fresh cycle.
 * Reshuffles (bounded retries) if the result exactly matches the previous cycle,
 * so the user never sees the same sequence twice in a row. With a pool of 1 the
 * repeat is unavoidable and accepted.
 */
export function buildCycleOrder(pool, { random = Math.random, lastOrder = [] } = {}) {
  const admitted = admitToCycle(pool, random)
  if (admitted.length === 0) return []

  let order = weightedShuffle(admitted, random).map((experience) => experience.id)

  for (let attempt = 0; attempt < 8 && admitted.length > 1 && sameOrder(order, lastOrder); attempt++) {
    order = weightedShuffle(admitted, random).map((experience) => experience.id)
  }

  return order
}

/**
 * Drop ids that are no longer in the pool (e.g. the pool shrank between releases),
 * so a stale persisted cycle can't strand the user on a missing experience.
 */
function pruneToPool(ids, pool) {
  const live = new Set(eligiblePool(pool).map((experience) => experience.id))
  return ids.filter((id) => live.has(id))
}

/**
 * Advance the rotation by one open.
 *
 * Returns `{ experience, state }` — a *new* state object (never mutates the input)
 * and the experience to render. Call this once per app open; the returned state is
 * what should be persisted.
 *
 * @param {object} state    Persisted rotation state (see createInitialRotationState).
 * @param {Array}  pool     The full experience pool.
 * @param {object} [opts]
 * @param {Function} [opts.random] Source of randomness, for deterministic tests.
 */
export function advanceRotation(state, pool, { random = Math.random } = {}) {
  const base = { ...createInitialRotationState(), ...state }
  const candidates = eligiblePool(pool)

  if (candidates.length === 0) {
    return { experience: null, state: { ...base, currentId: null } }
  }

  let order = pruneToPool(Array.isArray(base.order) ? base.order : [], pool)
  let seenIds = pruneToPool(Array.isArray(base.seenIds) ? base.seenIds : [], pool)
  let lastOrder = Array.isArray(base.lastOrder) ? base.lastOrder : []
  let cycleCount = Number.isFinite(base.cycleCount) ? base.cycleCount : 0

  // Cycle exhausted (or first ever open) — start a new one.
  if (order.length === 0) {
    const completed = seenIds.length > 0
    lastOrder = completed ? seenIds : lastOrder
    cycleCount = completed ? cycleCount + 1 : cycleCount
    order = buildCycleOrder(pool, { random, lastOrder })
    seenIds = []
  }

  const nextId = order[0]
  const experience = candidates.find((item) => item.id === nextId) ?? candidates[0]

  return {
    experience,
    state: {
      order: order.slice(1),
      seenIds: [...seenIds, experience.id],
      lastOrder,
      cycleCount,
      currentId: experience.id,
    },
  }
}

/** The birthday-only experiences, ordered as authored (they're a scripted sequence). */
export function birthdayExperiences(pool) {
  return pool.filter(isBirthdayExclusive)
}
