/**
 * On-device photo storage.
 *
 * Photos are picked from the device at runtime and kept in IndexedDB. Nothing is
 * uploaded, and — importantly — nothing is committed: the repo is public, so a
 * photo checked into `public/` would be visible to anyone who found the URL. This
 * way the deployed app is genuinely usable by anyone, with their own pictures, and
 * every copy is private to its own browser.
 *
 * Why IndexedDB rather than localStorage:
 *  - localStorage caps out around 5 MB and stores strings only, so photos would
 *    have to be base64'd — a 33% size penalty on top of an already tight budget.
 *  - IndexedDB stores Blobs natively and gets a far larger quota.
 *
 * Everything here is async and defensive: private-browsing modes can refuse to
 * open a database at all, so every call rejects cleanly rather than throwing
 * somewhere React can't catch it.
 */

const DB_NAME = 'bloom-photos'
const DB_VERSION = 1
const STORE = 'photos'

/** Longest edge of a stored photo, in px. */
const MAX_EDGE = 1400
/** JPEG quality for re-encoded photos. */
const QUALITY = 0.82

let dbPromise = null

function openDatabase() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser has no IndexedDB, so photos can’t be saved.'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        // Sorted reads without pulling every record into memory to sort.
        store.createIndex('createdAt', 'createdAt')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open the photo store.'))
    // Fires in private modes and when storage is blocked entirely.
    request.onblocked = () => reject(new Error('The photo store is blocked by another tab.'))
  }).catch((error) => {
    // Don't cache a failure forever — a later attempt may succeed.
    dbPromise = null
    throw error
  })

  return dbPromise
}

function runTransaction(mode, work) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const store = tx.objectStore(STORE)
        let result
        // Resolve on `oncomplete`, not on the request's success: for writes, only
        // completion means it actually landed on disk.
        tx.oncomplete = () => resolve(result)
        tx.onerror = () => reject(tx.error ?? new Error('The photo store rejected that.'))
        tx.onabort = () => reject(tx.error ?? new Error('The photo write was aborted.'))
        result = work(store, (value) => {
          result = value
        })
      })
  )
}

/**
 * Shrink and re-encode a picked file.
 *
 * Phone cameras produce 4-12 MP files. Storing those verbatim would blow through
 * the storage quota after a handful of photos and make the wall slow to paint, so
 * each one is drawn into a canvas at a sane size first. This also strips EXIF —
 * including any GPS location the camera recorded — which is a privacy win we get
 * for free.
 */
async function shrink(file) {
  const bitmap = await readBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  if (typeof bitmap.close === 'function') bitmap.close()

  const blob = await new Promise((resolve) => {
    canvas.toBlob((out) => resolve(out), 'image/jpeg', QUALITY)
  })

  // If the browser refuses to encode, fall back to the original rather than losing
  // the photo outright.
  return blob ?? file
}

/** createImageBitmap where available, an <img> elsewhere (older iOS Safari). */
function readBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file).catch(() => readViaImageElement(file))
  }
  return readViaImageElement(file)
}

function readViaImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file didn’t look like an image.'))
    }
    img.src = url
  })
}

/** Save one picked file. Returns the stored record. */
export async function addPhoto(file, { caption = '', date = '', now = Date.now() } = {}) {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('That file didn’t look like an image.')
  }

  const blob = await shrink(file)
  const record = {
    // Timestamp + a random suffix: two photos added in the same millisecond (a
    // multi-file pick) must not collide on the keyPath.
    id: `p-${now}-${Math.random().toString(36).slice(2, 8)}`,
    blob,
    caption: caption.trim(),
    date: date.trim(),
    createdAt: now,
  }

  await runTransaction('readwrite', (store) => store.put(record))
  return record
}

/** Every stored photo, oldest first. */
export function listPhotos() {
  return runTransaction('readonly', (store, setResult) => {
    const request = store.index('createdAt').getAll()
    request.onsuccess = () => setResult(request.result ?? [])
  })
}

export function updatePhoto(id, changes) {
  return runTransaction('readwrite', (store, setResult) => {
    const get = store.get(id)
    get.onsuccess = () => {
      const existing = get.result
      if (!existing) return
      const updated = { ...existing, ...changes }
      store.put(updated)
      setResult(updated)
    }
  })
}

export function deletePhoto(id) {
  return runTransaction('readwrite', (store) => store.delete(id))
}

export function clearPhotos() {
  return runTransaction('readwrite', (store) => store.clear())
}

/**
 * Roughly how much space the photos take, in bytes.
 *
 * Reads sizes only — but note it still has to pull the records, so treat this as a
 * settings-screen operation rather than something to call on every render.
 */
export async function photoUsage() {
  const photos = await listPhotos()
  return photos.reduce((total, photo) => total + (photo.blob?.size ?? 0), 0)
}

/** "1.4 MB" / "812 KB". Used by the menu's storage readout. */
export function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
