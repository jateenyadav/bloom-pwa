/**
 * Hug Button.
 *
 * One enormous button. Press it and you get a hug: the character squeezes you,
 * hearts fly out, and a warm line appears. Hold it down and the squeeze holds too.
 *
 * The count is the one running total in Bloom that's meant to be seen — but it's
 * framed as "hugs given", never as a streak or a goal, and nothing is ever withheld
 * until you reach a number.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useBloomStore } from '../store/useBloomStore.js'

const HUG_LINES = [
  'squeeze!',
  'you are held.',
  'stay as long as you like',
  'one more for luck',
  'i got you',
  'nothing is required of you right now',
  'you can put it down for a minute',
  'warm. safe. fine.',
]

/** Hearts that burst outward from the hug. */
function HeartBurst({ id, reduceMotion }) {
  if (reduceMotion) return null
  // Fixed offsets rather than random, so the burst reads as designed, not noisy.
  const hearts = [
    { x: -74, y: -58, delay: 0, size: 22 },
    { x: 68, y: -66, delay: 0.06, size: 26 },
    { x: -96, y: 12, delay: 0.12, size: 18 },
    { x: 92, y: 6, delay: 0.04, size: 20 },
    { x: -34, y: -92, delay: 0.1, size: 16 },
    { x: 40, y: -96, delay: 0.15, size: 24 },
  ]

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {hearts.map((heart, i) => (
        <motion.span
          key={`${id}-${i}`}
          className="absolute"
          style={{ fontSize: heart.size }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
          animate={{ opacity: [0, 1, 1, 0], x: heart.x, y: heart.y, scale: [0.3, 1.15, 1, 0.9] }}
          transition={{ duration: 1.15, delay: heart.delay, ease: 'easeOut' }}
        >
          {i % 3 === 0 ? '💛' : i % 3 === 1 ? '🩷' : '💗'}
        </motion.span>
      ))}
    </div>
  )
}

export default function HugButton() {
  const reduceMotion = useReducedMotion()
  const hugs = useBloomStore((state) => state.hugs)
  const addHug = useBloomStore((state) => state.addHug)

  const [squeezing, setSqueezing] = useState(false)
  const [burst, setBurst] = useState(0)
  const [line, setLine] = useState(null)
  const timerRef = useRef(null)

  // A stray timeout firing after unmount would set state on a dead component.
  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const hug = () => {
    addHug()
    setBurst((n) => n + 1)
    setLine(HUG_LINES[Math.floor(Math.random() * HUG_LINES.length)])
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setLine(null), 2600)
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft/80">
          Available at all times
        </p>
        <motion.h2
          className="mt-1 font-display text-3xl font-extrabold text-ink"
          animate={reduceMotion ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          Need a hug?
        </motion.h2>
      </header>

      <div className="relative flex h-64 w-full items-center justify-center">
        <AnimatePresence>
          {burst > 0 && <HeartBurst key={burst} id={burst} reduceMotion={reduceMotion} />}
        </AnimatePresence>

        {/*
         * Stationary hit box on purpose: the squeeze animates the drawing inside the
         * button, never the button itself. A giant target that jumps under your
         * finger is a worse target, and this one is the whole experience.
         */}
        <button
          type="button"
          onClick={hug}
          onPointerDown={() => setSqueezing(true)}
          onPointerUp={() => setSqueezing(false)}
          onPointerLeave={() => setSqueezing(false)}
          aria-label="Press for a hug"
          className="relative flex h-52 w-52 items-center justify-center rounded-full"
        >
          {/* Soft halo, purely decorative. */}
          {!reduceMotion && (
            <motion.span
              className="absolute inset-0 rounded-full bg-blush/30"
              animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.25, 0.5] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            />
          )}

          <motion.svg
            viewBox="0 0 120 120"
            className="relative h-48 w-48"
            animate={
              reduceMotion
                ? undefined
                : squeezing
                  ? { scale: 0.93 }
                  : { scale: [1, 1.02, 1] }
            }
            transition={
              squeezing
                ? { type: 'spring', stiffness: 400, damping: 22 }
                : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
            }
            aria-hidden
          >
            {/* Body */}
            <circle cx="60" cy="64" r="34" fill="#ffc0cb" stroke="#3a3129" strokeWidth="3.4" />
            {/* Ears */}
            <circle cx="36" cy="34" r="12" fill="#ffc0cb" stroke="#3a3129" strokeWidth="3.2" />
            <circle cx="84" cy="34" r="12" fill="#ffc0cb" stroke="#3a3129" strokeWidth="3.2" />
            <circle cx="36" cy="34" r="5.5" fill="#ff9aa8" />
            <circle cx="84" cy="34" r="5.5" fill="#ff9aa8" />

            {/* Arms — wrap inward when squeezing. */}
            {[-1, 1].map((side) => (
              <motion.ellipse
                key={side}
                cx={60 + side * 34}
                cy="72"
                rx="13"
                ry="8"
                fill="#ffb3c1"
                stroke="#3a3129"
                strokeWidth="3.2"
                animate={
                  reduceMotion
                    ? undefined
                    : squeezing
                      ? { rotate: side * -55, x: side * -12 }
                      : { rotate: side * -12, x: 0 }
                }
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                style={{ transformBox: 'fill-box', transformOrigin: side === 1 ? 'left center' : 'right center' }}
              />
            ))}

            {/* Face — eyes squeeze shut mid-hug, which is what makes it read as a hug. */}
            {squeezing ? (
              <>
                <path d="M44 58 q6 6 12 0" stroke="#3a3129" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M64 58 q6 6 12 0" stroke="#3a3129" strokeWidth="3" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <circle cx="50" cy="59" r="4" fill="#3a3129" />
                <circle cx="70" cy="59" r="4" fill="#3a3129" />
                <circle cx="51.5" cy="57.4" r="1.4" fill="white" />
                <circle cx="71.5" cy="57.4" r="1.4" fill="white" />
              </>
            )}
            <ellipse cx="42" cy="68" rx="5" ry="3.2" fill="#ff8fa3" opacity="0.8" />
            <ellipse cx="78" cy="68" rx="5" ry="3.2" fill="#ff8fa3" opacity="0.8" />
            <path
              d={squeezing ? 'M52 72 q8 8 16 0' : 'M53 71 q7 6 14 0'}
              stroke="#3a3129"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </motion.svg>
        </button>
      </div>

      <div className="min-h-[3.5rem] text-center">
        <AnimatePresence mode="wait">
          {line ? (
            <motion.p
              key={`${burst}-${line}`}
              className="font-display text-xl font-extrabold text-ink"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              {line}
            </motion.p>
          ) : (
            <motion.p
              key="idle"
              className="text-sm font-semibold text-ink-soft"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Press and hold. It'll hold back.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {hugs > 0 && (
        <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-ink-soft/70">
          {hugs} {hugs === 1 ? 'hug' : 'hugs'} so far
        </p>
      )}
    </div>
  )
}
