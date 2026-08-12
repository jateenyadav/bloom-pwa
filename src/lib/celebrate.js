/**
 * Celebration helpers, so every burst in the app shares one look.
 *
 * canvas-confetti honours prefers-reduced-motion itself via
 * `disableForReducedMotion`, which we always pass — that's the single place this
 * behaviour is enforced, rather than each caller remembering to check.
 */
import confetti from 'canvas-confetti'

export const TOON_COLORS = ['#ff9aa8', '#ffc94d', '#7cc4e8', '#5fae68', '#a98cf0', '#ff7fbf', '#7fe0c4']

const base = { colors: TOON_COLORS, disableForReducedMotion: true }

/** A small pop — good for a single happy action. */
export function popConfetti(origin = { x: 0.5, y: 0.6 }) {
  confetti({ ...base, particleCount: 44, spread: 70, startVelocity: 30, gravity: 0.95, scalar: 0.9, origin })
}

/** A big two-sided cannon volley — for real milestones. */
export function bigCelebration() {
  confetti({ ...base, particleCount: 90, spread: 100, startVelocity: 45, origin: { x: 0.1, y: 0.75 }, angle: 60 })
  confetti({ ...base, particleCount: 90, spread: 100, startVelocity: 45, origin: { x: 0.9, y: 0.75 }, angle: 120 })
}

/** Confetti raining from the top edge. `duration` in ms. */
export function rainConfetti(duration = 1600) {
  const end = performance.now() + duration
  const frame = () => {
    confetti({
      ...base,
      particleCount: 4,
      spread: 60,
      startVelocity: 18,
      gravity: 0.7,
      scalar: 0.85,
      ticks: 200,
      origin: { x: Math.random(), y: -0.1 },
    })
    if (performance.now() < end) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

/** Hearts/stars burst using emoji-ish shapes — used by the compliment machine. */
export function sparkleBurst(origin = { x: 0.5, y: 0.5 }) {
  confetti({
    ...base,
    particleCount: 28,
    spread: 360,
    startVelocity: 18,
    gravity: 0.4,
    scalar: 1.1,
    ticks: 120,
    shapes: ['star'],
    colors: ['#ffc94d', '#ff9aa8', '#a98cf0'],
    origin,
  })
}
