import { reactive } from 'vue'
import { getAll, put, remove, getById } from './db.js'

export const photoState = reactive({
  photos: [],
  loading: false,
})

export async function loadPhotos() {
  photoState.loading = true
  const rows = await getAll('photos')
  // ArrayBuffer → Blob zurückwandeln (IDB speichert als ArrayBuffer für Mobile-Kompatibilität)
  for (const r of rows) {
    if (r.buffer && !r.blob) {
      r.blob = new Blob([r.buffer], { type: 'image/jpeg' })
    }
  }
  rows.sort((a, b) => b.createdAt - a.createdAt)
  photoState.photos = rows
  photoState.loading = false
}

export async function addPhoto(blob, meta, annotationBlob = null) {
  const id = crypto.randomUUID()
  const compressed = await compressImage(blob)
  const sha = await sha256(compressed)
  // Blob → ArrayBuffer für zuverlässige IDB-Speicherung auf Mobile
  const buffer = await compressed.arrayBuffer()
  const dbRecord = {
    id,
    buffer,
    sha256: sha,
    meta: { ...meta },
    syncStatus: 'local',
    createdAt: Date.now(),
    gps: meta.gps || null,
  }
  await put('photos', dbRecord)
  // In-memory record behält den Blob für sofortige Anzeige
  const memRecord = { ...dbRecord, blob: compressed }
  photoState.photos.unshift(memRecord)
  return memRecord
}

export async function deletePhoto(id) {
  await remove('photos', id)
  const idx = photoState.photos.findIndex((p) => p.id === id)
  if (idx !== -1) photoState.photos.splice(idx, 1)
}

export async function updatePhotoStatus(id, status) {
  const rec = await getById('photos', id)
  if (!rec) return
  rec.syncStatus = status
  await put('photos', rec)
  const local = photoState.photos.find((p) => p.id === id)
  if (local) local.syncStatus = status
}

/** Gibt den Blob eines Fotos zurück (aus Memory oder IDB) */
export async function getPhotoBlob(id) {
  const local = photoState.photos.find((p) => p.id === id)
  if (local?.blob) return local.blob
  const rec = await getById('photos', id)
  if (!rec) return null
  if (rec.buffer) return new Blob([rec.buffer], { type: 'image/jpeg' })
  return rec.blob || null
}

/** Canvas-basierte Kompression: max 1200×1200, JPEG stufenweise bis <500KB */
export function compressImage(blob, maxDim = 1200, maxBytes = 500 * 1024) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      // Stufenweise JPEG-Qualität: 85 → 75 → 65 → ... → 20
      let quality = 0.85
      const tryCompress = () => {
        canvas.toBlob((result) => {
          if (result.size <= maxBytes || quality <= 0.2) {
            resolve(result)
          } else {
            quality -= 0.1
            tryCompress()
          }
        }, 'image/jpeg', quality)
      }
      tryCompress()
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(blob)
    }
    img.src = url
  })
}

/** SHA256 via SubtleCrypto */
export async function sha256(blob) {
  const buf = await blob.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function buildFilename(meta) {
  const now = new Date()
  const d = now.toISOString().slice(0, 10).replace(/-/g, '')
  const t = now.toTimeString().slice(0, 8).replace(/:/g, '')
  const krz = (meta.kuerzel || 'XX').toUpperCase()
  const ausmass = (meta.ausmass || 'mittel').toLowerCase()
  const wann = (meta.wann || '').toLowerCase() || 'offen'
  return `${krz}_${d}_${t}_${ausmass}_${wann}.jpg`
}
