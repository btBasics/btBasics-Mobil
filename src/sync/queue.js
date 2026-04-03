import { reactive } from 'vue'
import { getAll, put, remove, getById } from '../store/db.js'
import { uploadPhoto } from './api.js'
import { updatePhotoStatus, getPhotoBlob } from '../store/photos.js'

export const queueState = reactive({
  pending: [],
  processing: false,
})

export async function loadQueue() {
  queueState.pending = await getAll('syncQueue')
  queueState.pending.sort((a, b) => a.createdAt - b.createdAt)
}

export async function enqueue(action) {
  const item = {
    ...action,
    createdAt: Date.now(),
    retries: 0,
  }
  await put('syncQueue', item)
  queueState.pending.push(item)
}

export async function processQueue() {
  if (queueState.processing || queueState.pending.length === 0) return
  queueState.processing = true

  const items = [...queueState.pending]
  for (const item of items) {
    try {
      if (item.type === 'photo') {
        const rec = await getById('photos', item.photoId)
        if (rec) {
          const blob = rec.buffer
            ? new Blob([rec.buffer], { type: 'image/jpeg' })
            : await getPhotoBlob(item.photoId)
          if (blob) {
            await uploadPhoto({ ...rec, blob })
            await updatePhotoStatus(item.photoId, 'sent')
          }
        }
      }
      await remove('syncQueue', item.id)
      const idx = queueState.pending.findIndex((q) => q.id === item.id)
      if (idx !== -1) queueState.pending.splice(idx, 1)
    } catch {
      item.retries = (item.retries || 0) + 1
      if (item.retries >= 5) {
        await remove('syncQueue', item.id)
        const idx = queueState.pending.findIndex((q) => q.id === item.id)
        if (idx !== -1) queueState.pending.splice(idx, 1)
      } else {
        await put('syncQueue', item)
      }
      break
    }
  }
  queueState.processing = false
}

// Auto-process when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => processQueue())
}
