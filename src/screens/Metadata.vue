<script setup>
import { ref, inject, onMounted } from 'vue'
import { addPhoto, buildFilename } from '../store/photos.js'
import { enqueue } from '../sync/queue.js'
import { getSetting } from '../store/db.js'
import KuerzelPicker from '../components/KuerzelPicker.vue'

const props = defineProps({ blobs: Array, gps: Object })
const navigate = inject('navigate')
const connected = inject('connected')

const kuerzel = ref('')
const projNr = ref('')
const ausmass = ref('mittel')
const wann = ref('')
const notiz = ref('')
const sending = ref(false)
const showKuerzelPicker = ref(false)
const beteiligte = ref([])

const ausmassOptions = ['klein', 'mittel', 'groß']
const wannOptions = ['h', 'm', 'üm', 'ew', 'nw', 'em', '1w', '2w', '3w']

onMounted(async () => {
  projNr.value = await getSetting('projectNr', '')
  const b = await getSetting('beteiligte', [])
  if (Array.isArray(b)) beteiligte.value = b
})

async function send() {
  if (!kuerzel.value) return
  sending.value = true
  try {
    for (const blob of (props.blobs || [])) {
      const meta = {
        kuerzel: kuerzel.value,
        projNr: projNr.value,
        ausmass: ausmass.value,
        wann: wann.value,
        notiz: notiz.value,
        gps: props.gps,
      }
      meta.filename = buildFilename(meta)
      const record = await addPhoto(blob, meta)
      await enqueue({ type: 'photo', photoId: record.id })
    }
    navigate('gallery')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="metadata-screen">
    <h2 class="screen-title">Metadaten</h2>
    <p class="hint">{{ (blobs || []).length }} Foto(s) ausgewählt</p>

    <div class="field">
      <label class="field-label">Zuständiger *</label>
      <button class="input kuerzel-trigger" @click="showKuerzelPicker = true">
        {{ kuerzel || 'Kürzel wählen…' }}
      </button>
      <KuerzelPicker v-if="showKuerzelPicker"
                     :beteiligte="beteiligte"
                     :selected="kuerzel"
                     @pick="(k) => { kuerzel = k; showKuerzelPicker = false }"
                     @close="showKuerzelPicker = false" />
    </div>

    <div class="field">
      <label class="field-label">Projektnummer</label>
      <input class="input" v-model="projNr" placeholder="z.B. 2024/123" />
    </div>

    <div class="field">
      <label class="field-label">Ausmaß</label>
      <div class="pill-group">
        <button v-for="a in ausmassOptions" :key="a"
                class="pill" :class="{ active: ausmass === a }"
                @click="ausmass = a">{{ a }}</button>
      </div>
    </div>

    <div class="field">
      <label class="field-label">Dringlichkeit (WANN)</label>
      <div class="pill-group">
        <button v-for="w in wannOptions" :key="w"
                class="pill small" :class="{ active: wann === w }"
                @click="wann = w">{{ w }}</button>
      </div>
    </div>

    <div class="field">
      <label class="field-label">Notiz</label>
      <textarea class="input" v-model="notiz" rows="3" maxlength="300"
                placeholder="Optionale Anmerkung…" />
      <span class="char-count">{{ notiz.length }}/300</span>
    </div>

    <div class="field" v-if="gps">
      <span class="gps-badge">📍 {{ gps.lat.toFixed(5) }}, {{ gps.lng.toFixed(5) }}</span>
    </div>

    <div class="actions">
      <button class="btn btn-ghost" @click="navigate('camera')">‹ Zurück</button>
      <button class="btn btn-primary" :disabled="!kuerzel || sending" @click="send">
        {{ sending ? 'Wird gespeichert…' : 'Senden & Speichern' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.metadata-screen {
  padding: 16px;
  max-width: 500px;
  margin: 0 auto;
}
.screen-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}
.hint { color: var(--text-secondary); font-size: 13px; margin-bottom: 16px; }
.field { margin-bottom: 16px; }
.field-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.kuerzel-trigger {
  text-align: left;
  cursor: pointer;
  color: var(--text);
}
.pill-group { display: flex; gap: 6px; flex-wrap: wrap; }
.pill {
  padding: 7px 16px;
  border-radius: 99px;
  border: 1px solid var(--border);
  background: var(--pill-bg);
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  transition: background var(--transition), border-color var(--transition);
}
.pill.small { padding: 5px 12px; font-size: 13px; font-family: var(--font-mono); }
.pill.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
textarea.input { resize: vertical; min-height: 60px; }
.char-count { font-size: 11px; color: var(--text-muted); float: right; margin-top: 2px; }
.gps-badge {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--pill-bg);
  padding: 4px 10px;
  border-radius: 99px;
}
.actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 24px;
  padding-bottom: 20px;
}
.actions .btn { flex: 1; }
</style>
