/**
 * The Calm Toolkit: a full-screen overlay holding the breathing and grounding
 * exercises, plus the floating button that opens it.
 *
 * Requirement: reachable in one tap from anywhere, no matter what's on screen.
 * That's enforced by rendering <CalmToolkit /> once at the App root (never inside
 * an experience), and by the layer scale in src/constants/layers.js — the trigger
 * (50) outranks any overlay an experience may open (40), and this overlay (60)
 * covers birthday confetti and everything else.
 */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import BreathingExercise from './BreathingExercise.jsx'
import GroundingExercise from './GroundingExercise.jsx'

const TOOLS = [
  { key: 'breathe', label: 'Breathe' },
  { key: 'ground', label: 'Ground me' },
]

/** The trigger's face: a small outlined leaf pair with a happy expression. */
function CalmLeafFace() {
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden>
      {/* Back leaf */}
      <ellipse
        cx="27"
        cy="15"
        rx="9"
        ry="6"
        fill="#7fd68a"
        stroke="#3a3129"
        strokeWidth="2.6"
        transform="rotate(-35 27 15)"
      />
      {/* Front leaf with the face */}
      <ellipse
        cx="17"
        cy="20"
        rx="12"
        ry="9"
        fill="#5fae68"
        stroke="#3a3129"
        strokeWidth="2.6"
        transform="rotate(-14 17 20)"
      />
      <circle cx="13" cy="18" r="1.8" fill="#3a3129" />
      <circle cx="21" cy="17" r="1.8" fill="#3a3129" />
      <path d="M13.5 22.5 q4 3.5 8 -0.5" stroke="#3a3129" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Stem */}
      <path d="M6 31 q4 -5 9 -8" stroke="#3f8a53" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export default function CalmToolkit() {
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [tool, setTool] = useState('breathe')

  // Escape closes; body scroll locks while open.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <>
      {/*
       * Floating trigger — z-50, fixed, above every screen in the app.
       *
       * Deliberately a plain <button> with a STATIONARY hit box. The "breathe with
       * me" pulse is a decorative ring rendered inside it, never a transform on the
       * button: this is the one control the spec requires to be hittable in one tap
       * from anywhere, and a target that never stops moving is a worse target.
       */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open the calm toolkit: breathing and grounding exercises"
        /* z = LAYER.CALM_TRIGGER */
        className="btn-toon fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-mint"
        style={{
          // Sit above the iOS home indicator when installed.
          bottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
          right: 'calc(1.25rem + env(safe-area-inset-right))',
        }}
      >
        {!reduceMotion && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border-[3px] border-mint"
            animate={{ scale: [1, 1.45], opacity: [0.75, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <CalmLeafFace />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            /* z = LAYER.CALM_OVERLAY — above every other layer in the app. */
            className="fixed inset-0 z-[60] flex flex-col backdrop-blur-md"
            style={{
              // A soft cartoon sky wash, opaque enough to hide the busy world behind
              // it — this screen should feel like stepping out of the app, not onto
              // another layer of it.
              background:
                'linear-gradient(to bottom, rgb(234 246 251 / 0.97), rgb(253 246 236 / 0.97))',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3 }}
            role="dialog"
            aria-modal="true"
            aria-label="Calm toolkit"
          >
            {/* Very slow drifting clouds, so the screen isn't an empty field. Purely
                decorative and deliberately much slower than anything in the app. */}
            {!reduceMotion && (
              <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                {[
                  { top: '14%', scale: 1, duration: 90, delay: 0, opacity: 0.5 },
                  { top: '62%', scale: 0.7, duration: 120, delay: 12, opacity: 0.4 },
                  { top: '84%', scale: 1.2, duration: 150, delay: 30, opacity: 0.35 },
                ].map((cloud, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    style={{ top: cloud.top, opacity: cloud.opacity, scale: cloud.scale }}
                    initial={{ x: '-30vw' }}
                    animate={{ x: '110vw' }}
                    transition={{
                      duration: cloud.duration,
                      delay: cloud.delay,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  >
                    <svg viewBox="-40 -30 80 46" className="h-16 w-28">
                      <path
                        d="M-34 12 a13 13 0 0 1 1 -25 a17 17 0 0 1 22 -13 a15 15 0 0 1 26 4 a14 14 0 0 1 21 15 a12 12 0 0 1 -6 19 Z"
                        fill="white"
                        stroke="#3a3129"
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                ))}
              </div>
            )}

            <div
              className="relative flex items-center justify-between px-4 pt-5"
              style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
            >
              <div className="flex gap-1 rounded-full border-[3px] border-ink bg-white/80 p-1">
                {TOOLS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTool(item.key)}
                    aria-pressed={tool === item.key}
                    className={`relative rounded-full px-4 py-1.5 font-display text-sm font-extrabold transition-colors ${
                      tool === item.key ? 'text-ink' : 'text-ink-soft/80 hover:text-ink'
                    }`}
                  >
                    {tool === item.key && (
                      <motion.span
                        layoutId="calm-tab"
                        className="absolute inset-0 rounded-full border-[2.5px] border-ink bg-honey"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        aria-hidden
                      />
                    )}
                    <span className="relative">{item.label}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close the calm toolkit"
                className="btn-toon flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="relative flex flex-1 items-center justify-center overflow-y-auto px-6 py-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tool}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -18, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  className="w-full max-w-md"
                >
                  {tool === 'breathe' ? <BreathingExercise /> : <GroundingExercise />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
