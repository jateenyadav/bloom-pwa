/**
 * Sticker Book.
 *
 * The collection of stickers earned in Star Catcher, laid out as a scrapbook page.
 * Ones you haven't found yet show as empty outlined slots — visible, so there's
 * something to look forward to, but never presented as a task list.
 *
 * This is the only experience that's purely a view of saved state, which is exactly
 * why it earns a place in the rotation: it's the payoff for everything else.
 */
import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useBloomStore } from '../store/useBloomStore.js'
import { STICKERS } from './stickers.js'

/** Deterministic tilt per slot, so the page looks stuck-down by hand. */
function tiltFor(index) {
  const tilts = [-7, 5, -3, 8, -5, 3, -8, 6, -4, 7, -6, 4]
  return tilts[index % tilts.length]
}

export default function StickerBook() {
  const reduceMotion = useReducedMotion()
  const found = useBloomStore((state) => state.stickers)
  const [selected, setSelected] = useState(null)

  const foundSet = new Set(found)
  const foundCount = STICKERS.filter((sticker) => foundSet.has(sticker.id)).length
  const complete = foundCount === STICKERS.length

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft/80">
          Everything you've found
        </p>
        <motion.h2
          className="mt-1 font-display text-3xl font-extrabold text-ink"
          animate={reduceMotion ? undefined : { rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          Sticker book
        </motion.h2>
      </header>

      {/* Ruled scrapbook page. */}
      <div
        className="card-soft rounded-[1.75rem] p-4"
        style={{
          backgroundColor: '#fffdf7',
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent 0 27px, rgba(124,196,232,0.22) 27px 28px)',
        }}
      >
        <div className="grid grid-cols-4 gap-3">
          {STICKERS.map((sticker, index) => {
            const has = foundSet.has(sticker.id)
            const tilt = tiltFor(index)
            return (
              <motion.button
                key={sticker.id}
                type="button"
                onClick={() => has && setSelected(sticker)}
                disabled={!has}
                aria-label={has ? `${sticker.name} — found` : 'Not found yet'}
                className={`relative flex aspect-square items-center justify-center rounded-2xl ${
                  has
                    ? 'border-[3px] border-ink bg-white'
                    : 'border-[2.5px] border-dashed border-ink/25 bg-ink/[0.03]'
                }`}
                style={has ? { boxShadow: '3px 4px 0 0 var(--color-ink)' } : undefined}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: has ? tilt : 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 16,
                  delay: reduceMotion ? 0 : Math.min(index * 0.05, 0.6),
                }}
                whileHover={has && !reduceMotion ? { scale: 1.12, rotate: 0, zIndex: 5 } : undefined}
                whileTap={has && !reduceMotion ? { scale: 0.94 } : undefined}
              >
                {has ? (
                  <span className="text-3xl" aria-hidden>
                    {sticker.glyph}
                  </span>
                ) : (
                  <span className="font-display text-xl font-extrabold text-ink/20" aria-hidden>
                    ?
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      <div className="text-center">
        <p className="font-display text-lg font-extrabold text-ink">
          {foundCount} of {STICKERS.length} found
        </p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-soft">
          {complete
            ? 'The whole page. That took a while — nicely done.'
            : foundCount === 0
              ? 'Catch stars in Star Catcher and they turn up here.'
              : 'More turn up as you catch stars. No rush at all.'}
        </p>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            /* z = LAYER.EXPERIENCE_OVERLAY — below the calm trigger (50). */
            className="fixed inset-0 z-[40] flex items-center justify-center bg-ink/80 px-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
            onClick={() => setSelected(null)}
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
          >
            <motion.div
              className="card-soft w-full max-w-xs rounded-[2rem] bg-white px-6 py-7 text-center"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onClick={(event) => event.stopPropagation()}
            >
              <motion.span
                className="block text-6xl"
                animate={reduceMotion ? undefined : { rotate: [-8, 8, -8] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden
              >
                {selected.glyph}
              </motion.span>
              <p className="mt-3 font-display text-xl font-extrabold text-ink">{selected.name}</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-ink-soft">
                {selected.note}
              </p>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="btn-toon mt-6 w-full rounded-full bg-honey py-2.5 font-display text-sm font-extrabold text-ink"
              >
                Nice
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
