/**
 * Sprout — the companion character.
 *
 * A cartoon sprout with a face: it blinks, breathes, sways, wiggles when tapped,
 * and says something friendly. It grows a little on each distinct day the app is
 * opened.
 *
 * Design rules, deliberately enforced here:
 *  - growth only ever increases; skipping days does nothing at all
 *  - no streak counter, no "you missed N days", no pressure copy anywhere
 *  - every line it says is warm regardless of how long you've been away
 *
 * Growth maps to height/leaf-count through a log curve, so early days feel
 * rewarding and it never outgrows its container.
 */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useBloomStore, selectDaysOpened } from '../store/useBloomStore.js'

/** 0 → 1 progress along the sprout's visual growth. Slow, never-ending curve. */
export function growthProgress(growth) {
  return Math.min(1, Math.log1p(Math.max(0, growth)) / Math.log1p(60))
}

/**
 * Extra alternating leaves below the head, on top of the two arm leaves that are
 * always present. 0-3 in Phase 1.
 */
function extraLeaves(progress) {
  return Math.min(3, Math.floor(progress * 4))
}

/**
 * Things Sprout says when poked. Never guilt-y, never about absence.
 *
 * `{name}` is substituted with today's pet name where one is available, so Sprout
 * uses the same nickname the header greeted them with.
 */
const POKE_LINES = [
  'hi hi hi!',
  'boop!',
  "you're here, {name}!",
  'i grew a bit!',
  'hehe',
  'nice to see you, {name}',
  '*happy leaf rustle*',
  'i saved you a sunbeam',
  'missed you, {name}',
]

