const DB_NAME = 'btbasics-feldapp'
const DB_VERSION = 1

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('photos')) {
        const ps = db.createObjectStore('photos', { keyPath: 'id' })
        ps.createIndex('status', 'syncStatus')
        ps.createIndex('kuerzel', 'meta.kuerzel')
        ps.createIndex('createdAt', 'createdAt')
      }
      if (!db.objectStoreNames.contains('protocols')) {
        db.createObjectStore('protocols', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const sq = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true })
        sq.createIndex('createdAt', 'createdAt')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function tx(storeName, mode = 'readonly') {
  const db = await openDB()
  return db.transaction(storeName, mode).objectStore(storeName)
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getAll(storeName) {
  const store = await tx(storeName)
  return reqToPromise(store.getAll())
}

export async function getById(storeName, id) {
  const store = await tx(storeName)
  return reqToPromise(store.get(id))
}

export async function put(storeName, value) {
  const store = await tx(storeName, 'readwrite')
  return reqToPromise(store.put(value))
}

export async function remove(storeName, id) {
  const store = await tx(storeName, 'readwrite')
  return reqToPromise(store.delete(id))
}

export async function clear(storeName) {
  const store = await tx(storeName, 'readwrite')
  return reqToPromise(store.clear())
}

export async function getAllByIndex(storeName, indexName, value) {
  const store = await tx(storeName)
  const idx = store.index(indexName)
  return reqToPromise(idx.getAll(value))
}

export async function getSetting(key, fallback = null) {
  const row = await getById('settings', key)
  return row ? row.value : fallback
}

export async function setSetting(key, value) {
  return put('settings', { key, value })
}

export async function getStorageEstimate() {
  if (navigator.storage && navigator.storage.estimate) {
    const est = await navigator.storage.estimate()
    return { used: est.usage || 0, quota: est.quota || 0 }
  }
  return { used: 0, quota: 0 }
}
