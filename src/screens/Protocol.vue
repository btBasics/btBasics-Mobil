<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { protoState, loadProtocols, saveProtocol, getActiveProtocol, setActiveProtocol,
         STATUS_CODES, punktNummer, expandFrist, createPunkt, createBereich, isLocked } from '../store/protocol.js'
import KuerzelPicker from '../components/KuerzelPicker.vue'
import { getSetting } from '../store/db.js'

const navigate = inject('navigate')
const search = ref('')
const editingPunkt = ref(null)
const showStatusPicker = ref(null)
const showZustaendigPicker = ref(null)
const beteiligte = ref([])

onMounted(async () => {
  await loadProtocols()
  beteiligte.value = await getSetting('beteiligte', [])
  const ids = Object.keys(protoState.protocols)
  if (ids.length > 0 && !protoState.activeId) setActiveProtocol(ids[ids.length - 1])
})

const proto = computed(() => getActiveProtocol())
const protoIds = computed(() => Object.keys(protoState.protocols).sort((a, b) => parseInt(a) - parseInt(b)))

const filteredBereiche = computed(() => {
  if (!proto.value?.bereiche) return []
  if (!search.value) return proto.value.bereiche
  const q = search.value.toLowerCase()
  return proto.value.bereiche.map((b) => ({
    ...b,
    punkte: b.punkte.filter((p) =>
      (p.beschreibung || '').toLowerCase().includes(q) ||
      (p.zustaendig || []).join(',').toLowerCase().includes(q) ||
      (p.durch_wann || '').toLowerCase().includes(q)
    ),
  })).filter((b) => b.punkte.length > 0 || b.titel.toLowerCase().includes(q))
})

function switchProto(id) { setActiveProtocol(id) }

function addPunkt(bereich) {
  const pnr = parseInt(protoState.activeId) || 1
  const p = createPunkt(pnr, bereich.punkte.length, bereich.kennung)
  bereich.punkte.push(p)
  editingPunkt.value = p
  autoSave()
}

function removePunkt(bereich, idx) {
  bereich.punkte.splice(idx, 1)
  autoSave()
}

function setStatus(punkt, code) {
  punkt.status = code
  showStatusPicker.value = null
  autoSave()
}

function setZustaendig(punkt, kList) {
  punkt.zustaendig = kList
  showZustaendigPicker.value = null
  autoSave()
}

function onFristBlur(punkt) {
  punkt.durch_wann = expandFrist(punkt.durch_wann)
  autoSave()
}

let saveTimer = null
function autoSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (proto.value) saveProtocol(proto.value)
  }, 500)
}

function statusStyle(code) {
  const s = STATUS_CODES[code] || STATUS_CODES['']
  return { background: s.color, color: s.textColor }
}

function pNr(punkt, kennung) {
  return punktNummer(kennung, punkt.erstellt_proto_nr, punkt.erstellt_p_idx)
}
</script>

