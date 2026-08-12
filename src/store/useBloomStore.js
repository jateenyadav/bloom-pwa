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
      }),
    }
  )
)

/** Number of distinct days the app has been opened. Used by the companion. */
export const selectDaysOpened = (state) => state.openDays.length
