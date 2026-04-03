<script setup>
import { ref, onMounted, inject } from 'vue'
import { getSetting, setSetting, getStorageEstimate, clear } from '../store/db.js'
import { checkConnection, setBaseUrl } from '../sync/api.js'
import { queueState, loadQueue, processQueue } from '../sync/queue.js'

const currentTheme = inject('theme')
const setTheme = inject('setTheme')
const setConnected = inject('setConnected')

const serverUrl = ref('')
const projName = ref('')
const projNr = ref('')
const connStatus = ref('')
const connTesting = ref(false)
const storage = ref({ used: 0, quota: 0 })
const themes = ['dark', 'light', 'system']

onMounted(async () => {
  serverUrl.value = await getSetting('serverUrl', '')
  projName.value = await getSetting('projectName', '–')
  projNr.value = await getSetting('projectNr', '–')
  storage.value = await getStorageEstimate()
  await loadQueue()
})

async function testConnection() {
  connTesting.value = true
  connStatus.value = ''
  try {
    setBaseUrl(serverUrl.value)
    await setSetting('serverUrl', serverUrl.value)
    const result = await checkConnection()
    if (result.connected) {
      connStatus.value = `✅ Verbunden (v${result.version})`
      setConnected(true)
    } else {
      connStatus.value = '❌ Keine Verbindung'
      setConnected(false)
    }
  } catch {
    connStatus.value = '❌ Fehler bei Verbindungstest'
    setConnected(false)
  }
  connTesting.value = false
}

async function clearCache() {
  if (confirm('Cache wirklich leeren? Gespeicherte Daten bleiben erhalten.')) {
    if ('caches' in window) {
      const keys = await caches.keys()
      for (const k of keys) await caches.delete(k)
    }
    storage.value = await getStorageEstimate()
  }
}

async function triggerSync() {
  await processQueue()
  await loadQueue()
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
</script>

<template>
  <div class="settings-screen">
    <h2 class="screen-title">Einstellungen</h2>

    <!-- Projekt -->
    <section class="card section">
      <h3 class="section-title">Aktives Projekt</h3>
      <div class="info-row">
        <span class="info-label">Projekt</span>
        <span class="info-val">{{ projName }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Nummer</span>
        <span class="info-val mono">{{ projNr }}</span>
      </div>
    </section>

    <!-- Verbindung -->
    <section class="card section">
      <h3 class="section-title">Verbindung</h3>
      <label class="field-label">Desktop-Adresse</label>
      <input class="input" v-model="serverUrl" placeholder="http://btbasics.local:8090" />
      <button class="btn btn-primary conn-btn" :disabled="connTesting" @click="testConnection">
        {{ connTesting ? 'Teste…' : 'Verbindung testen' }}
      </button>
      <p v-if="connStatus" class="conn-status">{{ connStatus }}</p>
    </section>

    <!-- Theme -->
    <section class="card section">
      <h3 class="section-title">Theme</h3>
      <div class="theme-group">
        <button v-for="t in themes" :key="t"
                class="pill" :class="{ active: currentTheme === t }"
                @click="setTheme(t)">
          {{ t === 'dark' ? '🌙 Dark' : t === 'light' ? '☀️ Light' : '🔄 System' }}
        </button>
      </div>
    </section>

    <!-- Offline Queue -->
    <section class="card section">
      <h3 class="section-title">Offline-Warteschlange</h3>
      <div class="info-row">
        <span class="info-label">Ausstehend</span>
        <span class="info-val">{{ queueState.pending.length }}</span>
      </div>
      <button v-if="queueState.pending.length > 0"
              class="btn btn-ghost" :disabled="queueState.processing"
              @click="triggerSync">
        {{ queueState.processing ? 'Wird gesendet…' : 'Jetzt senden' }}
      </button>
    </section>

    <!-- Speicher -->
    <section class="card section">
      <h3 class="section-title">Speicher</h3>
      <div class="info-row">
        <span class="info-label">Belegt</span>
        <span class="info-val">{{ formatBytes(storage.used) }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Verfügbar</span>
        <span class="info-val">{{ formatBytes(storage.quota) }}</span>
      </div>
      <button class="btn btn-ghost" @click="clearCache">Cache leeren</button>
    </section>

    <!-- Über -->
    <section class="card section">
      <h3 class="section-title">Über</h3>
      <div class="info-row">
        <span class="info-label">Version</span>
        <span class="info-val mono">1.0.0</span>
      </div>
      <div class="info-row">
        <span class="info-label">Lizenz</span>
        <span class="info-val">Proprietär – btBasics</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-screen { padding: 12px; max-width: 500px; margin: 0 auto; }
.screen-title { font-size: 20px; font-weight: 600; margin-bottom: 14px; }
.section { margin-bottom: 14px; }
.section-title { font-size: 15px; font-weight: 600; margin-bottom: 10px; color: var(--accent-light); }
.info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); }
.info-label { font-size: 13px; color: var(--text-secondary); }
.info-val { font-size: 13px; color: var(--text); }
.mono { font-family: var(--font-mono); }
.field-label { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; display: block; }
.conn-btn { margin-top: 8px; width: 100%; }
.conn-status { margin-top: 8px; font-size: 13px; }
.theme-group { display: flex; gap: 8px; }
.pill {
  flex: 1; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border);
  background: var(--pill-bg); color: var(--text); font-size: 13px; cursor: pointer; text-align: center;
}
.pill.active { background: var(--accent); color: #fff; border-color: var(--accent); }
</style>
