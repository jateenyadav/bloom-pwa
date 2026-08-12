/**
 * 5-4-3-2-1 grounding.
 *
 * One sense at a time, one step per screen, each with its own cartoon icon and
 * colour so the steps feel distinct rather than like a form. There's no input to
 * fill in and no "correct" completion — the point is to move attention outward, so
 * the only interaction is "next" at whatever pace feels right.
 */
import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { popConfetti } from '../../lib/celebrate.js'

const STEPS = [
  {
    count: 5,
    sense: 'see',
    glyph: '👀',
    color: '#7cc4e8',
    prompt: 'Find five things you can see.',
    hint: 'Anything counts. A crack in the wall. The colour of your sleeve.',
  },
  {
    count: 4,
    sense: 'feel',
    glyph: '✋',
    color: '#ff9aa8',
    prompt: 'Notice four things you can feel.',
    hint: 'The floor under you. Fabric on your skin. Air on your hands.',
  },
  {
    count: 3,
    sense: 'hear',
    glyph: '👂',
    color: '#ffc94d',
    prompt: 'Listen for three things you can hear.',
    hint: 'Far away sounds count too. So does the quiet.',
  },
  {
    count: 2,
    sense: 'smell',
    glyph: '🌸',
    color: '#a98cf0',
    prompt: 'Name two things you can smell.',
    hint: "If you can't find any, name two smells you like.",
  },
  {
    count: 1,
    sense: 'taste',
    glyph: '🍓',
    color: '#7fe0c4',
    prompt: 'Notice one thing you can taste.',
    hint: 'Or one taste you would like right now.',
  },
]

export default function GroundingExercise() {
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)

  const step = STEPS[index]
  const isLast = index === STEPS.length - 1

  const next = () => {
    if (isLast) {
      setDone(true)
      popConfetti({ x: 0.5, y: 0.5 })
      return
    }
    setIndex((i) => i + 1)
  }

  const restart = () => {
    setIndex(0)
    setDone(false)
  }

  const fade = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 18, scale: 0.92 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -18, scale: 0.94 },
      }

  if (done) {
    return (
      <motion.div
        {...fade}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="flex flex-col items-center gap-5 text-center"
      >
        <motion.div
          className="text-6xl"
          animate={reduceMotion ? undefined : { rotate: [-8, 8, -8], scale: [1, 1.08, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          🌷
        </motion.div>
        <div className="font-display text-3xl font-extrabold text-ink">You're here.</div>
        <p className="max-w-xs text-sm font-semibold leading-relaxed text-ink-soft">
          That's the whole exercise. Nothing else is required of you right now.
        </p>
        <button
          type="button"
          onClick={restart}
          className="btn-toon rounded-full bg-leaf px-6 py-2.5 font-display text-base font-extrabold text-white"
        >
          Go again
        </button>
      </motion.div>
    )
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      {/* Progress dots — decorative; the step count is announced in the live region. */}
      <div className="flex items-center gap-2" aria-hidden>
        {STEPS.map((s, i) => (
          <motion.span
            key={s.sense}
            className="h-3 rounded-full border-[2.5px] border-ink"
            animate={{
              width: i === index ? 30 : 12,
              backgroundColor: i <= index ? s.color : '#fdf6ec',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          />
        ))}
      </div>

      <div className="flex min-h-64 w-full items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.sense}
            {...fade}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="flex flex-col items-center gap-3 text-center"
            aria-live="polite"
          >
            {/* Big numbered badge with the sense's glyph orbiting it. */}
            <div className="relative flex h-28 w-28 items-center justify-center">
              <motion.span
                className="absolute inset-0 rounded-full border-[3px] border-ink"
                style={{ backgroundColor: step.color, boxShadow: '5px 6px 0 0 var(--color-ink)' }}
                animate={reduceMotion ? undefined : { rotate: [-3, 3, -3] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden
              />
              <motion.span
                className="relative font-display text-6xl font-extrabold text-white text-toon"
                initial={reduceMotion ? false : { scale: 0.4, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 14 }}
                aria-hidden
              >
                {step.count}
              </motion.span>
              <motion.span
                className="absolute -right-6 -top-5 text-4xl drop-shadow"
                initial={reduceMotion ? false : { scale: 0, rotate: 40 }}
                animate={
                  reduceMotion ? { scale: 1 } : { scale: 1, rotate: 0, y: [0, -5, 0] }
                }
                transition={{
                  scale: { type: 'spring', stiffness: 300, damping: 14, delay: 0.15 },
                  rotate: { type: 'spring', stiffness: 300, damping: 14, delay: 0.15 },
                  y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
                }}
                aria-hidden
              >
                {step.glyph}
              </motion.span>
            </div>

            <p className="max-w-xs font-display text-xl font-extrabold leading-snug text-ink">
              {step.prompt}
            </p>
            <p className="max-w-xs text-sm font-semibold leading-relaxed text-ink-soft">{step.hint}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3">
        {index > 0 && (
          <button
            type="button"
            onClick={() => setIndex((i) => i - 1)}
            className="btn-toon rounded-full bg-white px-5 py-2.5 font-display text-base font-extrabold text-ink"
          >
            Back
          </button>
        )}
        <motion.button
          type="button"
          onClick={next}
          className="btn-toon rounded-full bg-leaf px-7 py-2.5 font-display text-base font-extrabold text-white"
          whileHover={reduceMotion ? undefined : { scale: 1.04, rotate: 1.5 }}
        >
          {isLast ? 'Finish' : 'Next'}
        </motion.button>
      </div>

      <p className="text-xs font-semibold text-ink-soft/80">Take as long as you need on each one.</p>
    </div>
  )
}
