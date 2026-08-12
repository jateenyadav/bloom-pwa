/**
 * Config loader.
 *
 * `personal.json` is gitignored and may not exist (fresh clone, CI build), so we
 * can't `import` it directly — that would be a hard build error. `import.meta.glob`
 * with `eager: true` resolves to an empty object when the file is absent, which
 * gives us a clean optional import.
 *
 * Precedence: personal.json > personal.example.json > nothing.
 */
import example from './personal.example.json'

const overrides = import.meta.glob('./personal.json', { eager: true, import: 'default' })
const personal = overrides['./personal.json'] ?? {}

/** True when a real personal.json was found — the UI uses this to nudge on first run. */
export const isPersonalized = Object.keys(personal).length > 0

/** Shallow merge is deliberate: arrays should be replaced wholesale, not concatenated. */
function merge(base, over) {
  const out = { ...base }
  for (const [key, value] of Object.entries(over)) {
    if (value === null || value === undefined) continue
    if (Array.isArray(value) && value.length === 0) continue
    out[key] = value
  }
  return out
}

const merged = merge(example, personal)

export const config = {
  personName: merged.personName,
  appTitle: merged.appTitle,
  greeting: merged.greeting,
  /** "MM-DD". Kept as a string so there's no timezone ambiguity. */
  birthdayDate: merged.birthdayDate,
  compliments: merged.compliments,
  gratitudePrompts: merged.gratitudePrompts,
  /** Short lines for the fortune cookie. See experiences/FortuneCookie.jsx. */
  fortunes: merged.fortunes,
  /**
   * Caption-only gradient cards for the memory wall. Real photos are added from
   * the device at runtime and stored in IndexedDB — never in the repo, which is
   * public. See lib/photoStore.js.
   */
  memories: merged.memories,
  /** Affectionate nicknames, rotated one per open. See engine/petNames.js. */
  petNames: merged.petNames,
}

export default config