<template>
  <div class="proto-screen">
    <div v-if="!proto" class="empty">
      <p>Kein Protokoll geladen.</p>
      <p class="hint">Synchronisiere mit dem Desktop um ein Protokoll zu laden.</p>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="proto-header card">
        <div class="proto-tabs">
          <button v-for="id in protoIds" :key="id"
                  class="proto-tab" :class="{ active: protoState.activeId === id }"
                  @click="switchProto(id)">Nr. {{ id }}</button>
        </div>
        <h2 class="proto-title">{{ proto.titel || 'Protokoll' }}</h2>
        <div class="proto-meta">
          <span v-if="proto.datum">📅 {{ proto.datum }}</span>
          <span v-if="proto.ort">📍 {{ proto.ort }}</span>
          <span v-if="proto.verfasser">✍️ {{ proto.verfasser }}</span>
        </div>
      </div>

      <!-- Search -->
      <div class="search-bar">
        <input class="input" v-model="search" placeholder="Suche in Protokoll…" />
      </div>

      <!-- Bereiche + Punkte -->
      <div v-for="bereich in filteredBereiche" :key="bereich.kennung" class="bereich card">
        <div class="bereich-header">
          <span class="bereich-kennung">{{ bereich.kennung }}</span>
          <span class="bereich-titel">{{ bereich.titel }}</span>
        </div>

        <div v-for="(punkt, pIdx) in bereich.punkte" :key="pIdx" class="punkt"
             :class="{ locked: isLocked(punkt, parseInt(protoState.activeId)) }">

          <div class="punkt-header">
            <span class="punkt-nr mono">{{ pNr(punkt, bereich.kennung) }}</span>
            <button class="status-badge" :style="statusStyle(punkt.status)"
                    @click="showStatusPicker = punkt">
              {{ STATUS_CODES[punkt.status]?.label || '–' }}
            </button>
          </div>

          <div class="punkt-body">
            <textarea class="punkt-text input" v-model="punkt.beschreibung"
                      :disabled="isLocked(punkt, parseInt(protoState.activeId))"
                      rows="2" @input="autoSave"
                      placeholder="Beschreibung…" />

            <div class="punkt-meta-row">
              <div class="punkt-field">
                <label class="field-label">Frist</label>
                <input class="input small" v-model="punkt.durch_wann"
                       @blur="onFristBlur(punkt)" placeholder="h/m/ew/nw…" />
              </div>
              <div class="punkt-field">
                <label class="field-label">Zuständig</label>
                <button class="input small zustaendig-btn"
                        @click="showZustaendigPicker = punkt">
                  {{ (punkt.zustaendig || []).join(', ') || 'wählen…' }}
                </button>
              </div>
            </div>
          </div>

          <button class="remove-btn" @click="removePunkt(bereich, pIdx)"
                  v-if="!isLocked(punkt, parseInt(protoState.activeId))">✕</button>
        </div>

        <button class="btn btn-ghost add-punkt-btn" @click="addPunkt(bereich)">+ Punkt</button>
      </div>
    </template>

    <!-- Status Picker Overlay -->
    <div v-if="showStatusPicker" class="overlay" @click.self="showStatusPicker = null">
      <div class="picker-card">
        <h3>Status wählen</h3>
        <div class="status-grid">
          <button v-for="(info, code) in STATUS_CODES" :key="code"
                  class="status-option" :style="statusStyle(code)"
                  @click="setStatus(showStatusPicker, code)">
            {{ info.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Zuständig Picker Overlay -->
    <KuerzelPicker v-if="showZustaendigPicker"
                   :beteiligte="beteiligte"
                   :selected="(showZustaendigPicker.zustaendig || [])[0] || ''"
                   multi
                   :multiSelected="showZustaendigPicker.zustaendig || []"
                   @pick="(k) => { showZustaendigPicker.zustaendig = [k]; showZustaendigPicker = null; autoSave() }"
                   @pickMulti="(list) => { setZustaendig(showZustaendigPicker, list) }"
                   @close="showZustaendigPicker = null" />
  </div>
</template>

<style scoped>
.proto-screen { padding: 12px; }
.empty { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.hint { font-size: 13px; margin-top: 6px; }
.proto-header { margin-bottom: 12px; }
.proto-tabs { display: flex; gap: 6px; margin-bottom: 8px; overflow-x: auto; }
.proto-tab {
  padding: 5px 14px; border-radius: 99px; border: 1px solid var(--border);
  background: var(--pill-bg); color: var(--text); font-size: 13px; cursor: pointer;
  white-space: nowrap;
}
.proto-tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.proto-title { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.proto-meta { display: flex; gap: 14px; font-size: 13px; color: var(--text-secondary); flex-wrap: wrap; }
.search-bar { margin-bottom: 12px; }
.bereich { margin-bottom: 14px; padding: 12px; }
.bereich-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.bereich-kennung {
  font-family: var(--font-mono); font-weight: 700; font-size: 15px;
  background: var(--accent); color: #fff; width: 30px; height: 30px;
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
}
.bereich-titel { font-weight: 600; font-size: 15px; }
.punkt {
  position: relative; border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 10px; margin-bottom: 8px; background: var(--bg);
}
.punkt.locked { opacity: .7; background: var(--bg-input); }
.punkt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.punkt-nr { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.mono { font-family: var(--font-mono); }
.status-badge {
  font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 99px;
  border: none; cursor: pointer;
}
.punkt-text {
  resize: vertical; min-height: 40px; font-size: 14px;
}
.punkt-meta-row { display: flex; gap: 8px; margin-top: 8px; }
.punkt-field { flex: 1; }
.punkt-field .field-label { font-size: 11px; color: var(--text-muted); margin-bottom: 3px; display: block; }
.input.small { padding: 6px 10px; font-size: 13px; }
.zustaendig-btn { text-align: left; cursor: pointer; color: var(--text); }
.remove-btn {
  position: absolute; top: 6px; right: 6px; width: 24px; height: 24px;
  border-radius: 50%; border: none; background: var(--danger); color: #fff;
  font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.add-punkt-btn { width: 100%; margin-top: 4px; font-size: 13px; }
.overlay {
  position: fixed; inset: 0; z-index: 200; background: var(--overlay);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.picker-card {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md);
  padding: 20px; max-width: 300px; width: 100%;
}
.picker-card h3 { font-size: 16px; margin-bottom: 12px; }
.status-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.status-option {
  padding: 10px; border-radius: var(--radius-sm); border: none;
  font-size: 14px; font-weight: 600; cursor: pointer;
}
</style>
