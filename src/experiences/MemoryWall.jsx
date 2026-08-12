/**
 * Memory Wall.
 *
 * Polaroids taped to a wall. Photos are added from the device at runtime and live
 * in IndexedDB (see lib/photoStore.js) — never in the repo, because the repo is
 * public and a committed photo would be readable by anyone who found the URL. That
 * makes the deployed app usable by anyone with their own pictures, each copy
 * private to its own browser.
 *
 * `config.memories` still works as a set of caption-only gradient cards, so the
 * wall looks intentional before anyone has added a photo.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePhotos } from '../hooks/usePhotos.js'
import { formatBytes } from '../lib/photoStore.js'
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
        {memory.url ? (
          <img
            src={memory.url}
            alt={memory.caption || 'A saved memory'}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full" style={gradientStyle(memory)} aria-hidden />
        )}
        {/* Caption sits on a scrim so it stays readable over any photo. */}
        {(memory.caption || memory.date) && (
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
        )}
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

/** The dashed "add a photo" tile that sits at the end of the wall. */
function AddCard({ onPick, busy, reduceMotion }) {
  return (
    <motion.button
      type="button"
      onClick={onPick}
      disabled={busy}
      className="relative flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-2xl border-[3px] border-dashed border-ink/45 bg-white/55 px-3 text-center disabled:opacity-60"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 18 }}
      whileHover={reduceMotion ? undefined : { scale: 1.03 }}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
    >
      <motion.span
        className="text-4xl"
        aria-hidden
        animate={reduceMotion || busy ? undefined : { y: [0, -5, 0], rotate: [-6, 6, -6] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {busy ? '⏳' : '📷'}
      </motion.span>
      <span className="font-display text-sm font-extrabold leading-tight text-ink">
        {busy ? 'Saving…' : 'Add a photo'}
      </span>
      <span className="text-[0.65rem] font-semibold leading-tight text-ink-soft/80">
        stays on this device
      </span>
    </motion.button>
  )
}

export default function MemoryWall() {
  const reduceMotion = useReducedMotion()
  const { photos, status, error, usage, add, remove } = usePhotos()
  const [active, setActive] = useState(null)
  const [busy, setBusy] = useState(false)
  const [draftCaption, setDraftCaption] = useState('')
  const fileInputRef = useRef(null)

  // Caption-only placeholder cards from config, shown alongside real photos.
  const placeholders = (config.memories ?? []).map((memory, index) => ({
    ...memory,
    id: memory.id ?? `config-${index}`,
    url: null,
    isPlaceholder: true,
  }))

  // Real photos first — once someone has added their own, that's what they came for.
  const cards = [...photos].reverse().concat(photos.length >= 4 ? [] : placeholders)

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

  const onFiles = async (event) => {
    const files = event.target.files
    if (!files?.length) return
    setBusy(true)
    await add(files, { caption: draftCaption })
    setBusy(false)
    setDraftCaption('')
    // Reset the input so picking the same file again still fires a change event.
    event.target.value = ''
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

      {/* A caption typed before picking gets attached to the photo. Optional. */}
      <input
        type="text"
        value={draftCaption}
        onChange={(event) => setDraftCaption(event.target.value)}
        placeholder="Caption for the next photo (optional)"
        maxLength={140}
        className="card-soft w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:font-normal placeholder:text-ink-soft/60 focus:outline-none"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onFiles}
        className="hidden"
        aria-label="Choose photos from this device"
      />

      {status === 'error' && (
        <p className="rounded-2xl border-[3px] border-ink/20 bg-white/70 px-4 py-3 text-xs font-semibold leading-relaxed text-ink-soft">
          {error} Everything else in Bloom still works.
        </p>
      )}

      {/* Staggered two-column wall. The px-1 gives the tilted cards room. */}
      <div className="grid grid-cols-2 gap-4 px-1">
        {cards.map((memory, index) => (
          <div key={memory.id} className={index % 2 === 1 ? 'pt-7' : undefined}>
            <MemoryCard
              memory={memory}
              index={index}
              onOpen={setActive}
              reduceMotion={reduceMotion}
            />
          </div>
        ))}
        <div className={cards.length % 2 === 1 ? 'pt-7' : undefined}>
          <AddCard
            onPick={() => fileInputRef.current?.click()}
            busy={busy}
            reduceMotion={reduceMotion}
          />
        </div>
      </div>

      <p className="text-center text-xs font-semibold leading-relaxed text-ink-soft/80">
        {photos.length > 0 ? (
          <>
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'} on this device ·{' '}
            {formatBytes(usage)}
            <br />
          </>
        ) : null}
        Photos never leave this device — they aren't uploaded anywhere.
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
            aria-label={active.caption || 'Memory'}
          >
            <motion.div
              className="card-soft w-full max-w-sm overflow-hidden rounded-[2rem] bg-white p-3"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82, y: 24, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotate: 3 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={(event) => event.stopPropagation()}
            >
              {active.url ? (
                <img
                  src={active.url}
                  alt={active.caption || 'A saved memory'}
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
                  {active.caption || 'No caption — some things don’t need one.'}
                </p>
              </div>
            </motion.div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActive(null)}
                className="btn-toon rounded-full bg-white px-7 py-2.5 font-display text-base font-extrabold text-ink"
              >
                Close
              </button>
              {/* Only real photos can be removed; config cards aren't ours to delete. */}
              {!active.isPlaceholder && (
                <button
                  type="button"
                  onClick={async () => {
                    const id = active.id
                    setActive(null)
                    await remove(id)
                  }}
                  className="btn-toon rounded-full bg-blush px-5 py-2.5 font-display text-sm font-extrabold text-ink"
                >
                  Remove
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
