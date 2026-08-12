/**
 * Bubble Wrap.
 *
 * A sheet of bubbles. Pop them. That's it — no score to beat, no timer, no fail
 * state. It exists because popping bubble wrap is genuinely soothing and needs no
 * justification.
 *
 * Once the sheet is clear it offers a fresh one. The lifetime count is persisted
 * only because it's a nice thing to notice, never as a target.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useBloomStore } from '../store/useBloomStore.js'
import { popConfetti } from '../lib/celebrate.js'

const COLUMNS = 6
const ROWS = 9
const TOTAL = COLUMNS * ROWS

/**
 * A short, quiet pop.
 *
 * Synthesised with WebAudio rather than shipped as an asset: it keeps the app fully
 * offline-safe with nothing to precache, and lets each pop be pitched slightly
 * differently so a fast run doesn't sound like a machine gun.
 *
 * The AudioContext is created on the first pop, never at import: browsers block
 * audio until a user gesture, and constructing one eagerly logs a console warning
 * on every load.
 */
function createPopper() {
  let ctx = null

  return function pop(index) {
    try {
      if (!ctx) {
        const Ctor = window.AudioContext || window.webkitAudioContext
        if (!Ctor) return
        ctx = new Ctor()
      }
      if (ctx.state === 'suspended') ctx.resume()

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      // Pitch wanders with position so neighbouring pops differ.
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(420 + ((index * 37) % 260), now)
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.09)

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.006)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1)

      osc.connect(gain).connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.12)
    } catch {
      // Audio is a bonus, never a requirement. A blocked or missing AudioContext
      // must not stop the bubbles from popping visually.
    }
  }
}

export default function BubbleWrap() {
  const reduceMotion = useReducedMotion()
  const bubblesPopped = useBloomStore((state) => state.bubblesPopped)
  const addBubbles = useBloomStore((state) => state.addBubbles)

  const [popped, setPopped] = useState(() => new Set())
  const [sheet, setSheet] = useState(0)
  const [muted, setMuted] = useState(false)
  const popperRef = useRef(null)

  if (!popperRef.current) popperRef.current = createPopper()

  const remaining = TOTAL - popped.size
  const cleared = remaining === 0

  const pop = useCallback(
    (index) => {
      setPopped((current) => {
        if (current.has(index)) return current
        const next = new Set(current)
        next.add(index)
        return next
      })
    },
    []
  )

  // Count and sound live here rather than in `pop` so a duplicate pointer event on
  // an already-popped bubble can't inflate the count or double up the audio.
  const handlePop = (index) => {
    if (popped.has(index)) return
    pop(index)
    addBubbles(1)
    if (!muted) popperRef.current(index)
  }

  useEffect(() => {
    if (!cleared) return
    if (!reduceMotion) popConfetti({ particleCount: 60, spread: 90 })
  }, [cleared, reduceMotion])

  const freshSheet = () => {
    setPopped(new Set())
    setSheet((n) => n + 1)
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft/80">
          No score, no timer
        </p>
        <motion.h2
          className="mt-1 font-display text-3xl font-extrabold text-ink"
          animate={reduceMotion ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          Bubble wrap
        </motion.h2>
      </header>

      <div className="card-soft w-full rounded-[1.75rem] bg-sky/20 p-3">
        {/* `touch-none` keeps a drag across the sheet from scrolling the page. */}
        <div
          className="grid touch-none gap-1.5"
          style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: TOTAL }).map((_, index) => {
            const isPopped = popped.has(index)
            return (
              <button
                key={`${sheet}-${index}`}
                type="button"
                // pointerenter fires on drag-through for mouse; click covers taps.
                onPointerDown={() => handlePop(index)}
                onPointerEnter={(event) => {
                  // Only drag-pop when a button is actually held down.
                  if (event.buttons === 1) handlePop(index)
                }}
                aria-label={isPopped ? 'Popped bubble' : `Pop bubble ${index + 1}`}
                aria-pressed={isPopped}
                className="relative aspect-square"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isPopped ? (
                    <motion.span
                      key="flat"
                      className="absolute inset-0 rounded-full border-2 border-ink/25 bg-sky/15"
                      initial={reduceMotion ? { opacity: 1 } : { scale: 1.15, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.18 }}
                      aria-hidden
                    />
                  ) : (
                    <motion.span
                      key="bubble"
                      className="absolute inset-0 rounded-full border-[2.5px] border-ink"
                      style={{
                        background:
                          'radial-gradient(circle at 32% 28%, #ffffff 0%, #cfeaf7 42%, #8fcfe8 100%)',
                      }}
                      initial={reduceMotion ? { opacity: 1 } : { scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { scale: 1.45, opacity: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 24,
                        delay: reduceMotion ? 0 : Math.min(index * 0.006, 0.25),
                      }}
                      aria-hidden
                    >
                      {/* Specular highlight — what makes it read as domed. */}
                      <span className="absolute left-[22%] top-[16%] h-[26%] w-[26%] rounded-full bg-white/85" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-3">
        <p className="text-xs font-semibold text-ink-soft">
          {cleared ? 'Whole sheet. Beautiful.' : `${remaining} left`}
          {bubblesPopped > 0 && (
            <span className="block text-[0.68rem] text-ink-soft/70">
              {bubblesPopped} popped all time
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-pressed={muted}
            aria-label={muted ? 'Turn pop sounds on' : 'Turn pop sounds off'}
            className="btn-toon rounded-full bg-white px-4 py-2 font-display text-xs font-extrabold text-ink"
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            type="button"
            onClick={freshSheet}
            disabled={popped.size === 0}
            className="btn-toon rounded-full bg-honey px-5 py-2 font-display text-xs font-extrabold text-ink disabled:opacity-50"
          >
            Fresh sheet
          </button>
        </div>
      </div>
    </div>
  )
}
