/**
 * Doodle Pad.
 *
 * A canvas to scribble on with bright cartoon crayons, plus stickers you can stamp
 * anywhere. Deliberately session-only: nothing is persisted, so it starts blank
 * every visit and there's no archive to feel responsible for.
 *
 * Implementation notes:
 *  - Pointer Events cover mouse, touch and stylus with one code path.
 *  - The backing store is sized to devicePixelRatio so lines aren't fuzzy on phones.
 *  - `touch-none` on the canvas stops the browser scrolling/zooming mid-stroke.
 *  - Stickers are drawn as text glyphs, so they need no image assets and stay
 *    offline-safe.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { popConfetti } from '../lib/celebrate.js'

const COLORS = [
  { name: 'ink', value: '#3a3129' },
  { name: 'leaf green', value: '#5fae68' },
  { name: 'blush pink', value: '#ff9aa8' },
  { name: 'sky blue', value: '#7cc4e8' },
  { name: 'honey yellow', value: '#ffc94d' },
  { name: 'grape purple', value: '#a98cf0' },
  { name: 'tangerine', value: '#ff9f45' },
]

const SIZES = [
  { label: 'Fine', value: 3 },
  { label: 'Medium', value: 8 },
  { label: 'Thick', value: 18 },
]

/** Stamps. Rendered as glyphs — no assets to load, works offline. */
const STICKERS = ['🌸', '⭐️', '🌈', '🦋', '🍓', '💛', '☁️', '🐣']

const PAPER = '#fffdfa'

