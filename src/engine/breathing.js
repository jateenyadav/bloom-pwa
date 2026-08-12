/**
 * The 4-7-8 breathing schedule, as pure functions.
 *
 * Kept out of the component (and unit-tested) because an inaccurate breath timer
 * is worse than no timer at all. The component's only job is to feed it elapsed
 * wall-clock seconds and render the result.
 */

export const BREATH_PHASES = [
  { key: 'inhale', label: 'Breathe in', seconds: 4, scale: 1 },
  { key: 'hold', label: 'Hold', seconds: 7, scale: 1 },
  { key: 'exhale', label: 'Breathe out', seconds: 8, scale: 0.55 },
]

export const CYCLE_SECONDS = BREATH_PHASES.reduce((sum, phase) => sum + phase.seconds, 0)

/**
 * Where in the cycle are we at `elapsedSeconds`?
 *
 * Returns { index, phase, remaining, cycle }. `remaining` is the countdown label:
 * it starts at the phase's full length and never reaches 0, so the user never sees
 * a "0" or the next phase's number bleeding in.
 */
export function phaseAt(elapsedSeconds) {
  const elapsed = Number.isFinite(elapsedSeconds) && elapsedSeconds > 0 ? elapsedSeconds : 0
  const t = elapsed % CYCLE_SECONDS

  let start = 0
  for (let i = 0; i < BREATH_PHASES.length; i++) {
    const phase = BREATH_PHASES[i]
    if (t < start + phase.seconds) {
      return {
        index: i,
        phase,
        remaining: Math.max(1, Math.ceil(phase.seconds - (t - start))),
        cycle: Math.floor(elapsed / CYCLE_SECONDS),
      }
    }
    start += phase.seconds
  }

  // Unreachable while CYCLE_SECONDS is the sum of the phases; kept as a guard.
  const last = BREATH_PHASES[BREATH_PHASES.length - 1]
  return { index: BREATH_PHASES.length - 1, phase: last, remaining: 1, cycle: 0 }
}
