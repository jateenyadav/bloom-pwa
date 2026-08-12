/**
 * Wish Jar.
 *
 * Write a wish on a paper star, watch it drop into a jar, and it stays there. The
 * jar fills up over months, which is the whole point: it's the one place in Bloom
 * that visibly rewards coming back, without ever counting streaks or scolding.
 *
 * Wishes are kept in the persisted store (`wishes`), so they survive reinstalls of
 * the tab and work offline like everything else.
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useBloomStore } from '../store/useBloomStore.js'
import { popConfetti } from '../lib/celebrate.js'

const STAR_COLORS = ['#ffc94d', '#ff9aa8', '#7cc4e8', '#a98cf0', '#7fe0c4', '#ff9f45']

/**
 * Deterministic scatter for a star inside the jar.
 *
 * Seeded off the index so a wish keeps its spot forever — a fresh Math.random()
 * per render would make the jar reshuffle every time you blinked.
 */
function scatter(index) {
  const golden = 0.618033988749895
  const a = (index * golden) % 1
  const b = ((index + 1) * golden * 3) % 1
  return {
    left: 12 + a * 66, // %
    bottom: 4 + (index % 7) * 5.5 + b * 4, // %
    rotate: -30 + b * 60,
    color: STAR_COLORS[index % STAR_COLORS.length],
    scale: 0.82 + ((index * 7) % 5) * 0.07,
  }
}

/** A five-pointed paper star. */
function Star({ color, className = '', style }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden>
      <path
        d="M12 1.6l3.2 6.7 7.3.9-5.3 5 1.3 7.2L12 17.9l-6.5 3.5 1.3-7.2-5.3-5 7.3-.9z"
        fill={color}
        stroke="#3a3129"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function WishJar() {
  const reduceMotion = useReducedMotion()
  const wishes = useBloomStore((state) => state.wishes)
  const addWish = useBloomStore((state) => state.addWish)
  const removeWish = useBloomStore((state) => state.removeWish)

  const [text, setText] = useState('')
  const [dropping, setDropping] = useState(false)
  const [reading, setReading] = useState(null)

  // Cap what we render, not what we store: 60 stars is already a full-looking jar
  // and hundreds of animated SVGs would cost real frames on a phone.
  const visible = useMemo(() => wishes.slice(-60), [wishes])

  const submit = (event) => {
    event.preventDefault()
    if (!text.trim()) return
    addWish(text)
    setText('')
    setDropping(true)
    if (!reduceMotion) popConfetti({ particleCount: 26, spread: 55 })
    window.setTimeout(() => setDropping(false), 900)
  }

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft/80">
          Keep it somewhere safe
        </p>
        <motion.h2
          className="mt-1 font-display text-3xl font-extrabold text-ink"
          animate={reduceMotion ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          The wish jar
        </motion.h2>
      </header>

      {/* ---- The jar ---- */}
      <div className="relative h-56 w-44">
        {/* Glass */}
        <svg viewBox="0 0 100 130" className="absolute inset-0 h-full w-full" aria-hidden>
          <path
            d="M22 34 Q22 26 32 24 L32 16 Q32 12 36 12 L64 12 Q68 12 68 16 L68 24 Q78 26 78 34 L78 116 Q78 124 68 124 L32 124 Q22 124 22 116 Z"
            fill="#eaf6fb"
            fillOpacity="0.75"
            stroke="#3a3129"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          {/* Lid */}
          <rect x="30" y="4" width="40" height="10" rx="4" fill="#ffc94d" stroke="#3a3129" strokeWidth="3" />
          {/* Glass highlight — sells it as glass more than any gradient would. */}
          <path d="M30 40 Q28 70 31 104" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.75" />
        </svg>

        {/* Stars inside, clipped to the jar's inner box. */}
        <div className="absolute inset-x-[24%] bottom-[6%] top-[22%] overflow-hidden">
          {visible.map((wish, index) => {
            const spot = scatter(index)
            return (
              <motion.button
                key={wish.id}
                type="button"
                onClick={() => setReading(wish)}
                aria-label={`Read wish: ${wish.text.slice(0, 40)}`}
                className="absolute h-6 w-6"
                style={{ left: `${spot.left}%`, bottom: `${spot.bottom}%` }}
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : // New stars fall in from above the jar mouth.
                      { opacity: 0, y: -120, rotate: spot.rotate - 180, scale: spot.scale }
                }
                animate={{ opacity: 1, y: 0, rotate: spot.rotate, scale: spot.scale }}
                transition={{
                  type: 'spring',
                  stiffness: 180,
                  damping: 14,
                  delay: reduceMotion ? 0 : Math.min(index * 0.015, 0.4),
                }}
                whileHover={reduceMotion ? undefined : { scale: spot.scale * 1.25, zIndex: 5 }}
              >
                <Star color={spot.color} className="h-full w-full" />
              </motion.button>
            )
          })}
        </div>

        {/* A star visibly dropping in, on top of the glass. */}
        <AnimatePresence>
          {dropping && !reduceMotion && (
            <motion.div
              className="pointer-events-none absolute left-1/2 top-0 h-7 w-7 -translate-x-1/2"
              initial={{ y: -40, opacity: 0, rotate: 0 }}
              animate={{ y: 120, opacity: [0, 1, 1, 0], rotate: 220 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeIn' }}
              aria-hidden
            >
              <Star color="#ffc94d" className="h-full w-full" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-center text-sm font-semibold text-ink-soft">
        {wishes.length === 0
          ? 'The jar is empty. What are you hoping for?'
          : `${wishes.length} ${wishes.length === 1 ? 'wish' : 'wishes'} in the jar · tap a star to read it`}
      </p>

      <form onSubmit={submit} className="w-full">
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="I hope…"
          maxLength={180}
          className="card-soft w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:font-normal placeholder:text-ink-soft/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="btn-toon mt-3 w-full rounded-full bg-honey py-3 font-display text-base font-extrabold text-ink disabled:opacity-50"
        >
          Drop it in ✨
        </button>
      </form>

      <AnimatePresence>
        {reading && (
          <motion.div
            /* z = LAYER.EXPERIENCE_OVERLAY — below the calm trigger (50). */
            className="fixed inset-0 z-[40] flex items-center justify-center bg-ink/80 px-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
            onClick={() => setReading(null)}
            role="dialog"
            aria-modal="true"
            aria-label="A wish"
          >
            <motion.div
              className="card-soft w-full max-w-sm rounded-[2rem] bg-white px-6 py-7 text-center"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              onClick={(event) => event.stopPropagation()}
            >
              <Star color="#ffc94d" className="mx-auto h-10 w-10" />
              <p className="mt-4 font-display text-lg font-bold leading-relaxed text-ink">
                {reading.text}
              </p>
              <p className="mt-3 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-ink-soft/70">
                {new Date(reading.createdAt).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setReading(null)}
                  className="btn-toon rounded-full bg-white px-6 py-2.5 font-display text-sm font-extrabold text-ink"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeWish(reading.id)
                    setReading(null)
                  }}
                  className="btn-toon rounded-full bg-blush px-5 py-2.5 font-display text-sm font-extrabold text-ink"
                >
                  Came true
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
