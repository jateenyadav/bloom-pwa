/**
 * usePetName — the app-facing entry point to the pet-name picker.
 *
 * Picks one nickname per app open and persists the advanced bag state.
 *
 * Same structure as useDailyExperience: the pick happens once, lazily, in useState,
 * reading the store OUTSIDE a selector on purpose. Subscribing to `petName` here
 * would re-run this hook the moment the pick is persisted and immediately burn a
 * second name from the bag on every single open.
 */
import { useEffect, useRef, useState } from 'react'
import { nextPetName, DEFAULT_PET_NAMES } from '../engine/petNames.js'
import { useBloomStore } from '../store/useBloomStore.js'
import { config } from '../config/index.js'

export function usePetName(pool = config.petNames ?? DEFAULT_PET_NAMES) {
  const setPetName = useBloomStore((state) => state.setPetName)

  const [pick] = useState(() => {
    const persisted = useBloomStore.getState().petName
    return nextPetName(persisted, pool)
  })

  const committed = useRef(false)

  useEffect(() => {
    if (committed.current) return
    committed.current = true
    setPetName(pick.state)
  }, [pick.state, setPetName])

  return pick.name
}

export default usePetName
