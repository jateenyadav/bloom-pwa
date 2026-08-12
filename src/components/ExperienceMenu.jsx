/**
 * The experience menu.
 *
 * A floating button that opens a drawer of every experience in the pool, each tile
 * showing what it is and what you have saved in it. Tapping one jumps straight to it.
 *
 * Two things worth knowing about the design:
 *
 *  - The tiles are generated from `experiencePool`, including the "you have N of
 *    these" line, via each entry's optional `saves` descriptor. Adding an experience
 *    stays a one-line change to the registry — the menu never needs editing.
 *  - It sits at z-45: above anything an experience can open, but deliberately BELOW
 *    the calm trigger at z-50. With the menu wide open the calm button is still on
 *    top of it and still one tap away, which is the app's one hard guarantee.
 */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { experiencePool } from '../experiences/index.js'
import { useBloomStore } from '../store/useBloomStore.js'
import { listPhotos, formatBytes } from '../lib/photoStore.js'
import { savedLabel, savedSummary } from '../lib/savedSummary.js'

function Tile({ experience, index, saved, isCurrent, onPick, reduceMotion }) {
  return (
    <motion.button
      type="button"
      onClick={() => onPick(experience.id)}
      className={`card-soft relative flex flex-col items-start gap-1 rounded-2xl px-3.5 py-3.5 text-left ${
        isCurrent ? 'bg-honey' : 'bg-white'
      }`}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 320,
        damping: 22,
        // Staggered so the grid cascades in rather than appearing all at once.
        delay: reduceMotion ? 0 : 0.04 + index * 0.028,
      }}
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.03 }}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
    >
      <motion.span
        className="text-3xl"
        aria-hidden
        // Each glyph bobs on its own cycle, so the grid feels alive but not frantic.
        animate={reduceMotion ? undefined : { y: [0, -4, 0], rotate: [-5, 5, -5] }}
        transition={{
          duration: 3 + (index % 5) * 0.4,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: (index % 6) * 0.25,
        }}
      >
        {experience.glyph ?? '✨'}
      </motion.span>

      <span className="font-display text-sm font-extrabold leading-tight text-ink">
        {experience.title}
      </span>
      <span className="text-[0.68rem] font-semibold leading-snug text-ink-soft/85">
        {experience.blurb}
      </span>

      {saved && (
        <span className="mt-0.5 rounded-full border-2 border-ink/15 bg-cream-deep/70 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-ink-soft">
          {saved}
        </span>
      )}

      {isCurrent && (
        <span className="absolute right-2.5 top-2.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-ink/60">
          today
        </span>
      )}
    </motion.button>
  )
}

