/**
 * The single persisted store. Everything here survives app restarts via
 * localStorage; nothing here ever leaves the device.
 *
 * The rotation engine stays pure (src/engine/rotationEngine.js) — this store is the
 * only thing that knows about persistence and wall-clock time.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createInitialRotationState, toDayKey } from '../engine/rotationEngine.js'
import { createInitialPetNameState } from '../engine/petNames.js'

export const STORAGE_KEY = 'bloom-state-v1'

/**
 * Companion growth. Deliberately gentle: growth only ever goes *up*, one small
 * step per distinct day the app is opened. Skipping days costs nothing — there is
 * no streak, no decay, and no guilt copy anywhere in this file.
 */
export const GROWTH_PER_DAY = 1

const initialState = {
  rotation: createInitialRotationState(),
  /** Distinct local days the app has been opened, as "YYYY-MM-DD". */
  openDays: [],
  /** Monotonic growth points for the companion. */
  growth: 0,
  /** Gratitude entries: { id, text, prompt, dayKey, createdAt }. */
  gratitude: [],
  /** Last day we ran the birthday sequence, so it plays once per birthday. */
  lastBirthdayShown: null,
  /** Shuffle-bag state for the pet-name greeting. See engine/petNames.js. */
  petName: createInitialPetNameState(),

  // --- Per-experience saved memory -----------------------------------------
  // Each experience that remembers anything owns exactly one key here, so the
  // menu can report "you have N of these" without knowing how any of them work.
  /** Wish Jar: { id, text, createdAt }. */
  wishes: [],
  /** Mood Garden: { id, mood, dayKey, createdAt }. One flower per entry. */
  moods: [],
  /** Time Capsule: { id, text, createdAt, unlockAt, opened }. */
  capsules: [],
  /** Hug Button: a running total. The only number here that's meant to be shown off. */
  hugs: 0,
  /** Bubble Pop: lifetime bubbles popped. Purely for fun. */
  bubblesPopped: 0,
  /** Sticker Book: ids of stickers found so far. */
  stickers: [],
}

export const useBloomStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Record an app open. Idempotent per local day: calling it twice on the same
       * day adds no extra growth, so a page refresh can't inflate the companion.
       * Returns true when this was the day's first open.
       */
      registerOpen(now = new Date()) {
        const dayKey = toDayKey(now)
        if (get().openDays.includes(dayKey)) return false
        set((state) => ({
          openDays: [...state.openDays, dayKey],
          growth: state.growth + GROWTH_PER_DAY,
        }))
        return true
      },

      /** Persist the rotation state produced by advanceRotation(). */
      setRotation(rotation) {
        set({ rotation })
      },

      /** Persist the bag state produced by nextPetName(). */
      setPetName(petName) {
        set({ petName })
      },

      addGratitude(text, prompt, now = new Date()) {
        const trimmed = text.trim()
        if (!trimmed) return
        set((state) => ({
          gratitude: [
            ...state.gratitude,
            {
              // Timestamp + counter keeps ids unique without pulling in a uuid dep.
              id: `g-${now.getTime()}-${state.gratitude.length}`,
              text: trimmed,
              prompt: prompt ?? null,
              dayKey: toDayKey(now),
              createdAt: now.toISOString(),
            },
          ],
        }))
      },

      removeGratitude(id) {
        set((state) => ({ gratitude: state.gratitude.filter((entry) => entry.id !== id) }))
      },

      // --- Wish Jar ----------------------------------------------------------
      addWish(text, now = new Date()) {
        const trimmed = text.trim()
        if (!trimmed) return
        set((state) => ({
          wishes: [
            ...state.wishes,
            { id: `w-${now.getTime()}-${state.wishes.length}`, text: trimmed, createdAt: now.toISOString() },
          ],
        }))
      },

      removeWish(id) {
        set((state) => ({ wishes: state.wishes.filter((wish) => wish.id !== id) }))
      },

      // --- Mood Garden -------------------------------------------------------
      /**
       * Plant today's mood. One flower per day: planting again on the same day
       * replaces it rather than stacking, so the garden reads as a calendar and
       * changing your mind costs nothing.
       */
      setMood(mood, now = new Date()) {
        const dayKey = toDayKey(now)
        set((state) => ({
          moods: [
            ...state.moods.filter((entry) => entry.dayKey !== dayKey),
            { id: `m-${dayKey}`, mood, dayKey, createdAt: now.toISOString() },
          ],
        }))
      },

      // --- Time Capsule ------------------------------------------------------
      /** Write a note to your future self, sealed for `days`. */
      addCapsule(text, days = 7, now = new Date()) {
        const trimmed = text.trim()
        if (!trimmed) return
        const unlockAt = new Date(now.getTime() + days * 86400000)
        set((state) => ({
          capsules: [
            ...state.capsules,
            {
              id: `c-${now.getTime()}-${state.capsules.length}`,
              text: trimmed,
              createdAt: now.toISOString(),
              unlockAt: unlockAt.toISOString(),
              opened: false,
            },
          ],
        }))
      },

      openCapsule(id) {
        set((state) => ({
          capsules: state.capsules.map((c) => (c.id === id ? { ...c, opened: true } : c)),
        }))
      },

      removeCapsule(id) {
        set((state) => ({ capsules: state.capsules.filter((c) => c.id !== id) }))
      },

      // --- Small counters ----------------------------------------------------
      addHug() {
        set((state) => ({ hugs: state.hugs + 1 }))
      },

      addBubbles(count = 1) {
        set((state) => ({ bubblesPopped: state.bubblesPopped + count }))
      },

      /** Record a found sticker. Idempotent — finding it twice isn't a second one. */
      findSticker(id) {
        set((state) =>
          state.stickers.includes(id) ? state : { stickers: [...state.stickers, id] }
        )
      },

      markBirthdayShown(now = new Date()) {
        set({ lastBirthdayShown: toDayKey(now) })
      },

      /** Escape hatch for the user (and for manual testing). */
      resetAll() {
        set({
          ...initialState,
          rotation: createInitialRotationState(),
          petName: createInitialPetNameState(),
          openDays: [],
          gratitude: [],
          wishes: [],
          moods: [],
          capsules: [],
          stickers: [],
        })
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      // Persist data only — functions are recreated on load.
      partialize: (state) => ({
        rotation: state.rotation,
        openDays: state.openDays,
        growth: state.growth,
        gratitude: state.gratitude,
        lastBirthdayShown: state.lastBirthdayShown,
        petName: state.petName,
        wishes: state.wishes,
        moods: state.moods,
        capsules: state.capsules,
        hugs: state.hugs,
        bubblesPopped: state.bubblesPopped,
        stickers: state.stickers,
      }),
    }
  )
)

/** Number of distinct days the app has been opened. Used by the companion. */
export const selectDaysOpened = (state) => state.openDays.length
