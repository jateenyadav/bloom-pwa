/**
 * Gratitude Prompt.
 *
 * A gentle question, a text box, saved locally — visualised as a cartoon jar that
 * physically fills with little stars as the collection grows. Watching the jar fill
 * is the reward for writing; there is no streak and no target.
 * The prompt is chosen from config.gratitudePrompts and is stable for the session.
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { config } from '../config/index.js'
import { useBloomStore } from '../store/useBloomStore.js'
import { popConfetti } from '../lib/celebrate.js'

function formatDay(dayKey) {
  // dayKey is "YYYY-MM-DD"; parse as local parts to avoid a UTC shift.
  const [y, m, d] = dayKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const JAR_COLORS = ['#ff9aa8', '#ffc94d', '#7cc4e8', '#a98cf0', '#7fe0c4', '#ff7fbf']

/**
 * A jar holding one star per saved entry.
 *
 * Star positions are derived from the index (not Math.random) so a given entry
 * keeps its place in the jar across re-renders instead of jumping around.
 */
function GratitudeJar({ count, reduceMotion }) {
  const stars = Array.from({ length: Math.min(count, 24) }).map((_, i) => ({
    // Two columns of stagger, packed bottom-up.
    x: 22 + ((i * 37) % 56),
    y: 88 - Math.floor(i / 4) * 13 - (i % 2) * 4,
    color: JAR_COLORS[i % JAR_COLORS.length],
    rotate: ((i * 47) % 60) - 30,
  }))

  return (
    <svg viewBox="0 0 100 110" className="h-32 w-28" aria-hidden>
      {/* Lid */}
      <rect x="26" y="10" width="48" height="12" rx="5" fill="#ffc94d" stroke="#3a3129" strokeWidth="3" />
      {/* Body */}
      <path
        d="M22 24 Q18 34 18 52 L18 88 Q18 98 30 98 L70 98 Q82 98 82 88 L82 52 Q82 34 78 24 Z"
        fill="#eaf6fb"
        stroke="#3a3129"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Glass highlight */}
      <path d="M28 34 Q26 50 26 82" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.8" />

      {stars.map((star, i) => (
        <motion.g
          key={i}
          initial={reduceMotion ? false : { y: -30, opacity: 0, scale: 0.4 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: Math.min(i * 0.04, 0.6) }}
        >
          <motion.path
            d="M0 -5 L1.5 -1.5 L5 0 L1.5 1.5 L0 5 L-1.5 1.5 L-5 0 L-1.5 -1.5 Z"
            fill={star.color}
            stroke="#3a3129"
            strokeWidth="1.2"
            transform={`translate(${star.x} ${star.y}) rotate(${star.rotate})`}
            animate={reduceMotion ? undefined : { opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 2 + (i % 4) * 0.5, repeat: Infinity, delay: i * 0.15 }}
          />
        </motion.g>
      ))}

      {count > 24 && (
        <text x="50" y="108" textAnchor="middle" className="fill-ink" fontSize="9" fontWeight="700">
          +{count - 24} more
        </text>
      )}
    </svg>
  )
}

export default function GratitudePrompt() {
  const reduceMotion = useReducedMotion()
  const entries = useBloomStore((state) => state.gratitude)
  const addGratitude = useBloomStore((state) => state.addGratitude)
  const removeGratitude = useBloomStore((state) => state.removeGratitude)

  const prompts = config.gratitudePrompts?.length
    ? config.gratitudePrompts
    : ['What made you smile today?']

  // One prompt per visit, picked once.
  const prompt = useMemo(() => prompts[Math.floor(Math.random() * prompts.length)], [prompts])

  const [text, setText] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const [showCollection, setShowCollection] = useState(false)

  const save = (event) => {
    event.preventDefault()
    if (!text.trim()) return
    addGratitude(text, prompt)
    setText('')
    setJustSaved(true)
    popConfetti({ x: 0.5, y: 0.4 })
    window.setTimeout(() => setJustSaved(false), 2600)
  }

  const recent = [...entries].reverse()

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <header className="flex flex-col items-center text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft/80">One small thing</p>

        <motion.div
          animate={reduceMotion ? undefined : { rotate: [-2.5, 2.5, -2.5], y: [0, -3, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <GratitudeJar count={entries.length} reduceMotion={reduceMotion} />
        </motion.div>

        <h2 className="mt-1 max-w-sm font-display text-2xl font-extrabold leading-snug text-ink">
          {prompt}
        </h2>
      </header>

      <form onSubmit={save} className="w-full">
        <label htmlFor="gratitude-input" className="sr-only">
          {prompt}
        </label>
        <motion.textarea
          id="gratitude-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          placeholder="However small. It doesn't have to be profound."
          className="card-soft w-full resize-none rounded-3xl px-5 py-4 text-base leading-relaxed text-ink placeholder:text-ink-soft/50 focus:outline-none"
          whileFocus={reduceMotion ? undefined : { scale: 1.015, rotate: -0.4 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <AnimatePresence mode="wait">
            {justSaved ? (
              <motion.span
                key="saved"
                className="text-sm font-bold text-leaf-deep"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                aria-live="polite"
              >
                Into the jar it goes! 🫙
              </motion.span>
            ) : (
              <motion.span
                key="count"
                className="text-sm font-semibold text-ink-soft"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {entries.length === 0
                  ? 'Jar is empty — for now.'
                  : `${entries.length} in the jar so far.`}
              </motion.span>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={!text.trim()}
            className="btn-toon shrink-0 rounded-full bg-leaf px-6 py-2.5 font-display text-base font-extrabold text-white disabled:opacity-40"
            whileHover={reduceMotion || !text.trim() ? undefined : { scale: 1.05, rotate: 1.5 }}
          >
            Keep it
          </motion.button>
        </div>
      </form>

      {entries.length > 0 && (
        <div className="w-full">
          <button
            type="button"
            onClick={() => setShowCollection((value) => !value)}
            aria-expanded={showCollection}
            className="mx-auto flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-ink-soft transition-colors hover:text-ink"
          >
            {showCollection ? 'Hide' : 'See'} your collection
            <motion.svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              animate={{ rotate: showCollection ? 180 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.25 }}
              aria-hidden
            >
              <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            </motion.svg>
          </button>

          <AnimatePresence initial={false}>
            {showCollection && (
              <motion.ul
                className="mt-3 flex max-h-72 flex-col gap-3 overflow-y-auto px-1 pb-2 pt-1"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.3 }}
              >
                {recent.map((entry, i) => (
                  <motion.li
                    key={entry.id}
                    /* Alternating tilt so the list reads as stuck-on notes. */
                    className="card-soft group flex items-start gap-3 rounded-2xl px-4 py-3"
                    style={{ rotate: `${i % 2 === 0 ? -0.7 : 0.7}deg` }}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 22,
                      delay: reduceMotion ? 0 : Math.min(i * 0.05, 0.4),
                    }}
                  >
                    <span
                      className="mt-0.5 h-3 w-3 shrink-0 rounded-full border-2 border-ink"
                      style={{ backgroundColor: JAR_COLORS[i % JAR_COLORS.length] }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-relaxed text-ink">{entry.text}</p>
                      <p className="mt-1 text-xs font-semibold text-ink-soft/80">{formatDay(entry.dayKey)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGratitude(entry.id)}
                      aria-label={`Remove entry: ${entry.text.slice(0, 40)}`}
                      className="shrink-0 rounded-full p-1.5 text-ink-soft/50 transition-colors hover:bg-ink/5 hover:text-ink"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                      </svg>
                    </button>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
