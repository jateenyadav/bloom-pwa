/**
 * Time Capsule.
 *
 * Write a note to your future self, seal it for a week/month/season. It stays shut
 * until its date, then it's waiting for you.
 *
 * The lock is honest-but-not-cryptographic: the unlock date is checked against the
 * device clock, so someone determined could change their clock and peek. That's a
 * deliberate call — this is a gift to yourself, not a vault, and real encryption
 * would mean a key to lose and a backend to hold it. What matters is that it
 * genuinely can't be read by accident.
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useBloomStore } from '../store/useBloomStore.js'
import { popConfetti } from '../lib/celebrate.js'

const DURATIONS = [
  { label: 'A week', days: 7 },
  { label: 'A month', days: 30 },
  { label: 'A season', days: 90 },
]

/** Whole days from now until `iso`, rounded up. 0 means it's ready. */
function daysUntil(iso, now = Date.now()) {
  const ms = new Date(iso).getTime() - now
  return ms <= 0 ? 0 : Math.ceil(ms / 86400000)
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** A sealed envelope with a wax seal, or an open one. */
function Envelope({ open, className = '' }) {
  return (
    <svg viewBox="0 0 60 44" className={className} aria-hidden>
      <rect x="2" y="6" width="56" height="36" rx="5" fill="#fff6df" stroke="#3a3129" strokeWidth="3" />
      {open ? (
        // Flap thrown back over the top.
        <path d="M2 11 L30 2 L58 11" fill="#ffe9b8" stroke="#3a3129" strokeWidth="3" strokeLinejoin="round" />
      ) : (
        <>
          <path d="M2 9 L30 27 L58 9" fill="none" stroke="#3a3129" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="30" cy="25" r="7" fill="#ff9aa8" stroke="#3a3129" strokeWidth="2.6" />
          <path d="M27 25 h6" stroke="#3a3129" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

export default function TimeCapsule() {
  const reduceMotion = useReducedMotion()
  const capsules = useBloomStore((state) => state.capsules)
  const addCapsule = useBloomStore((state) => state.addCapsule)
  const openCapsule = useBloomStore((state) => state.openCapsule)
  const removeCapsule = useBloomStore((state) => state.removeCapsule)

  const [text, setText] = useState('')
  const [days, setDays] = useState(7)
  const [reading, setReading] = useState(null)
  const [justSealed, setJustSealed] = useState(false)

  // Read the clock once per render rather than per capsule, so a list of ten
  // can't disagree with itself about what "today" is.
  const now = Date.now()

  const { ready, sealed, opened } = useMemo(() => {
    const sorted = [...capsules].sort((a, b) => a.unlockAt.localeCompare(b.unlockAt))
    return {
      ready: sorted.filter((c) => !c.opened && daysUntil(c.unlockAt, now) === 0),
      sealed: sorted.filter((c) => !c.opened && daysUntil(c.unlockAt, now) > 0),
      opened: sorted.filter((c) => c.opened).reverse(),
    }
  }, [capsules, now])

  const seal = (event) => {
    event.preventDefault()
    if (!text.trim()) return
    addCapsule(text, days)
    setText('')
    setJustSealed(true)
    window.setTimeout(() => setJustSealed(false), 2600)
  }

  const open = (capsule) => {
    openCapsule(capsule.id)
    setReading(capsule)
    if (!reduceMotion) popConfetti({ particleCount: 40, spread: 70 })
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft/80">
          For you, later
        </p>
        <motion.h2
          className="mt-1 font-display text-3xl font-extrabold text-ink"
          animate={reduceMotion ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          Time capsule
        </motion.h2>
      </header>

      {/* ---- Ready to open ---- */}
      {ready.length > 0 && (
        <div className="flex flex-col gap-3">
          {ready.map((capsule) => (
            <motion.button
              key={capsule.id}
              type="button"
              onClick={() => open(capsule)}
              className="card-soft flex items-center gap-4 rounded-[1.5rem] bg-honey px-4 py-4 text-left"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
              animate={
                reduceMotion
                  ? { opacity: 1, scale: 1 }
                  : // A gentle wobble: this one wants to be noticed.
                    { opacity: 1, scale: 1, rotate: [-1.2, 1.2, -1.2] }
              }
              transition={{
                rotate: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
                default: { type: 'spring', stiffness: 260, damping: 20 },
              }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            >
              <Envelope open={false} className="h-11 w-14 shrink-0" />
              <span>
                <span className="block font-display text-lg font-extrabold text-ink">
                  One's ready for you!
                </span>
                <span className="block text-xs font-semibold text-ink/70">
                  Sealed {formatDate(capsule.createdAt)} · tap to open
                </span>
              </span>
            </motion.button>
          ))}
        </div>
      )}

      {/* ---- Still sealed ---- */}
      {sealed.length > 0 && (
        <div className="card-soft rounded-[1.5rem] bg-white/85 px-4 py-4">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-ink-soft/80">
            Sealed
          </p>
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {sealed.map((capsule) => {
              const left = daysUntil(capsule.unlockAt, now)
              return (
                <li key={capsule.id} className="flex items-center gap-3">
                  <Envelope open={false} className="h-8 w-10 shrink-0 opacity-70" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-sm font-bold text-ink">
                      Opens in {left} {left === 1 ? 'day' : 'days'}
                    </span>
                    <span className="block text-[0.7rem] font-semibold text-ink-soft/80">
                      {formatDate(capsule.unlockAt)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCapsule(capsule.id)}
                    aria-label="Throw this capsule away without reading it"
                    className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-ink-soft/70 hover:text-ink"
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* ---- Already read ---- */}
      {opened.length > 0 && (
        <div className="card-soft rounded-[1.5rem] bg-white/85 px-4 py-4">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-ink-soft/80">
            Opened
          </p>
          <ul className="mt-2.5 flex flex-col gap-2">
            {opened.map((capsule) => (
              <li key={capsule.id}>
                <button
                  type="button"
                  onClick={() => setReading(capsule)}
                  className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left hover:bg-cream-deep/60"
                >
                  <Envelope open className="h-7 w-9 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                    {capsule.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- Write a new one ---- */}
      <form onSubmit={seal} className="flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Dear me in a little while…"
          rows={3}
          maxLength={600}
          className="card-soft w-full resize-none rounded-2xl bg-white px-4 py-3 text-sm font-semibold leading-relaxed text-ink placeholder:font-normal placeholder:text-ink-soft/60 focus:outline-none"
        />
        <div className="flex gap-2">
          {DURATIONS.map((duration) => (
            <button
              key={duration.days}
              type="button"
              onClick={() => setDays(duration.days)}
              aria-pressed={days === duration.days}
              className={`btn-toon flex-1 rounded-full py-2 font-display text-xs font-extrabold text-ink ${
                days === duration.days ? 'bg-grape' : 'bg-white'
              }`}
            >
              {duration.label}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={!text.trim()}
          className="btn-toon w-full rounded-full bg-honey py-3 font-display text-base font-extrabold text-ink disabled:opacity-50"
        >
          {justSealed ? 'Sealed! 💌' : 'Seal it 💌'}
        </button>
      </form>

      <p className="text-center text-xs font-semibold leading-relaxed text-ink-soft/80">
        Sealed notes stay on this device. Nobody else can read them — including you,
        until the day comes.
      </p>

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
            aria-label="A note from your past self"
          >
            <motion.div
              className="card-soft w-full max-w-sm rounded-[2rem] bg-white px-6 py-7"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              onClick={(event) => event.stopPropagation()}
            >
              <Envelope open className="mx-auto h-12 w-16" />
              <p className="mt-2 text-center text-[0.7rem] font-bold uppercase tracking-[0.14em] text-ink-soft/70">
                Written {formatDate(reading.createdAt)}
              </p>
              <p className="mt-4 whitespace-pre-wrap font-display text-base font-bold leading-relaxed text-ink">
                {reading.text}
              </p>
              <button
                type="button"
                onClick={() => setReading(null)}
                className="btn-toon mt-6 w-full rounded-full bg-white py-2.5 font-display text-sm font-extrabold text-ink"
              >
                Keep it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
