/**
 * Pet-name picker.
 *
 * Every open greets the person with a different affectionate nickname. "Different"
 * is the whole point, so this uses the same shuffle-bag discipline as the rotation
 * engine rather than a plain random pick: a bag of every name is drained one at a
 * time before refilling, which makes an immediate repeat impossible and guarantees
 * you hear all of them before any comes round again. Naive `random()` would repeat
 * roughly 1 open in N, which is exactly the thing that would break the illusion.
 *
 * Pure and injectable (state + random passed in, nothing read from the module
 * scope) so it's deterministic under test — same contract as rotationEngine.js.
 *
 * The default names below are deliberately generic-affectionate. Real ones belong
 * in the gitignored personal.json, per the project's no-personal-content rule.
 */

/** Fallback names, used when config supplies none. */
export const DEFAULT_PET_NAMES = [
  'babe',
  'cutie',
  'sunshine',
  'sweetpea',
  'honey',
  'buttercup',
  'sugar',
  'lovely',
  'darling',
  'peach',
]

export function createInitialPetNameState() {
  return { bag: [], last: null }
}

/** Fisher-Yates over a copy. Never mutates the input. */
export function shuffleNames(names, random = Math.random) {
  const out = [...names]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Drop names that are no longer in the pool.
 *
 * The bag is persisted, so editing personal.json between opens can leave stale
 * entries behind. Without this, a removed name could still be greeted once more.
 */
function pruneToPool(bag, pool) {
  return bag.filter((name) => pool.includes(name))
}

/**
 * Pick the next pet name.
 *
 * Returns `{ name, state }` and never mutates `state`. `state` should be persisted
 * and passed back on the next call.
 *
 * When the bag refills, a fresh shuffle whose first name equals the one just used
 * is rotated by one, so you can't get the same name twice across a bag boundary.
 */
export function nextPetName(state, pool = DEFAULT_PET_NAMES, { random = Math.random } = {}) {
  const names = Array.isArray(pool) ? pool.filter((n) => typeof n === 'string' && n.trim()) : []
  if (names.length === 0) return { name: null, state: createInitialPetNameState() }

  const previous = state?.last ?? null
  let bag = pruneToPool(Array.isArray(state?.bag) ? state.bag : [], names)

  if (bag.length === 0) {
    bag = shuffleNames(names, random)
    // Avoid a repeat straddling the refill. Only possible with >1 name.
    if (names.length > 1 && bag[0] === previous) bag = [...bag.slice(1), bag[0]]
  }

  const [name, ...rest] = bag
  return { name, state: { bag: rest, last: name } }
}

/**
 * Sentence-case a name for use at the start of a line ("babe" -> "Babe").
 * Left as a separate helper so the stored value stays lowercase and canonical.
 */
export function capitalize(name) {
  if (!name) return name
  return name.charAt(0).toUpperCase() + name.slice(1)
}
