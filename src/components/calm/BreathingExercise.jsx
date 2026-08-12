/**
 * 4-7-8 breathing.
 *
 * Timing accuracy matters here — a drifting breath timer is worse than none. Two
 * choices protect it:
 *   1. The schedule lives in a pure, unit-tested module (engine/breathing.js).
 *   2. Position in the cycle is derived from wall-clock deltas via
 *      requestAnimationFrame, not chained setTimeouts (which accumulate drift and
 *      stall when the tab is backgrounded).
 * The animated blob is driven by the same phase object as the count, so the visual
 * and the number can't fall out of sync — including the cartoon face, which is a
 * pure function of the phase rather than its own timer.
 */
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { phaseAt } from '../../engine/breathing.js'

/** Petals around the blob — bloom open on inhale, fold in on exhale. */
const PETALS = [0, 45, 90, 135, 180, 225, 270, 315]

export default function BreathingExercise() {
  const reduceMotion = useReducedMotion()
  const [running, setRunning] = useState(true)
  const [state, setState] = useState(() => phaseAt(0))

  // Accumulated running time, so pausing doesn't lose or skip a beat.
  const elapsedRef = useRef(0)
  const startedAtRef = useRef(null)

  useEffect(() => {
    if (!running) return
    let frame
    startedAtRef.current = performance.now()

    const tick = (nowMs) => {
      const elapsed = elapsedRef.current + (nowMs - startedAtRef.current) / 1000
      setState(phaseAt(elapsed))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      // Bank the time we ran for, so resuming continues from the same point.
      if (startedAtRef.current !== null) {
        elapsedRef.current += (performance.now() - startedAtRef.current) / 1000
        startedAtRef.current = null
      }
    }
  }, [running])

  const { phase, remaining, cycle } = state

  const reset = () => {
    elapsedRef.current = 0
    startedAtRef.current = performance.now()
    setState(phaseAt(0))
    setRunning(true)
  }

  // The face is derived from the phase, so it can never drift from the count.
  const holding = phase.key === 'hold'
  const exhaling = phase.key === 'exhale'
  const duration = running && !reduceMotion ? phase.seconds : 0

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
        {/* Soft halo — decorative, so it stays out of the a11y tree. */}
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full bg-sky/30 blur-2xl"
          animate={reduceMotion ? { opacity: 0.5 } : { scale: phase.scale, opacity: 0.6 }}
          transition={{ duration, ease: 'easeInOut' }}
        />

        {/* Petals */}
        <motion.svg
          aria-hidden
          viewBox="0 0 200 200"
          className="absolute h-64 w-64 sm:h-72 sm:w-72"
          animate={reduceMotion ? { scale: 1, rotate: 0 } : { scale: phase.scale, rotate: exhaling ? -8 : 8 }}
          transition={{ duration, ease: 'easeInOut' }}
        >
          {PETALS.map((angle, i) => (
            <ellipse
              key={angle}
              cx="100"
              cy="38"
              rx="17"
              ry="30"
              fill={i % 2 === 0 ? '#ffb3c1' : '#ffc94d'}
              stroke="#3a3129"
              strokeWidth="3"
              transform={`rotate(${angle} 100 100)`}
              opacity="0.95"
            />
          ))}
        </motion.svg>

        {/* The breathing blob, with a face */}
        <motion.svg
          aria-hidden
          viewBox="0 0 120 120"
          className="relative h-40 w-40 sm:h-48 sm:w-48"
          animate={reduceMotion ? { scale: 1 } : { scale: phase.scale }}
          transition={{ duration, ease: 'easeInOut' }}
        >
          <defs>
            <radialGradient id="blobFill" cx="35%" cy="30%">
              <stop offset="0%" stopColor="#bff0e2" />
              <stop offset="100%" stopColor="#7cc4e8" />
            </radialGradient>
          </defs>

          <circle cx="60" cy="60" r="52" fill="url(#blobFill)" stroke="#3a3129" strokeWidth="4" />
          {/* Shine */}
          <ellipse cx="42" cy="38" rx="13" ry="9" fill="#fff" opacity="0.55" transform="rotate(-25 42 38)" />

          {/* Cheeks */}
          <ellipse cx="38" cy="66" rx="7" ry="4.5" fill="#ff9aa8" opacity="0.8" />
          <ellipse cx="82" cy="66" rx="7" ry="4.5" fill="#ff9aa8" opacity="0.8" />

          {/* Eyes: open normally, squeezed shut while holding. */}
          {holding ? (
            <>
              <path d="M39 54 q6 6 12 0" stroke="#3a3129" strokeWidth="3.6" fill="none" strokeLinecap="round" />
              <path d="M69 54 q6 6 12 0" stroke="#3a3129" strokeWidth="3.6" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="45" cy="54" r="5" fill="#3a3129" />
              <circle cx="75" cy="54" r="5" fill="#3a3129" />
              <circle cx="46.8" cy="52" r="1.8" fill="#fff" />
              <circle cx="76.8" cy="52" r="1.8" fill="#fff" />
            </>
          )}

          {/* Mouth: small "o" while breathing out, soft smile otherwise. */}
          {exhaling ? (
            <ellipse cx="60" cy="78" rx="6" ry="8" fill="#3a3129" />
          ) : (
            <path d="M50 76 q10 9 20 0" stroke="#3a3129" strokeWidth="3.6" fill="none" strokeLinecap="round" />
          )}
        </motion.svg>

        {/* Little puffs leaving the blob's mouth on the exhale. */}
        {!reduceMotion && exhaling && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute left-1/2 top-[62%] h-3 w-3 rounded-full border-2 border-ink bg-white"
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: [0, 0.9, 0], x: 34 + i * 26, y: 12 + i * 10, scale: [0.5, 1.2, 1.5] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }}
              />
            ))}
          </div>
        )}

        {/* Live region: announces the phase, not every passing second. */}
        <div className="absolute -bottom-2 flex flex-col items-center text-center">
          <span
            className="rounded-full border-[3px] border-ink bg-white px-4 py-1 font-display text-lg font-extrabold text-ink"
            style={{ boxShadow: '3px 4px 0 0 var(--color-ink)' }}
            aria-live="polite"
            aria-atomic="true"
          >
            {phase.label}
          </span>
        </div>

        {/* The count, big and comic-outlined, tucked in the top corner. */}
        <motion.span
          key={`${phase.key}-${remaining}`}
          className="absolute right-1 top-1 font-display text-5xl font-extrabold tabular-nums text-honey text-toon"
          initial={reduceMotion ? false : { scale: 1.35, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          aria-hidden
        >
          {remaining}
        </motion.span>
      </div>

      <p className="max-w-xs text-center text-sm font-semibold leading-relaxed text-ink-soft">
        In for four, hold for seven, out for eight. If the counts feel like too much,
        just watch the little one breathe and follow along.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setRunning((value) => !value)}
          className="btn-toon rounded-full bg-white px-6 py-2.5 font-display text-base font-extrabold text-ink"
        >
          {running ? 'Pause' : 'Resume'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="btn-toon rounded-full bg-honey px-5 py-2.5 font-display text-base font-extrabold text-ink"
        >
          Start over
        </button>
      </div>

      <p className="text-xs font-semibold text-ink-soft/80" aria-hidden>
        {cycle > 0
          ? `${cycle} round${cycle === 1 ? '' : 's'} done 🌿`
          : 'No rush. Stay as long as you like.'}
      </p>
    </div>
  )
}
