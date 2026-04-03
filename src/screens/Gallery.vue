<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { photoState, loadPhotos, deletePhoto } from '../store/photos.js'
import PhotoCard from '../components/PhotoCard.vue'

const navigate = inject('navigate')
const filter = ref('')
const statusFilter = ref('')
const selectedId = ref(null)
const confirmDeleteId = ref(null)

onMounted(() => loadPhotos())

const filtered = computed(() => {
  let list = photoState.photos
  if (filter.value) {
    const q = filter.value.toLowerCase()
    list = list.filter((p) =>
      (p.meta?.kuerzel || '').toLowerCase().includes(q) ||
      (p.meta?.notiz || '').toLowerCase().includes(q) ||
      (p.meta?.filename || '').toLowerCase().includes(q)
    )
  }
  if (statusFilter.value) {
    list = list.filter((p) => p.syncStatus === statusFilter.value)
  }
  return list
})

const selectedPhoto = computed(() => {
  if (!selectedId.value) return null
  return photoState.photos.find((p) => p.id === selectedId.value) || null
})

function thumbUrl(photo) {
  if (!photo.blob) return ''
  return URL.createObjectURL(photo.blob)
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function confirmDelete() {
  if (confirmDeleteId.value) {
    await deletePhoto(confirmDeleteId.value)
    if (selectedId.value === confirmDeleteId.value) selectedId.value = null
    confirmDeleteId.value = null
  }
}

const statusLabels = { local: 'Lokal', sent: 'Gesendet', queued: 'Warteschlange' }
</script>

<template>
  <div class="gallery-screen">
    <div class="gallery-header">
      <h2 class="screen-title">Galerie</h2>
      <span class="count">{{ filtered.length }} Fotos</span>
    </div>

    <div class="filter-bar">
      <input class="input filter-input" v-model="filter" placeholder="Suche…" />
      <div class="status-pills">
        <button class="pill small" :class="{ active: !statusFilter }" @click="statusFilter = ''">Alle</button>
        <button class="pill small" :class="{ active: statusFilter === 'local' }" @click="statusFilter = 'local'">Lokal</button>
        <button class="pill small" :class="{ active: statusFilter === 'sent' }" @click="statusFilter = 'sent'">Gesendet</button>
        <button class="pill small" :class="{ active: statusFilter === 'queued' }" @click="statusFilter = 'queued'">Warteschlange</button>
      </div>
    </div>

    <div v-if="filtered.length === 0" class="empty">
      <p>Keine Fotos vorhanden</p>
    </div>

    <div v-else class="grid">
      <PhotoCard v-for="photo in filtered" :key="photo.id"
                 :photo="photo"
                 @click="selectedId = photo.id" />
    </div>

    <!-- Fullscreen Overlay -->
    <div v-if="selectedPhoto" class="overlay" @click.self="selectedId = null">
      <div class="detail-card">
        <img :src="thumbUrl(selectedPhoto)" class="detail-img" />
        <div class="detail-meta">
          <div class="meta-row">
            <span class="meta-label">Kürzel</span>
            <span class="meta-val mono">{{ selectedPhoto.meta?.kuerzel || '–' }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Datum</span>
            <span class="meta-val">{{ formatDate(selectedPhoto.createdAt) }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Ausmaß</span>
            <span class="meta-val">{{ selectedPhoto.meta?.ausmass || '–' }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Dringlichkeit</span>
            <span class="meta-val mono">{{ selectedPhoto.meta?.wann || '–' }}</span>
          </div>
          <div class="meta-row" v-if="selectedPhoto.meta?.notiz">
            <span class="meta-label">Notiz</span>
            <span class="meta-val">{{ selectedPhoto.meta.notiz }}</span>
          </div>
          <div class="meta-row" v-if="selectedPhoto.gps">
            <span class="meta-label">GPS</span>
            <span class="meta-val">📍 {{ selectedPhoto.gps.lat.toFixed(5) }}, {{ selectedPhoto.gps.lng.toFixed(5) }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Status</span>
            <span class="badge" :class="selectedPhoto.syncStatus">{{ statusLabels[selectedPhoto.syncStatus] || selectedPhoto.syncStatus }}</span>
          </div>
        </div>
        <div class="detail-actions">
          <button class="btn btn-ghost" @click="selectedId = null">Schließen</button>
          <button class="btn btn-danger" @click="confirmDeleteId = selectedPhoto.id">Löschen</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <div v-if="confirmDeleteId" class="overlay" @click.self="confirmDeleteId = null">
      <div class="confirm-card">
        <p>Foto wirklich löschen?</p>
        <div class="confirm-actions">
          <button class="btn btn-ghost" @click="confirmDeleteId = null">Abbrechen</button>
          <button class="btn btn-danger" @click="confirmDelete">Löschen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gallery-screen { padding: 12px; }
.gallery-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
.screen-title { font-size: 20px; font-weight: 600; }
.count { font-size: 13px; color: var(--text-muted); }
.filter-bar { margin-bottom: 12px; }
.filter-input { margin-bottom: 8px; }
.status-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.pill { padding: 5px 12px; border-radius: 99px; border: 1px solid var(--border); background: var(--pill-bg); color: var(--text); font-size: 12px; cursor: pointer; }
.pill.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.empty { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
.overlay {
  position: fixed; inset: 0; z-index: 200;
  background: var(--overlay);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.detail-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  max-width: 400px; width: 100%;
  max-height: 85vh; overflow-y: auto;
}
.detail-img {
  width: 100%;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  display: block;
}
.detail-meta { padding: 14px 16px; }
.meta-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border); }
.meta-label { font-size: 13px; color: var(--text-secondary); }
.meta-val { font-size: 13px; color: var(--text); text-align: right; max-width: 60%; }
.mono { font-family: var(--font-mono); }
.badge { font-size: 11px; padding: 2px 8px; border-radius: 99px; }
.badge.local { background: var(--pill-bg); color: var(--text-secondary); }
.badge.sent { background: rgba(46,204,113,.15); color: var(--status-erledigt); }
.badge.queued { background: rgba(241,196,15,.15); color: var(--status-laufend); }
.detail-actions { display: flex; gap: 10px; padding: 12px 16px; justify-content: flex-end; }
.confirm-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 24px;
  text-align: center;
  max-width: 300px;
}
.confirm-actions { display: flex; gap: 10px; justify-content: center; margin-top: 16px; }
</style>
