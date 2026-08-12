/**
 * Star Catcher.
 *
 * Stars drift down; catch them with a basket you drag along the bottom. Deliberately
 * *not* a real game: nothing is ever missed, there's no lose condition, no timer and
 * no high score to beat. A star that reaches the bottom just fades and another comes.
 * The reward for catching is a sticker for the sticker book.
 *
 * Implementation notes:
 *  - Motion is driven by one rAF loop over plain state, not by framer-motion — a
 *    dozen independently animating springs plus collision checks would fight each
 *    other for the frame budget.
 *  - Positions are percentages of the play area, so it needs no pixel measurements
 *    and behaves the same on any screen width.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useBloomStore } from '../store/useBloomStore.js'
import { STICKERS } from './stickers.js'
import { popConfetti } from '../lib/celebrate.js'

const STAR_COLORS = ['#ffc94d', '#ff9aa8', '#7cc4e8', '#a98cf0', '#7fe0c4']
/** Stars in flight at once. */
const MAX_STARS = 5
/** % of the play area height per second. */
const FALL_SPEED = 17
/** Horizontal catch tolerance, in % of width. */
const CATCH_RADIUS = 11

let starId = 0

function spawnStar() {
  return {
    id: ++starId,
    x: 8 + Math.random() * 84,
    y: -8,
    speed: FALL_SPEED * (0.75 + Math.random() * 0.6),
    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    spin: Math.random() * 360,
  }
}

