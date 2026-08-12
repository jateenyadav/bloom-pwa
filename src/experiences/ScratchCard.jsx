/**
 * Scratch Card.
 *
 * A foil-covered card. Scratch it with a finger and a hidden message comes through.
 * When enough of the foil is gone it clears itself the rest of the way, so nobody
 * has to scrub the last stubborn corner.
 *
 * Implementation notes:
 *  - The foil is a canvas painted over the message, erased with
 *    `globalCompositeOperation = 'destination-out'`. Cheaper and smoother than a
 *    mask element, and it works identically for mouse, touch and stylus via
 *    Pointer Events.
 *  - Progress is sampled from the alpha channel, on a coarse grid rather than every
 *    pixel: a full readback per pointermove would drop frames on a phone.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { shuffleNames } from '../engine/petNames.js'
import { popConfetti } from '../lib/celebrate.js'
import { config } from '../config/index.js'

/** Fraction of foil that must be gone before it auto-clears. */
const CLEAR_AT = 0.42
const BRUSH = 22

export default function ScratchCard() {
  const reduceMotion = useReducedMotion()
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const scratchingRef = useRef(false)
  const lastRef = useRef(null)

  const messages = config.compliments ?? []
  const [queue] = useState(() => shuffleNames(messages))
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [touched, setTouched] = useState(false)

  /** Paint the foil. Also used to reset for the next card. */
  const paintFoil = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0) return

    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)

    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctxRef.current = ctx

    // Diagonal metallic sheen.
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height)
    gradient.addColorStop(0, '#c9b7e8')
    gradient.addColorStop(0.35, '#e8dcf5')
    gradient.addColorStop(0.5, '#fdf6ec')
    gradient.addColorStop(0.68, '#d8c8ee')
    gradient.addColorStop(1, '#a98cf0')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Sparkles, so the foil doesn't look like flat plastic. Deterministic-ish
    // positions are fine here — it's decorative and repainted per card.
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    for (let i = 0; i < 40; i++) {
      const x = ((i * 97) % Math.round(rect.width)) + (i % 5)
      const y = ((i * 61) % Math.round(rect.height)) + (i % 7)
      ctx.beginPath()
      ctx.arc(x, y, 1.4 + (i % 3) * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.font = 'bold 15px "Baloo 2", system-ui, sans-serif'
    ctx.fillStyle = 'rgba(58,49,41,0.55)'
    ctx.textAlign = 'center'
    ctx.fillText('scratch me', rect.width / 2, rect.height / 2 + 5)

    // Every later stroke erases rather than paints.
    ctx.globalCompositeOperation = 'destination-out'
  }, [])

  useEffect(() => {
    paintFoil()
    // Rotating a phone changes the CSS box, which would otherwise leave the
    // backing store the wrong size and the foil stretched.
    const onResize = () => {
      if (!revealed) paintFoil()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [paintFoil, revealed])

  /** Fraction of the foil erased, sampled on a coarse grid. */
  const measureCleared = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return 0
    const { width, height } = canvas
    if (width === 0 || height === 0) return 0

    const data = ctx.getImageData(0, 0, width, height).data
    let clear = 0
    let total = 0
    // Step in both axes — sampling ~1 in 400 pixels is plenty for a threshold.
    const step = 20
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        total++
        if (data[(y * width + x) * 4 + 3] < 128) clear++
      }
    }
    return total === 0 ? 0 : clear / total
  }, [])

  const pointFrom = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const scratchTo = (point) => {
    const ctx = ctxRef.current
    if (!ctx) return
    const last = lastRef.current ?? point
    ctx.lineWidth = BRUSH * 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastRef.current = point
  }

  const onPointerDown = (event) => {
    if (revealed) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    scratchingRef.current = true
    setTouched(true)
    lastRef.current = null
    scratchTo(pointFrom(event))
  }

  const onPointerMove = (event) => {
    if (!scratchingRef.current || revealed) return
    scratchTo(pointFrom(event))
  }

  const onPointerUp = () => {
    if (!scratchingRef.current) return
    scratchingRef.current = false
    lastRef.current = null
    // Measure on release, not on every move: one readback per stroke instead of
    // dozens keeps this smooth on a phone.
    if (measureCleared() >= CLEAR_AT) {
      setRevealed(true)
      if (!reduceMotion) popConfetti({ particleCount: 44, spread: 75 })
    }
  }

  const nextCard = () => {
    setRevealed(false)
    setTouched(false)
    setIndex((i) => (i + 1) % Math.max(1, queue.length))
    // Repaint after React has re-enabled the canvas for this next card.
    window.requestAnimationFrame(paintFoil)
  }

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft/80">
          Something's under there
        </p>
        <motion.h2
          className="mt-1 font-display text-3xl font-extrabold text-ink"
          animate={reduceMotion ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          Scratch card
        </motion.h2>
      </header>

      <div className="card-soft relative w-full overflow-hidden rounded-[1.75rem] bg-white">
        {/* The message underneath. */}
        <div className="flex min-h-[11rem] items-center justify-center px-7 py-8">
          <p className="text-center font-display text-xl font-extrabold leading-relaxed text-ink">
            {queue[index] ?? 'Add some compliments to your personal config.'}
          </p>
        </div>

        {/* The foil on top. Removed from the tree once revealed so it can't
            intercept taps on whatever ends up underneath. */}
        <AnimatePresence>
          {!revealed && (
            <motion.canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full touch-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              aria-label="Scratch the foil away to reveal a message"
              role="img"
            />
          )}
        </AnimatePresence>
      </div>

      <p className="min-h-[1.25rem] text-center text-xs font-semibold text-ink-soft">
        {revealed
          ? 'There you go.'
          : touched
            ? 'keep going…'
            : 'Drag your finger across the foil.'}
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={nextCard}
          className="btn-toon rounded-full bg-honey px-6 py-2.5 font-display text-sm font-extrabold text-ink"
        >
          {revealed ? 'Another card ✨' : 'Skip this one'}
        </button>
        {/* An accessible way out for anyone who can't drag — a scratch gesture
            shouldn't be the only path to the message. */}
        {!revealed && (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="btn-toon rounded-full bg-white px-6 py-2.5 font-display text-sm font-extrabold text-ink"
          >
            Just show me
          </button>
        )}
      </div>
    </div>
  )
}
