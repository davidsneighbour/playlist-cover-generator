/**
 * @module idb
 * @description Best-effort IndexedDB helpers for persisting the background image data URL
 * separately from the small layout JSON that lives in localStorage. All operations
 * are async and swallow errors so callers degrade gracefully when IndexedDB is
 * unavailable (private browsing, quota exhausted, old environment).
 */

const DB_NAME = 'playlist-cover-generator'
const STORE_NAME = 'images'
const DB_VERSION = 1

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

// Persist a data URL under `key`. Fire-and-forget; callers may ignore the promise.
export async function saveImageToIdb(key, dataUrl) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(dataUrl, key)
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

// Retrieve the data URL stored under `key`, or null if absent.
export async function loadImageFromIdb(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = (e) => resolve(e.target.result ?? null)
    req.onerror = (e) => reject(e.target.error)
  })
}

// Remove the entry stored under `key`. Fire-and-forget; callers may ignore the promise.
export async function deleteImageFromIdb(key) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}
