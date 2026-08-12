/**
 * Memory Wall.
 *
 * A scrollable gallery of photos + captions from config.memories, styled as
 * polaroids taped to a wall at slight angles. Entries with no `image` render as a
 * soft gradient card, which is what the open-source version ships — so the wall
 * looks intentional even before anyone personalizes it. Tapping a card lifts it
 * full-size with its caption.
 */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { config } from '../config/index.js'

function gradientStyle(memory) {
  const [from, to] = memory.gradient ?? ['#ff9aa8', '#7cc4e8']
  return { backgroundImage: `linear-gradient(140deg, ${from}, ${to})` }
}

/** Deterministic tilt per card, so the wall looks hand-arranged but never reshuffles. */
function tiltFor(index) {
  const tilts = [-2.6, 1.9, -1.4, 2.8, -2.2, 1.2]
  return tilts[index % tilts.length]
}

/** A strip of washi tape holding a polaroid to the wall. */
function Tape({ className = '' }) {
  return (
    <span
      aria-hidden
      className={`absolute h-5 w-14 border-[2.5px] border-ink/25 bg-honey/70 ${className}`}
      style={{ clipPath: 'polygon(4% 0, 96% 6%, 100% 94%, 2% 100%)' }}
    />
  )
}

function MemoryCard({ memory, index, onOpen, reduceMotion }) {
  const tilt = tiltFor(index)

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(memory)}
      className="card-soft group relative block w-full rounded-2xl bg-white p-2 pb-7 text-left"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 26, rotate: tilt * 2.5, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, rotate: tilt, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 240,
        damping: 18,
        delay: reduceMotion ? 0 : Math.min(index * 0.08, 0.5),
      }}
      whileHover={reduceMotion ? undefined : { rotate: 0, scale: 1.04, y: -4 }}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
    >
      <Tape className="-top-2.5 left-1/2 -translate-x-1/2 -rotate-3" />

      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border-[2.5px] border-ink">
        {memory.image ? (
          <img
            src={memory.image}
            alt={memory.caption ?? 'A saved memory'}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full" style={gradientStyle(memory)} aria-hidden />
        )}
        {/* Caption sits on a scrim so it stays readable over any photo. */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent px-3 pb-3 pt-9">
          {memory.date && (
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-white/75">
              {memory.date}
            </p>
          )}
          <p className="mt-0.5 line-clamp-3 text-xs font-semibold leading-snug text-white">
            {memory.caption}
          </p>
        </div>
      </div>

      {/* Polaroid chin — the white strip under the frame. */}
      <span
        aria-hidden
        className="absolute bottom-1.5 left-1/2 -translate-x-1/2 font-display text-[0.6rem] font-bold text-ink-soft/60"
      >
        ♡ tap me
      </span>
    </motion.button>
  )
}

export default function MemoryWall() {
  const reduceMotion = useReducedMotion()
  const memories = config.memories ?? []
  const [active, setActive] = useState(null)

  // Escape closes the detail view. No scroll lock here — the calm toolkit needs
  // to stay usable on top of this, and it manages its own lock.
  useEffect(() => {
    if (!active) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setActive(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active])

  if (memories.length === 0) {
    return (
      <motion.div
        className="card-soft rounded-[2rem] px-6 py-10 text-center"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 20 }}
      >
        <motion.div
          className="mx-auto mb-3 text-5xl"
          animate={reduceMotion ? undefined : { rotate: [-6, 6, -6] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          🖼️
        </motion.div>
        <h2 className="font-display text-2xl font-extrabold text-ink">The wall is empty for now</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Add entries to <code className="text-xs">memories</code> in your personal config and they'll
          appear here.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft/80">
          Things worth keeping
        </p>
        <motion.h2
          className="mt-1 font-display text-3xl font-extrabold text-ink"
          animate={reduceMotion ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          The memory wall
        </motion.h2>
      </header>

      {/* Staggered two-column wall. The px-1 gives the tilted cards room. */}
      <div className="grid grid-cols-2 gap-4 px-1">
        {memories.map((memory, index) => (
          <div key={memory.id ?? index} className={index % 2 === 1 ? 'pt-7' : undefined}>
            <MemoryCard
              memory={memory}
              index={index}
              onOpen={setActive}
              reduceMotion={reduceMotion}
            />
          </div>
        ))}
      </div>

      <p className="text-center text-xs font-semibold text-ink-soft/80">
        Tap any one to sit with it a while.
      </p>

      <AnimatePresence>
        {active && (
          <motion.div
            /* z = LAYER.EXPERIENCE_OVERLAY — deliberately BELOW the calm trigger
               (50) so the toolkit stays one tap away even with this open. */
            className="fixed inset-0 z-[40] flex flex-col items-center justify-center bg-ink/80 px-5 py-8 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            onClick={() => setActive(null)}
            role="dialog"
            aria-modal="true"
            aria-label={active.caption ?? 'Memory'}
          >
            <motion.div
              className="card-soft w-full max-w-sm overflow-hidden rounded-[2rem] bg-white p-3"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82, y: 24, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotate: 3 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={(event) => event.stopPropagation()}
            >
              {active.image ? (
                <img
                  src={active.image}
                  alt={active.caption ?? 'A saved memory'}
                  className="w-full rounded-2xl border-[2.5px] border-ink"
                />
              ) : (
                <div
                  className="aspect-[4/3] w-full rounded-2xl border-[2.5px] border-ink"
                  style={gradientStyle(active)}
                  aria-hidden
                />
              )}
              <div className="px-2 py-4">
                {active.date && (
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-ink-soft/80">
                    {active.date}
                  </p>
                )}
                <p className="mt-1.5 font-display text-lg font-bold leading-relaxed text-ink">
                  {active.caption}
                </p>
              </div>
            </motion.div>

            <button
              type="button"
              onClick={() => setActive(null)}
              className="btn-toon mt-6 rounded-full bg-white px-7 py-2.5 font-display text-base font-extrabold text-ink"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
