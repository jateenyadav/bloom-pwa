/**
 * Fortune Cookie.
 *
 * Tap a cookie, it cracks in half, a paper slip slides out with a small warm
 * fortune. One crack per visit, so it stays a little event rather than a slot
 * machine you can grind.
 *
 * Fortunes are static and human-written (config.fortunes), per the project's
 * no-AI-at-runtime rule, and picked with a shuffle bag so you don't get the same
 * one twice in a row.
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { shuffleNames } from '../engine/petNames.js'
import { popConfetti } from '../lib/celebrate.js'
import { config } from '../config/index.js'

export default function FortuneCookie() {
  const reduceMotion = useReducedMotion()
  const fortunes = config.fortunes ?? []

  // A shuffled queue for this visit — reusing the rotation engine's shuffle so a
  // re-crack can't hand back the fortune that's already on screen.
  const queue = useMemo(() => shuffleNames(fortunes), [fortunes])
  const [index, setIndex] = useState(-1)
  const cracked = index >= 0

  const crack = () => {
    setIndex((current) => (current + 1) % Math.max(1, queue.length))
    if (!reduceMotion) popConfetti({ particleCount: 30, spread: 60 })
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft/80">
          Something small and true
        </p>
        <motion.h2
          className="mt-1 font-display text-3xl font-extrabold text-ink"
          animate={reduceMotion ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          Fortune cookie
        </motion.h2>
      </header>

      {/*
       * A plain <button> with a stationary hit box — the idle float is applied to
       * the SVG inside, not to the button, so the tap target never moves.
       */}
      <button
        type="button"
        onClick={crack}
        aria-label={cracked ? 'Crack another fortune cookie' : 'Crack the fortune cookie open'}
        className="relative flex h-44 w-full max-w-xs items-center justify-center"
      >
        <motion.div
          className="relative h-40 w-56"
          animate={reduceMotion || cracked ? undefined : { y: [0, -8, 0], rotate: [-3, 3, -3] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Left half — swings away when cracked. */}
          <motion.svg
            viewBox="0 0 60 60"
            className="absolute left-2 top-4 h-28 w-28"
            animate={
              cracked
                ? reduceMotion
                  ? { x: -14 }
                  : { x: -26, rotate: -26, y: 6 }
                : { x: 0, rotate: 0, y: 0 }
            }
            transition={{ type: 'spring', stiffness: 220, damping: 15 }}
            aria-hidden
          >
            <path
              d="M52 8 Q30 2 12 18 Q2 27 10 38 Q18 49 34 46 Q26 34 34 22 Q42 11 52 8 Z"
              fill="#f0b96a"
              stroke="#3a3129"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path d="M30 14 Q22 26 28 40" stroke="#d19a4e" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </motion.svg>

          {/* Right half */}
          <motion.svg
            viewBox="0 0 60 60"
            className="absolute right-2 top-4 h-28 w-28"
            animate={
              cracked
                ? reduceMotion
                  ? { x: 14 }
                  : { x: 26, rotate: 26, y: 6 }
                : { x: 0, rotate: 0, y: 0 }
            }
            transition={{ type: 'spring', stiffness: 220, damping: 15 }}
            aria-hidden
          >
            <path
              d="M8 8 Q30 2 48 18 Q58 27 50 38 Q42 49 26 46 Q34 34 26 22 Q18 11 8 8 Z"
              fill="#e8ab58"
              stroke="#3a3129"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path d="M30 14 Q38 26 32 40" stroke="#c98f45" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </motion.svg>

          {/* The paper slip, revealed between the halves. */}
          <AnimatePresence>
            {cracked && (
              <motion.div
                className="absolute left-1/2 top-8 z-10 w-40 -translate-x-1/2 rounded-md border-[2.5px] border-ink bg-white px-2 py-1 text-center"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scaleY: 0.3 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.12 }}
                style={{ transformOrigin: 'bottom center' }}
                aria-hidden
              >
                <span className="font-display text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ink-soft/70">
                  your fortune
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {!cracked && (
          <motion.span
            className="absolute bottom-0 font-display text-sm font-extrabold text-ink-soft"
            animate={reduceMotion ? undefined : { opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            tap to crack it open
          </motion.span>
        )}
      </button>

      <div className="min-h-[6.5rem] w-full">
        <AnimatePresence mode="wait">
          {cracked && (
            <motion.div
              key={index}
              className="card-soft rounded-[1.75rem] bg-white px-6 py-6 text-center"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 240, damping: 20 }}
            >
              <p className="font-display text-lg font-bold leading-relaxed text-ink">
                {queue[index] ?? 'Add some fortunes to your personal config.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {cracked && (
        <button
          type="button"
          onClick={crack}
          className="btn-toon rounded-full bg-honey px-7 py-2.5 font-display text-sm font-extrabold text-ink"
        >
          One more 🥠
        </button>
      )}
    </div>
  )
}
