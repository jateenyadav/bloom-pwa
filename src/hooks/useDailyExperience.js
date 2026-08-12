/**
 * useDailyExperience — the app-facing entry point to the rotation engine.
 *
 * Picks one experience per app open, persists the advanced rotation state, and
 * reports whether today is the configured birthday.
 *
 * Returns { experience, markSeen, isBirthday }:
 *   experience  — the chosen experience object (null only if the pool is empty)
 *   markSeen    — commits the pick to storage; called automatically on mount, and
 *                 exposed so a caller can re-roll/commit explicitly if needed
 *   isBirthday  — true when today matches config.birthdayDate
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { advanceRotation, isBirthdayOn } from '../engine/rotationEngine.js'
import { useBloomStore } from '../store/useBloomStore.js'
import { config } from '../config/index.js'
import { experiencePool } from '../experiences/index.js'

export function useDailyExperience(pool = experiencePool, now = undefined) {
  const setRotation = useBloomStore((state) => state.setRotation)
  const registerOpen = useBloomStore((state) => state.registerOpen)

  // One pick per mount. Computed lazily from the state as it was at mount time —
  // reading the store outside of a selector on purpose, so persisting the result
  // doesn't re-trigger this and pick a second experience.
  const [pick] = useState(() => {
    const persisted = useBloomStore.getState().rotation
    return advanceRotation(persisted, pool)
  })

  const committed = useRef(false)

  const markSeen = useCallback(() => {
    if (committed.current) return
    committed.current = true
    setRotation(pick.state)
  }, [pick.state, setRotation])

  useEffect(() => {
    markSeen()
    // Growth is day-keyed and idempotent, so StrictMode's double-invoke is safe.
    registerOpen(now ?? new Date())
  }, [markSeen, registerOpen, now])

  const isBirthday = isBirthdayOn(now ?? new Date(), config.birthdayDate)

  return { experience: pick.experience, markSeen, isBirthday }
}

export default useDailyExperience