export default function Companion({ className = '', petName = null }) {
  const reduceMotion = useReducedMotion()
  const growth = useBloomStore((state) => state.growth)
  const days = useBloomStore(selectDaysOpened)

  const progress = growthProgress(growth)
  const stemTop = 62 - progress * 20 // head y within the 120-unit viewBox
  const extras = extraLeaves(progress)
  const armScale = 0.85 + progress * 0.3

  const [poke, setPoke] = useState(null)
  const [wiggle, setWiggle] = useState(0)
  // Blink is driven by state (not a keyframe loop) so the timing feels irregular.
  const [blinking, setBlinking] = useState(false)

  useEffect(() => {
    if (reduceMotion) return
    let timeout
    const scheduleBlink = () => {
      // Irregular gaps read as alive; a fixed interval reads as a machine.
      timeout = window.setTimeout(() => {
        setBlinking(true)
        window.setTimeout(() => setBlinking(false), 130)
        scheduleBlink()
      }, 2200 + Math.random() * 3800)
    }
    scheduleBlink()
    return () => window.clearTimeout(timeout)
  }, [reduceMotion])

  // With no pet name configured (a config with an empty petNames list), the lines
  // that address someone by name are simply taken out of the running rather than
  // patched — safer than string surgery, which would leave dangling commas.
  const lines = useMemo(
    () => (petName ? POKE_LINES : POKE_LINES.filter((line) => !line.includes('{name}'))),
    [petName]
  )

  const onPoke = () => {
    const line = lines[Math.floor(Math.random() * lines.length)]
    setPoke(petName ? line.replace('{name}', petName) : line)
    setWiggle((n) => n + 1)
    window.setTimeout(() => setPoke(null), 1900)
  }

  const label = useMemo(
    () => `Sprout, your companion, grown over ${days} ${days === 1 ? 'day' : 'days'}. Tap to say hello.`,
    [days]
  )

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        {/* Speech bubble */}
        <AnimatePresence>
          {poke && (
            <motion.div
              className="absolute -top-1 left-1/2 z-10 whitespace-nowrap rounded-2xl border-[3px] border-ink bg-white px-3 py-1.5 font-display text-sm text-ink"
              style={{ boxShadow: '3px 4px 0 0 var(--color-ink)' }}
              initial={reduceMotion ? { opacity: 0, x: '-50%' } : { opacity: 0, scale: 0.5, x: '-50%', y: 10 }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: 0 }}
              exit={reduceMotion ? { opacity: 0, x: '-50%' } : { opacity: 0, scale: 0.6, x: '-50%', y: -8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            >
              {poke}
              {/* Bubble tail */}
              <span
                className="absolute -bottom-[9px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-[3px] border-r-[3px] border-ink bg-white"
                aria-hidden
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={onPoke}
          aria-label={label}
          className="block rounded-full"
          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        >
          <motion.svg
            viewBox="0 0 100 120"
            className="h-32 w-28"
            // Whole-body wiggle on poke, plus a constant gentle breath.
            key={`wiggle-${wiggle}`}
            animate={
              reduceMotion
                ? undefined
                : wiggle > 0
                  ? { rotate: [0, -7, 6, -4, 2, 0], scale: [1, 1.06, 1] }
                  : { scale: [1, 1.015, 1] }
            }
            transition={
              wiggle > 0
                ? { duration: 0.7, ease: 'easeOut' }
                : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }
            }
            style={{ transformOrigin: '50px 105px' }}
          >
            {/* ---- Pot ---- */}
            <ellipse cx="50" cy="112" rx="21" ry="4" fill="#3a3129" opacity="0.18" />
            <path
              d="M31 96 L69 96 L64 114 Q50 118 36 114 Z"
              fill="#e8956b"
              stroke="#3a3129"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <rect x="27" y="88" width="46" height="10" rx="4" fill="#f2a97e" stroke="#3a3129" strokeWidth="3" />
            {/* Soil */}
            <path d="M30 90 Q50 85 70 90 L70 92 Q50 88 30 92 Z" fill="#6b4f3a" />

            {/* ---- Stem ---- */}
            <motion.path
              d={`M50 90 Q46 ${(90 + stemTop) / 2} 50 ${stemTop + 12}`}
              stroke="#3f8a53"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              initial={false}
              animate={{ d: `M50 90 Q46 ${(90 + stemTop) / 2} 50 ${stemTop + 12}` }}
              transition={{ duration: reduceMotion ? 0 : 1.2, ease: 'easeOut' }}
            />

            {/* ---- Extra leaves down the stem ---- */}
            {Array.from({ length: extras }).map((_, i) => {
              const y = stemTop + 22 + (i * (88 - stemTop - 24)) / Math.max(1, extras)
              const flip = i % 2 === 0 ? -1 : 1
              const s = 0.6 + progress * 0.3
              const cx = 50 + flip * 12 * s
              return (
                <motion.ellipse
                  key={`leaf-${i}`}
                  cx={cx}
                  cy={y}
                  rx={13 * s}
                  ry={6 * s}
                  fill="#5fae68"
                  stroke="#3a3129"
                  strokeWidth={2.6 / s}
                  transform={`rotate(${flip * -22} ${cx} ${y})`}
                  initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 14, delay: reduceMotion ? 0 : 0.4 + i * 0.15 }}
                  style={{ transformOrigin: `${cx}px ${y}px` }}
                />
              )
            })}

            {/* ---- Arm leaves, always present, waving ---- */}
            {[1, -1].map((flip) => {
              const cx = 50 + flip * 15 * armScale
              const cy = stemTop + 14
              return (
                <motion.ellipse
                  key={`arm-${flip}`}
                  cx={cx}
                  cy={cy}
                  rx={15 * armScale}
                  ry={6.5 * armScale}
                  fill="#5fae68"
                  stroke="#3a3129"
                  strokeWidth={2.8 / armScale}
                  transform={`rotate(${flip * -26} ${cx} ${cy})`}
                  animate={reduceMotion ? undefined : { rotate: [0, flip * 9, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: flip > 0 ? 0 : 0.5 }}
                  style={{ transformOrigin: `50px ${cy}px` }}
                />
              )
            })}

            {/* ---- Head ---- */}
            <motion.g
              animate={reduceMotion ? undefined : { rotate: [-3, 3, -3] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: `50px ${stemTop + 12}px` }}
            >
              <circle cx="50" cy={stemTop} r="17" fill="#7fd68a" stroke="#3a3129" strokeWidth="3" />
              {/* Cheeks */}
              <ellipse cx="39" cy={stemTop + 5} rx="4" ry="2.6" fill="#ff9aa8" opacity="0.85" />
              <ellipse cx="61" cy={stemTop + 5} rx="4" ry="2.6" fill="#ff9aa8" opacity="0.85" />

              {/* Eyes — squeeze shut on blink */}
              {blinking ? (
                <>
                  <path d={`M40 ${stemTop - 2} q4 3 8 0`} stroke="#3a3129" strokeWidth="2.6" fill="none" strokeLinecap="round" />
                  <path d={`M52 ${stemTop - 2} q4 3 8 0`} stroke="#3a3129" strokeWidth="2.6" fill="none" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <circle cx="44" cy={stemTop - 2} r="3.2" fill="#3a3129" />
                  <circle cx="56" cy={stemTop - 2} r="3.2" fill="#3a3129" />
                  {/* Catchlights — the thing that makes eyes look alive */}
                  <circle cx="45.2" cy={stemTop - 3.4} r="1.1" fill="white" />
                  <circle cx="57.2" cy={stemTop - 3.4} r="1.1" fill="white" />
                </>
              )}

              {/* Smile */}
              <path
                d={`M44 ${stemTop + 6} q6 5 12 0`}
                stroke="#3a3129"
                strokeWidth="2.6"
                fill="none"
                strokeLinecap="round"
              />

              {/* Sprout tuft on top */}
              <path
                d={`M50 ${stemTop - 17} q1 -8 7 -10 q-1 8 -7 10`}
                fill="#5fae68"
                stroke="#3a3129"
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
            </motion.g>

            {/* Flower crown once it's had a while to grow */}
            {progress > 0.5 && (
              <motion.g
                initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.6 }}
                style={{ transformOrigin: `50px ${stemTop - 14}px` }}
              >
                {[-1, 0, 1].map((offset) => (
                  <circle
                    key={offset}
                    cx={50 + offset * 11}
                    cy={stemTop - 15 + Math.abs(offset) * 3}
                    r="3.6"
                    fill={offset === 0 ? '#ffc94d' : '#ff7fbf'}
                    stroke="#3a3129"
                    strokeWidth="2"
                  />
                ))}
              </motion.g>
            )}
          </motion.svg>
        </motion.button>
      </div>

      {/* Copy is descriptive, never evaluative. */}
      <p className="mt-0.5 text-center text-xs font-semibold text-ink-soft/90">
        {days <= 1 ? 'Just planted!' : `Grown a little over ${days} days`}
      </p>
    </div>
  )
}
