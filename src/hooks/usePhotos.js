/**
 * usePhotos — React's view of the on-device photo store.
 *
 * Hands back photo records each with a `url` for use in <img src>. Those URLs come
 * from URL.createObjectURL, which pins the whole Blob in memory until revoked, so
 * this hook owns their lifecycle: a URL is created once per record and revoked when
 * the record goes away or the hook unmounts. Creating them inline during render
 * would leak a full-size photo on every single re-render.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addPhoto,
  deletePhoto,
  listPhotos,
  photoUsage,
  updatePhoto,
} from '../lib/photoStore.js'

export function usePhotos() {
  const [photos, setPhotos] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const [usage, setUsage] = useState(0)

  // id -> object URL. A ref, not state: mutating it must not trigger a render.
  const urlsRef = useRef(new Map())
  const aliveRef = useRef(true)

  /** Attach a stable object URL to each record, minting and revoking as needed. */
  const withUrls = useCallback((records) => {
    const urls = urlsRef.current
    const seen = new Set()

    const decorated = records.map((record) => {
      seen.add(record.id)
      let url = urls.get(record.id)
      if (!url) {
        url = URL.createObjectURL(record.blob)
        urls.set(record.id, url)
      }
      return { ...record, url }
    })

    // Revoke URLs for records that no longer exist.
    for (const [id, url] of urls) {
      if (!seen.has(id)) {
        URL.revokeObjectURL(url)
        urls.delete(id)
      }
    }

    return decorated
  }, [])

  const refresh = useCallback(async () => {
    try {
      const records = await listPhotos()
      if (!aliveRef.current) return
      setPhotos(withUrls(records))
      setUsage(records.reduce((total, r) => total + (r.blob?.size ?? 0), 0))
      setStatus('ready')
      setError(null)
    } catch (cause) {
      if (!aliveRef.current) return
      // Private browsing can refuse IndexedDB entirely. Surface it as a message
      // rather than an empty wall that looks like data loss.
      setStatus('error')
      setError(cause?.message ?? 'Photos aren’t available in this browser.')
    }
  }, [withUrls])

  useEffect(() => {
    aliveRef.current = true
    refresh()
    return () => {
      aliveRef.current = false
      for (const url of urlsRef.current.values()) URL.revokeObjectURL(url)
      urlsRef.current.clear()
    }
  }, [refresh])

  /** Add many files (a multi-select pick), reporting per-file failures. */
  const add = useCallback(
    async (files, meta) => {
      const list = Array.from(files ?? [])
      const failures = []
      for (const file of list) {
        try {
          await addPhoto(file, meta)
        } catch (cause) {
          failures.push(`${file.name}: ${cause?.message ?? 'could not be saved'}`)
        }
      }
      await refresh()
      if (failures.length) setError(failures.join('\n'))
      return { added: list.length - failures.length, failures }
    },
    [refresh]
  )

  const remove = useCallback(
    async (id) => {
      await deletePhoto(id)
      await refresh()
    },
    [refresh]
  )

  const setCaption = useCallback(
    async (id, changes) => {
      await updatePhoto(id, changes)
      await refresh()
    },
    [refresh]
  )

  return { photos, status, error, usage, add, remove, setCaption, refresh, photoUsage }
}

export default usePhotos