export default function ExperienceMenu({ currentId, onPick }) {
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [photoCount, setPhotoCount] = useState(0)
  const [photoBytes, setPhotoBytes] = useState(0)

  // Subscribe to the whole state: the tiles' counts read many keys, and a menu
  // that opens once in a while isn't worth twelve separate selectors.
  const state = useBloomStore()

  // Photos live in IndexedDB, so their count can't come from the store. Read it
  // when the menu opens rather than on mount — no reason to touch the database on
  // every app load for a number nobody is looking at yet.
  useEffect(() => {
    if (!open) return
    let alive = true
    listPhotos()
      .then((photos) => {
        if (!alive) return
        setPhotoCount(photos.length)
        setPhotoBytes(photos.reduce((total, p) => total + (p.blob?.size ?? 0), 0))
      })
      // A browser that blocks IndexedDB just shows no photo count.
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [open])

  // Escape closes; body scroll locks while open. Same contract as the calm toolkit.
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

  const pick = (id) => {
    onPick(id)
    setOpen(false)
  }

  // Derived from the pool, not hand-listed: an experience that remembers something
  // has to appear here on its own, or this panel quietly under-reports.
  const summary = savedSummary(experiencePool, state, photoCount)

  return (
    <>
      {/*
       * The trigger. A plain <button> with a stationary hit box — same reasoning as
       * the calm button: the wiggle is on the icon inside, never on the target.
       *
       * Bottom-LEFT on purpose. The calm button owns bottom-right and must never
       * have to share space with anything.
       */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open the menu of all the things to do"
        aria-expanded={open}
        /* z = LAYER.MENU */
        className="btn-toon fixed bottom-5 left-5 z-[45] flex h-16 w-16 items-center justify-center rounded-full bg-grape"
        style={{
          bottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
          left: 'calc(1.25rem + env(safe-area-inset-left))',
        }}
      >
        <motion.svg
          viewBox="0 0 24 24"
          className="h-8 w-8"
          animate={reduceMotion || open ? undefined : { rotate: [-6, 6, -6] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          {/* Four little windows — reads as "all the things" rather than "settings". */}
          <rect x="3" y="3" width="7.5" height="7.5" rx="2.4" fill="#fff6df" stroke="#3a3129" strokeWidth="2.2" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="2.4" fill="#ffc94d" stroke="#3a3129" strokeWidth="2.2" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="2.4" fill="#7fe0c4" stroke="#3a3129" strokeWidth="2.2" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.4" fill="#ff9aa8" stroke="#3a3129" strokeWidth="2.2" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Scrim */}
            <motion.button
              type="button"
              aria-label="Close the menu"
              /* z = LAYER.MENU */
              className="fixed inset-0 z-[45] bg-ink/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.25 }}
              onClick={() => setOpen(false)}
            />

            {/* The drawer, rising from the bottom. */}
            <motion.div
              /* z = LAYER.MENU — still below CALM_TRIGGER (50) by design. */
              className="fixed inset-x-0 bottom-0 z-[45] flex max-h-[88vh] flex-col rounded-t-[2rem] border-[3px] border-ink bg-cream"
              initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
              animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 320, damping: 32 }
              }
              role="dialog"
              aria-modal="true"
              aria-label="All the things to do"
            >
              {/* Grab handle */}
              <div className="flex justify-center pt-3" aria-hidden>
                <span className="h-1.5 w-12 rounded-full bg-ink/25" />
              </div>

              <div className="flex items-start justify-between gap-3 px-5 pt-3">
                <div>
                  <motion.h2
                    className="font-display text-2xl font-extrabold text-ink"
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 }}
                  >
                    Everything in here
                  </motion.h2>
                  <p className="mt-0.5 text-xs font-semibold text-ink-soft">
                    {experiencePool.length} things · pick any one
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close the menu"
                  className="btn-toon flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* The grid. Scrolls if it overflows; pb leaves room for the two
                  floating buttons that sit over this drawer. */}
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  {experiencePool.map((experience, index) => (
                    <Tile
                      key={experience.id}
                      experience={experience}
                      index={index}
                      saved={savedLabel(experience, state, photoCount)}
                      isCurrent={experience.id === currentId}
                      onPick={pick}
                      reduceMotion={reduceMotion}
                    />
                  ))}
                </div>

                {/* What's stored on this device, in one honest paragraph. */}
                <motion.div
                  className="mt-5 rounded-2xl border-[2.5px] border-ink/15 bg-white/70 px-4 py-3.5"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduceMotion ? 0 : 0.42 }}
                >
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-ink-soft/80">
                    Saved on this device
                  </p>
                  <p className="mt-1.5 text-xs font-semibold leading-relaxed text-ink-soft">
                    {summary.length === 0 ? (
                      'Nothing saved yet. Anything you write or add lives only here.'
                    ) : (
                      <>
                        {summary.map((part) => (
                          <span key={part.key}>
                            {part.text}
                            {/* Photos are the one thing worth showing a size for. */}
                            {part.key === 'photos' && ` (${formatBytes(photoBytes)})`}
                            {' · '}
                          </span>
                        ))}
                        <span className="whitespace-nowrap">nothing is uploaded anywhere.</span>
                      </>
                    )}
                  </p>
                  <p className="mt-1.5 text-[0.68rem] font-semibold leading-relaxed text-ink-soft/70">
                    Opened on {state.openDays.length}{' '}
                    {state.openDays.length === 1 ? 'day' : 'different days'} so far.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