function Star({ color, size = 30 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
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

export default function StarCatcher() {
  const reduceMotion = useReducedMotion()
  const findSticker = useBloomStore((state) => state.findSticker)
  const found = useBloomStore((state) => state.stickers)

  const areaRef = useRef(null)
  const [stars, setStars] = useState([])
  const [basketX, setBasketX] = useState(50)
  const [caught, setCaught] = useState(0)
  const [pops, setPops] = useState([])
  const [prize, setPrize] = useState(null)
  const [running, setRunning] = useState(!reduceMotion)

  // The loop reads these through refs so it never needs to be torn down and
  // rebuilt when they change — restarting rAF on every basket move would stutter.
  const basketRef = useRef(basketX)
  basketRef.current = basketX
  const runningRef = useRef(running)
  runningRef.current = running
  /** Catch tally for the every-third-star sticker, kept out of render state. */
  const caughtRef = useRef(0)

  const award = useCallback(() => {
    // Give out a sticker they don't have yet; once the set is complete, catching
    // is just catching.
    const owned = new Set(useBloomStore.getState().stickers)
    const next = STICKERS.find((sticker) => !owned.has(sticker.id))
    if (!next) return
    findSticker(next.id)
    setPrize(next)
    window.setTimeout(() => setPrize(null), 2800)
    if (!reduceMotion) popConfetti({ particleCount: 34, spread: 65 })
  }, [findSticker, reduceMotion])

  /** One rAF loop: advance every star, catch what overlaps the basket. */
  useEffect(() => {
    if (reduceMotion) return
    let frame
    let previous = performance.now()

    const tick = (time) => {
      const delta = Math.min((time - previous) / 1000, 0.05) // clamp tab-switch jumps
      previous = time

      if (runningRef.current) {
        setStars((current) => {
          const basket = basketRef.current
          const survivors = []
          const hits = []

          for (const star of current) {
            const y = star.y + star.speed * delta
            // Caught: near the basket line and horizontally close enough.
            if (y >= 78 && y <= 96 && Math.abs(star.x - basket) <= CATCH_RADIUS) {
              hits.push({ id: star.id, x: star.x, y, color: star.color })
              continue
            }
            // Past the bottom: it just leaves. Nothing is "missed".
            if (y > 108) continue
            survivors.push({ ...star, y })
          }

          if (hits.length) {
            setCaught((n) => n + hits.length)
            setPops((current) => [...current, ...hits].slice(-6))
            // Every third catch earns a sticker, so the book fills gradually.
            //
            // Counted on a ref rather than off the `caught` state: a state updater
            // must stay pure, and React can invoke one twice in development, which
            // would hand out double stickers.
            for (let i = 0; i < hits.length; i++) {
              caughtRef.current += 1
              if (caughtRef.current % 3 === 0) award()
            }
          }

          while (survivors.length < MAX_STARS) survivors.push(spawnStar())
          return survivors
        })
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reduceMotion, award])

  /** Drag / tap anywhere in the field to move the basket under your finger. */
  const moveBasket = (event) => {
    const area = areaRef.current
    if (!area) return
    const rect = area.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    setBasketX(Math.max(6, Math.min(94, x)))
  }

  const onPointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    moveBasket(event)
  }

  const onPointerMove = (event) => {
    if (event.buttons === 0 && event.pointerType === 'mouse') return
    moveBasket(event)
  }

  /** Keyboard control, so this isn't drag-only. */
  const onKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setBasketX((x) => Math.max(6, x - 8))
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      setBasketX((x) => Math.min(94, x + 8))
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft/80">
          Nothing to lose
        </p>
        <motion.h2
          className="mt-1 font-display text-3xl font-extrabold text-ink"
          animate={reduceMotion ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          Star catcher
        </motion.h2>
      </header>

      <div
        ref={areaRef}
        /*
         * The drag handlers are attached only when there's actually a basket to
         * drag. They call setPointerCapture, which redirects the pointer — and so
         * the resulting click — to this container; with the reduced-motion star
         * buttons inside, that swallowed their taps entirely.
         */
        onPointerDown={reduceMotion ? undefined : onPointerDown}
        onPointerMove={reduceMotion ? undefined : onPointerMove}
        onKeyDown={reduceMotion ? undefined : onKeyDown}
        role={reduceMotion ? 'group' : 'application'}
        tabIndex={reduceMotion ? undefined : 0}
        aria-label={
          reduceMotion
            ? 'Stars to catch. Tap any one.'
            : 'Star catching field. Drag, or use the left and right arrow keys, to move the basket.'
        }
        className="card-soft relative h-80 w-full touch-none overflow-hidden rounded-[1.75rem]"
        style={{ background: 'linear-gradient(to bottom, #cbe9f7 0%, #eaf6fb 62%, #fdf6ec 100%)' }}
      >
        {reduceMotion ? (
          // Reduced motion: no falling anything. A tap-to-catch row instead, so the
          // experience and its stickers stay reachable.
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-sm font-semibold leading-relaxed text-ink-soft">
              Motion is turned down on this device, so here are the stars sitting still.
              Tap one.
            </p>
            <div className="flex gap-4">
              {STAR_COLORS.slice(0, 4).map((color, i) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Catch star ${i + 1}`}
                  onClick={() => {
                    caughtRef.current += 1
                    setCaught(caughtRef.current)
                    if (caughtRef.current % 3 === 0) award()
                  }}
                >
                  <Star color={color} size={40} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {stars.map((star) => (
              <div
                key={star.id}
                className="pointer-events-none absolute"
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  transform: `translate(-50%, -50%) rotate(${star.spin + star.y * 3}deg)`,
                }}
              >
                <Star color={star.color} size={30} />
              </div>
            ))}

            {/* Little sparkle where a star was caught. */}
            <AnimatePresence>
              {pops.map((pop) => (
                <motion.span
                  key={pop.id}
                  className="pointer-events-none absolute font-display text-xl font-extrabold"
                  style={{ left: `${pop.x}%`, top: `${pop.y}%` }}
                  initial={{ opacity: 1, scale: 0.5, y: 0 }}
                  animate={{ opacity: 0, scale: 1.5, y: -34 }}
                  transition={{ duration: 0.85, ease: 'easeOut' }}
                  aria-hidden
                >
                  ✨
                </motion.span>
              ))}
            </AnimatePresence>

            {/* The basket. */}
            <motion.div
              className="pointer-events-none absolute bottom-3"
              style={{ left: `${basketX}%`, x: '-50%' }}
              animate={{ left: `${basketX}%` }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <svg viewBox="0 0 60 44" className="h-14 w-20" aria-hidden>
                <path
                  d="M6 12 L54 12 L47 40 Q30 44 13 40 Z"
                  fill="#e8b06b"
                  stroke="#3a3129"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                <path d="M14 20 L46 20 M17 29 L43 29" stroke="#c9914f" strokeWidth="2.4" strokeLinecap="round" />
                <rect x="2" y="6" width="56" height="8" rx="4" fill="#f2c489" stroke="#3a3129" strokeWidth="3" />
              </svg>
            </motion.div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-ink-soft">
          {caught === 0 ? 'Drag to move the basket.' : `${caught} caught`}
          <span className="block text-[0.68rem] text-ink-soft/70">
            {found.length}/{STICKERS.length} stickers found
          </span>
        </p>
        {!reduceMotion && (
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="btn-toon rounded-full bg-white px-5 py-2 font-display text-xs font-extrabold text-ink"
          >
            {running ? 'Pause' : 'Play'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {prize && (
          <motion.div
            className="card-soft flex items-center gap-3 rounded-2xl bg-honey px-4 py-3"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <span className="text-3xl" aria-hidden>
              {prize.glyph}
            </span>
            <span>
              <span className="block font-display text-sm font-extrabold text-ink">
                New sticker: {prize.name}!
              </span>
              <span className="block text-[0.7rem] font-semibold text-ink/70">
                It's in your sticker book now.
              </span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