export default function DoodlePad() {
  const reduceMotion = useReducedMotion()
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const drawingRef = useRef(false)
  const lastRef = useRef(null)

  const [color, setColor] = useState(COLORS[2].value)
  const [size, setSize] = useState(SIZES[1].value)
  const [sticker, setSticker] = useState(null)
  const [hasDrawn, setHasDrawn] = useState(false)

  /** Size the backing store to the CSS box * DPR, preserving what's already drawn. */
  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0) return

    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    const width = Math.round(rect.width * dpr)
    const height = Math.round(rect.height * dpr)
    if (canvas.width === width && canvas.height === height) return

    // Snapshot before the resize (which clears the canvas), then paint it back.
    const previous = canvas.width > 0 ? ctxRef.current?.getImageData(0, 0, canvas.width, canvas.height) : null

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, width, height)
    if (previous) ctx.putImageData(previous, 0, 0)
    // Work in CSS pixels from here on. setTransform (not scale) so repeated
    // resizes can't compound the scale factor.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctxRef.current = ctx
  }, [])

  useEffect(() => {
    resize()
    const observer = new ResizeObserver(resize)
    if (canvasRef.current) observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [resize])

  const pointFrom = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  /** Drop a sticker glyph centred on the tap, at a slight random tilt. */
  const stampSticker = (ctx, point) => {
    ctx.save()
    ctx.translate(point.x, point.y)
    ctx.rotate((Math.random() - 0.5) * 0.5)
    ctx.font = '44px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(sticker, 0, 0)
    ctx.restore()
  }

  const start = (event) => {
    const ctx = ctxRef.current
    if (!ctx) return

    const point = pointFrom(event)

    if (sticker) {
      // Sticker mode is tap-to-stamp; no dragging, so we don't capture the pointer.
      stampSticker(ctx, point)
      setHasDrawn(true)
      return
    }

    // Keep receiving moves even if the finger leaves the canvas.
    event.currentTarget.setPointerCapture?.(event.pointerId)
    drawingRef.current = true
    lastRef.current = point

    // A tap with no movement should still leave a dot.
    ctx.beginPath()
    ctx.fillStyle = color
    ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2)
    ctx.fill()
    setHasDrawn(true)
  }

  const move = (event) => {
    if (!drawingRef.current) return
    const ctx = ctxRef.current
    if (!ctx) return

    // getCoalescedEvents keeps fast strokes smooth on high-rate touch screens.
    const events = event.nativeEvent.getCoalescedEvents?.() ?? []
    const points = events.length > 0 ? events.map(pointFrom) : [pointFrom(event)]

    ctx.strokeStyle = color
    ctx.lineWidth = size
    ctx.beginPath()
    ctx.moveTo(lastRef.current.x, lastRef.current.y)
    for (const point of points) ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastRef.current = points[points.length - 1]
  }

  const end = () => {
    drawingRef.current = false
    lastRef.current = null
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    setHasDrawn(false)
  }

  const save = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'bloom-doodle.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
    popConfetti({ x: 0.5, y: 0.7 })
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft/80">No wrong marks</p>
        <motion.h2
          className="mt-1 font-display text-3xl font-extrabold text-ink"
          animate={reduceMotion ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          Scribble something
        </motion.h2>
      </header>

      <motion.div
        className="card-soft w-full overflow-hidden rounded-[2rem] p-2.5"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94, rotate: -1 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 20 }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          className="h-72 w-full touch-none rounded-[1.5rem] border-[3px] border-ink/15 bg-[#fffdfa] sm:h-80"
          style={{ cursor: sticker ? 'copy' : 'crosshair' }}
          role="img"
          aria-label="Drawing area. Use a finger, stylus or mouse to draw."
        />
      </motion.div>

      {/* Crayons — tilt and lift when selected. */}
      <div className="flex items-end justify-center gap-1.5" role="group" aria-label="Crayon colour">
        {COLORS.map((option) => {
          const active = !sticker && color === option.value
          return (
            <motion.button
              key={option.value}
              type="button"
              onClick={() => {
                setColor(option.value)
                setSticker(null)
              }}
              aria-label={`${option.name} crayon`}
              aria-pressed={active}
              className="relative block"
              animate={{ y: active ? -8 : 0, rotate: active ? -8 : 0 }}
              whileHover={reduceMotion ? undefined : { y: -5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              <svg viewBox="0 0 16 44" className="h-11 w-4" aria-hidden>
                {/* Crayon tip */}
                <path d="M8 1 L14 12 L2 12 Z" fill={option.value} stroke="#3a3129" strokeWidth="2" strokeLinejoin="round" />
                {/* Barrel */}
                <rect x="2" y="12" width="12" height="30" rx="3" fill={option.value} stroke="#3a3129" strokeWidth="2" />
                {/* Paper wrap */}
                <rect x="2" y="20" width="12" height="9" fill="#fff8ec" stroke="#3a3129" strokeWidth="2" />
              </svg>
            </motion.button>
          )
        })}
      </div>

      {/* Stickers */}
      <div className="flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label="Stickers">
        {STICKERS.map((glyph) => {
          const active = sticker === glyph
          return (
            <motion.button
              key={glyph}
              type="button"
              onClick={() => setSticker(active ? null : glyph)}
              aria-label={`Sticker ${glyph}`}
              aria-pressed={active}
              className={`flex h-10 w-10 items-center justify-center rounded-2xl border-[3px] border-ink text-xl ${
                active ? 'bg-honey' : 'bg-white/70'
              }`}
              style={{ boxShadow: active ? '0 0 0 0 var(--color-ink)' : '3px 3px 0 0 var(--color-ink)' }}
              animate={{ y: active ? 3 : 0, scale: active ? 1.08 : 1 }}
              whileTap={reduceMotion ? undefined : { scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              {glyph}
            </motion.button>
          )
        })}
      </div>

      <p className="text-xs font-semibold text-ink-soft/80" aria-live="polite">
        {sticker ? `Tap the paper to stamp ${sticker}` : 'Pick a crayon and draw'}
      </p>

      {/* Sizes + actions */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div
          className="flex gap-1 rounded-full border-[3px] border-ink bg-white/70 p-1"
          role="group"
          aria-label="Pen size"
        >
          {SIZES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSize(option.value)}
              aria-pressed={size === option.value}
              className={`rounded-full px-3.5 py-1 text-xs font-bold transition-colors ${
                size === option.value ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={clear}
          className="btn-toon rounded-full bg-white px-4 py-1.5 text-sm font-bold text-ink"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!hasDrawn}
          className="btn-toon rounded-full bg-sky px-4 py-1.5 text-sm font-bold text-white disabled:opacity-40"
        >
          Save it
        </button>
      </div>

      <p className="text-center text-xs text-ink-soft/70">
        This clears itself when you leave. That's on purpose.
      </p>
    </div>
  )
}
