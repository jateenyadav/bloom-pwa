/**
 * Compliment Slot Machine.
 *
 * An actual cartoon machine: chunky outlined body, three symbol reels that blur
 * past, a lever that swings down when you pull it, and one warm affirmation that
 * lands with a sparkle burst. Messages come from config.compliments (editable
 * JSON), and a local shuffle bag makes sure you don't get the same line twice in a
 * row within a session.
 */
import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { config } from '../config/index.js'
import { popConfetti, sparkleBurst } from '../lib/celebrate.js'

/** Fisher-Yates. Local to this component — the rotation engine has its own. */
function shuffle(items, random = Math.random) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Symbols the reels tumble through. Purely decorative sugar. */
const SYMBOLS = ['🌸', '⭐️', '🍀', '🌈', '🍓', '💛', '🦋', '🍋']

/** One vertical reel of symbols that spins, then snaps to a resting symbol. */
function Reel({ spinning, index, reduceMotion }) {
  // Repeat the strip so the scroll can loop without a visible seam.
  const strip = [...SYMBOLS, ...SYMBOLS]
  const rowHeight = 44

  return (
    <div
      className="relative h-11 w-12 overflow-hidden rounded-xl border-[3px] border-ink bg-cream"
      aria-hidden
    >
      <motion.div
        className="absolute inset-x-0 top-0 flex flex-col items-center"
        animate={
          reduceMotion
            ? { y: -index * rowHeight }
            : spinning
              ? { y: [-0, -SYMBOLS.length * rowHeight] }
              : { y: -((index * 3) % SYMBOLS.length) * rowHeight }
        }
        transition={
          spinning && !reduceMotion
            ? { duration: 0.34 + index * 0.05, repeat: Infinity, ease: 'linear' }
            : { type: 'spring', stiffness: 260, damping: 18 }
        }
      >
        {strip.map((symbol, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center justify-center text-2xl"
            style={{ height: rowHeight }}
          >
            {symbol}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

export default function ComplimentSlotMachine() {
  const reduceMotion = useReducedMotion()
  const messages = useMemo(
    () => (config.compliments?.length ? config.compliments : ['You are enough, exactly as you are.']),
    []
  )

  // Shuffle bag: drains before refilling, so no repeats until all are seen.
  const bag = useRef(shuffle(messages))
  const [current, setCurrent] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const [pulls, setPulls] = useState(0)

  const pull = () => {
    if (spinning) return
    setSpinning(true)

    if (bag.current.length === 0) {
      // Refill, avoiding an immediate repeat of the line just shown.
      let next = shuffle(messages)
      if (messages.length > 1 && next[0] === current) next = [...next.slice(1), next[0]]
      bag.current = next
    }

    const message = bag.current.shift()
    const spinMs = reduceMotion ? 0 : 1050

    window.setTimeout(() => {
      setCurrent(message)
      setSpinning(false)
      setPulls((n) => n + 1)
      sparkleBurst({ x: 0.5, y: 0.5 })
      popConfetti({ x: 0.5, y: 0.62 })
    }, spinMs)
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft/80">
          A small true thing
        </p>
        <motion.h2
          className="mt-1 font-display text-3xl font-extrabold text-ink"
          animate={reduceMotion ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          Pull for a reminder
        </motion.h2>
      </header>

      {/* ---- The machine ---- */}
      <div className="relative w-full pr-7">
        <motion.div
          className="card-soft relative w-full rounded-[2rem] px-5 pb-6 pt-5"
          animate={
            reduceMotion || !spinning
              ? { x: 0, rotate: 0 }
              : { x: [0, -2, 2, -1.5, 0], rotate: [0, -0.6, 0.6, 0] }
          }
          transition={spinning ? { duration: 0.22, repeat: Infinity } : { duration: 0.3 }}
        >
          {/* Marquee bulbs across the top of the cabinet */}
          <div className="mb-4 flex items-center justify-center gap-2.5" aria-hidden>
            {['#ff9aa8', '#ffc94d', '#7cc4e8', '#a98cf0', '#7fe0c4'].map((bulb, i) => (
              <motion.span
                key={bulb}
                className="h-3 w-3 rounded-full border-2 border-ink"
                style={{ backgroundColor: bulb }}
                animate={reduceMotion ? undefined : { opacity: [0.35, 1, 0.35], scale: [0.9, 1.15, 0.9] }}
                transition={{
                  duration: spinning ? 0.4 : 1.6,
                  repeat: Infinity,
                  delay: i * (spinning ? 0.06 : 0.18),
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Reels */}
          <div className="mb-4 flex items-center justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <Reel key={i} spinning={spinning} index={i} reduceMotion={reduceMotion} />
            ))}
          </div>

          {/* The message window */}
          <div className="relative flex min-h-32 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-ink bg-white px-4 py-5">
            <AnimatePresence mode="wait">
              {spinning ? (
                <motion.div
                  key="spinning"
                  className="flex flex-col items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  aria-hidden
                >
                  {[0, 1, 2].map((row) => (
                    <motion.div
                      key={row}
                      className="h-3 rounded-full border-2 border-ink/70 bg-honey"
                      style={{ width: 130 - row * 30 }}
                      animate={{ y: [-6, 6, -6], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 0.32, repeat: Infinity, delay: row * 0.06 }}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.p
                  key={current ?? 'empty'}
                  className="max-w-sm text-center font-display text-xl font-bold leading-snug text-ink"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: 18 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: -18 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                  aria-live="polite"
                >
                  {current ?? 'Tap the lever. It will say something you probably needed to hear.'}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ---- The lever, hanging off the right edge of the cabinet ---- */}
        <motion.button
          type="button"
          onClick={pull}
          disabled={spinning}
          aria-label={pulls === 0 ? 'Pull the lever' : 'Pull the lever again'}
          className="absolute right-0 top-14 origin-bottom disabled:cursor-default"
          animate={reduceMotion ? undefined : { rotate: spinning ? 42 : 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: spinning ? 24 : 12 }}
          style={{ transformOrigin: '10px 92px' }}
        >
          <svg viewBox="0 0 24 100" className="h-28 w-6" aria-hidden>
            <rect x="1" y="72" width="18" height="26" rx="6" fill="#c9bdae" stroke="#3a3129" strokeWidth="3" />
            <path d="M10 78 L10 24" stroke="#3a3129" strokeWidth="6" strokeLinecap="round" />
            <circle cx="10" cy="16" r="11" fill="#ff5f6d" stroke="#3a3129" strokeWidth="3" />
            <circle cx="6.5" cy="12" r="3" fill="#fff" opacity="0.6" />
          </svg>
        </motion.button>
      </div>

      {/*
       * The attention pulse is a decorative ring INSIDE the button, not a scale on
       * the button itself: a control whose hit box never stops moving is harder to
       * hit accurately (and unclickable to automation). Tap targets stay still.
       */}
      <button
        type="button"
        onClick={pull}
        disabled={spinning}
        className="btn-toon relative overflow-visible rounded-full bg-blush px-9 py-3 font-display text-lg font-extrabold text-white disabled:opacity-70"
      >
        {!reduceMotion && !spinning && pulls === 0 && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border-[3px] border-blush"
            animate={{ scale: [1, 1.35], opacity: [0.8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <span className="relative">
          {spinning ? 'Spinning…' : pulls === 0 ? 'Pull the lever' : 'One more!'}
        </span>
      </button>

      {pulls > 2 && (
        <motion.p
          className="text-center text-xs font-semibold text-ink-soft/80"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Every one of these is true, by the way. ✨
        </motion.p>
      )}
    </div>
  )
}
