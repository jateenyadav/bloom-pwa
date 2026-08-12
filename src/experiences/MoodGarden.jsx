/**
 * Mood Garden.
 *
 * Pick how today feels and a matching flower gets planted in a row. Over weeks the
 * row becomes a garden you can look back along.
 *
 * The deliberate design choice: there is no "good" or "bad" flower. A heavy day
 * plants a sleepy blue bloom, not a dead one — a mood tracker that visibly punishes
 * you for a rough day is worse than no mood tracker. One flower per day, and
 * changing your mind just replaces it.
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useBloomStore } from '../store/useBloomStore.js'
import { toDayKey } from '../engine/rotationEngine.js'

/**
 * The palette of moods. `petals`/`color` drive the drawing; nothing here ranks
 * them, and they're ordered bright-to-quiet rather than best-to-worst.
 */
export const MOODS = [
  { key: 'sunny', label: 'Sunny', emoji: '☀️', color: '#ffc94d', petals: 8, note: 'A good one. Worth noticing.' },
  { key: 'soft', label: 'Soft', emoji: '🌸', color: '#ff9aa8', petals: 6, note: 'Gentle counts too.' },
  { key: 'busy', label: 'Busy', emoji: '🌀', color: '#a98cf0', petals: 7, note: 'A lot of you went out today.' },
  { key: 'tired', label: 'Tired', emoji: '🌙', color: '#7cc4e8', petals: 5, note: 'Resting is doing something.' },
  { key: 'heavy', label: 'Heavy', emoji: '🌧️', color: '#8fa6b8', petals: 5, note: 'This one gets a flower too.' },
  { key: 'fizzy', label: 'Fizzy', emoji: '🫧', color: '#7fe0c4', petals: 9, note: 'Bottle some for later.' },
]

const byKey = Object.fromEntries(MOODS.map((mood) => [mood.key, mood]))

/** One flower on a stem. Height varies a little so the row isn't a picket fence. */
function Flower({ mood, index, reduceMotion, isToday }) {
  const spec = byKey[mood.mood] ?? MOODS[0]
  const stemHeight = 26 + ((index * 13) % 12)
  const petals = Array.from({ length: spec.petals })

  return (
    <motion.div
      className="relative flex shrink-0 flex-col items-center"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.6 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 240,
        damping: 16,
        delay: reduceMotion ? 0 : Math.min(index * 0.04, 0.5),
      }}
      title={`${spec.label} — ${mood.dayKey}`}
    >
      {/* Gentle sway, each flower slightly out of phase with its neighbours. */}
      <motion.svg
        viewBox="0 0 40 70"
        className="h-20 w-11"
        animate={reduceMotion ? undefined : { rotate: [-3.5, 3.5, -3.5] }}
        transition={{
          duration: 3.6 + (index % 5) * 0.35,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: (index % 7) * 0.2,
        }}
        style={{ transformOrigin: '20px 68px' }}
        aria-hidden
      >
        <path
          d={`M20 68 Q${16 + (index % 3) * 3} ${68 - stemHeight / 2} 20 ${68 - stemHeight}`}
          stroke="#3f8a53"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="27" cy={68 - stemHeight * 0.55} rx="6" ry="3" fill="#5fae68" stroke="#3a3129" strokeWidth="1.8" transform={`rotate(-24 27 ${68 - stemHeight * 0.55})`} />

        <g transform={`translate(20 ${68 - stemHeight - 8})`}>
          {petals.map((_, i) => {
            const angle = (360 / petals.length) * i
            return (
              <ellipse
                key={i}
                cx="0"
                cy="-8"
                rx="4.2"
                ry="7"
                fill={spec.color}
                stroke="#3a3129"
                strokeWidth="1.8"
                transform={`rotate(${angle})`}
              />
            )
          })}
          <circle cx="0" cy="0" r="4.6" fill="#fff6df" stroke="#3a3129" strokeWidth="1.8" />
        </g>
      </motion.svg>

      {isToday && (
        <motion.span
          className="absolute -top-1 text-xs"
          animate={reduceMotion ? undefined : { y: [0, -3, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          ✨
        </motion.span>
      )}
    </motion.div>
  )
}

export default function MoodGarden() {
  const reduceMotion = useReducedMotion()
  const moods = useBloomStore((state) => state.moods)
  const setMood = useBloomStore((state) => state.setMood)

  const todayKey = toDayKey(new Date())
  const today = moods.find((entry) => entry.dayKey === todayKey) ?? null
  const [justPlanted, setJustPlanted] = useState(false)

  // Oldest first, and capped — a year of flowers is a long scroll but hundreds of
  // animating SVGs is a frame-rate problem, so show the most recent 90.
  const garden = useMemo(
    () => [...moods].sort((a, b) => a.dayKey.localeCompare(b.dayKey)).slice(-90),
    [moods]
  )

  const pick = (key) => {
    setMood(key)
    setJustPlanted(true)
    window.setTimeout(() => setJustPlanted(false), 2400)
  }

  const chosen = today ? byKey[today.mood] : null

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft/80">
          However today actually is
        </p>
        <motion.h2
          className="mt-1 font-display text-3xl font-extrabold text-ink"
          animate={reduceMotion ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          Mood garden
        </motion.h2>
      </header>

      {/* ---- The garden strip ---- */}
      <div className="card-soft relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-sky/25 to-leaf/25 pt-4">
        {garden.length === 0 ? (
          <p className="px-6 pb-10 pt-6 text-center text-sm font-semibold leading-relaxed text-ink-soft">
            Nothing planted yet. Pick how today feels and the first flower goes in.
          </p>
        ) : (
          <div className="no-scrollbar flex items-end gap-1 overflow-x-auto px-4 pb-2">
            {garden.map((entry, index) => (
              <Flower
                key={entry.id}
                mood={entry}
                index={index}
                reduceMotion={reduceMotion}
                isToday={entry.dayKey === todayKey}
              />
            ))}
          </div>
        )}
        {/* Soil line, so the flowers are planted in something. */}
        <div className="h-5 border-t-[3px] border-ink bg-[#8a6a4a]" aria-hidden />
      </div>

      {garden.length > 0 && (
        <p className="text-center text-xs font-semibold text-ink-soft/80">
          {moods.length} {moods.length === 1 ? 'day' : 'days'} planted · scroll back through them
        </p>
      )}

      {/* ---- Today's picker ---- */}
      <div className="grid grid-cols-3 gap-2.5">
        {MOODS.map((mood) => {
          const active = today?.mood === mood.key
          return (
            <motion.button
              key={mood.key}
              type="button"
              onClick={() => pick(mood.key)}
              aria-pressed={active}
              className={`btn-toon flex flex-col items-center gap-1 rounded-2xl px-2 py-3 font-display text-xs font-extrabold text-ink ${
                active ? 'bg-honey' : 'bg-white'
              }`}
              whileHover={reduceMotion ? undefined : { y: -3 }}
              whileTap={reduceMotion ? undefined : { scale: 0.95 }}
            >
              <span className="text-2xl" aria-hidden>
                {mood.emoji}
              </span>
              {mood.label}
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={chosen?.key ?? 'none'}
          className="min-h-[2.5rem] text-center text-sm font-semibold leading-relaxed text-ink-soft"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {chosen
            ? justPlanted
              ? `Planted. ${chosen.note}`
              : `Today is ${chosen.label.toLowerCase()}. ${chosen.note} You can change it.`
            : 'No wrong answer here — every mood gets a flower.'}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
