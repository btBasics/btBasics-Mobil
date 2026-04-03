<script setup>
import { ref, computed, onMounted, onBeforeUnmount, inject } from 'vue'
import { protoState, loadProtocols, saveProtocol, getActiveProtocol, setActiveProtocol,
         createNewProtocol, addBereichToActive, removeBereichFromActive,
         STATUS_CODES, punktNummer, expandFrist, createPunkt, createBereich, isLocked } from '../store/protocol.js'
import KuerzelPicker from '../components/KuerzelPicker.vue'
import { getSetting } from '../store/db.js'

const navigate = inject('navigate')
const search = ref('')
const editingPunkt = ref(null)
const showStatusPicker = ref(null)
const showZustaendigPicker = ref(null)
const beteiligte = ref([])

// Neu-Anlegen Dialog
const showNewDialog = ref(false)
const newTitel = ref('')
const newDatum = ref('')
const newOrt = ref('')
const newVerfasser = ref('')

// Bereich-Anlegen Dialog
const showNewBereich = ref(false)
const nbKennung = ref('')
const nbTitel = ref('')

// Bereich-Löschen Confirm
const confirmDeleteBereich = ref(null)

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
let dirty = false
function autoSave() {
  dirty = true
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => flushSave(), 500)
}

function flushSave() {
  clearTimeout(saveTimer)
  if (dirty && proto.value) {
    dirty = false
    saveProtocol(proto.value)
  }
}

// Sofort speichern wenn App unsichtbar wird oder geschlossen wird
function onVisChange() { if (document.hidden) flushSave() }
function onBeforeUnload() { flushSave() }

onMounted(() => {
  document.addEventListener('visibilitychange', onVisChange)
  window.addEventListener('beforeunload', onBeforeUnload)
})

onBeforeUnmount(() => {
  flushSave()
  document.removeEventListener('visibilitychange', onVisChange)
  window.removeEventListener('beforeunload', onBeforeUnload)
})

function statusStyle(code) {
  const s = STATUS_CODES[code] || STATUS_CODES['']
  return { background: s.color, color: s.textColor }
}

function pNr(punkt, kennung) {
  return punktNummer(kennung, punkt.erstellt_proto_nr, punkt.erstellt_p_idx)
}

async function doCreateProto() {
  await createNewProtocol(newTitel.value, newDatum.value, newOrt.value, newVerfasser.value)
  showNewDialog.value = false
  newTitel.value = ''; newDatum.value = ''; newOrt.value = ''; newVerfasser.value = ''
}

function openNewDialog() {
  newDatum.value = new Date().toLocaleDateString('de-AT')
  showNewDialog.value = true
}

async function doAddBereich() {
  if (!nbKennung.value) return
  await addBereichToActive(nbKennung.value.toUpperCase(), nbTitel.value)
  showNewBereich.value = false
  nbKennung.value = ''; nbTitel.value = ''
}

async function doDeleteBereich(idx) {
  await removeBereichFromActive(idx)
  confirmDeleteBereich.value = null
}

function exportPDF() {
  const p = proto.value
  if (!p) return
  const rows = []
  for (const b of (p.bereiche || [])) {
    for (const pt of (b.punkte || [])) {
      const sc = STATUS_CODES[pt.status] || STATUS_CODES['']
      rows.push(`<tr>
        <td style="font-family:monospace;font-weight:700">${pNr(pt, b.kennung)}</td>
        <td><span style="background:${sc.color};color:${sc.textColor};padding:2px 8px;border-radius:99px;font-size:11px">${sc.label}</span></td>
        <td>${(pt.beschreibung || '').replace(/\n/g, '<br>')}</td>
        <td>${(pt.zustaendig || []).join(', ')}</td>
        <td>${pt.durch_wann || ''}</td>
      </tr>`)
    }
  }
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${p.titel || 'Protokoll'}</title>
<style>
  body{font-family:system-ui,sans-serif;font-size:13px;margin:20px;color:#222}
  h1{font-size:20px;margin-bottom:4px} .meta{color:#666;font-size:12px;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}
  th{background:#f0f0f0;font-size:12px}
  @media print{body{margin:0} @page{margin:12mm}}
</style></head><body>
<h1>${p.titel || 'Protokoll Nr. ' + p.id}</h1>
<div class="meta">${[p.datum, p.ort, p.verfasser].filter(Boolean).join(' · ')}</div>
<table><thead><tr><th>Nr.</th><th>Status</th><th>Beschreibung</th><th>Zuständig</th><th>Frist</th></tr></thead>
<tbody>${rows.join('')}</tbody></table>
</body></html>`
  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  setTimeout(() => { win.print() }, 400)
}
</script>

<template>
  <div class="proto-screen">
    <div v-if="!proto" class="empty">
      <p>Kein Protokoll vorhanden.</p>
      <button class="btn btn-primary" @click="openNewDialog" style="margin-top:12px">+ Neues Protokoll</button>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="proto-header card">
        <div class="proto-tabs">
          <button v-for="id in protoIds" :key="id"
                  class="proto-tab" :class="{ active: protoState.activeId === id }"
                  @click="switchProto(id)">Nr. {{ id }}</button>
          <button class="proto-tab new-tab" @click="openNewDialog">+</button>
        </div>
        <h2 class="proto-title">{{ proto.titel || 'Protokoll' }}</h2>
        <div class="proto-meta">
          <span v-if="proto.datum">📅 {{ proto.datum }}</span>
          <span v-if="proto.ort">📍 {{ proto.ort }}</span>
          <span v-if="proto.verfasser">✍️ {{ proto.verfasser }}</span>
        </div>
        <div class="proto-actions">
          <button class="btn btn-ghost btn-sm" @click="exportPDF">📄 PDF</button>
        </div>
      </div>

      <!-- Search -->
      <div class="search-bar">
        <input class="input" v-model="search" placeholder="Suche in Protokoll…" />
      </div>

      <!-- Bereiche + Punkte -->
      <div v-for="(bereich, bIdx) in filteredBereiche" :key="bereich.kennung" class="bereich card">
        <div class="bereich-header">
          <span class="bereich-kennung">{{ bereich.kennung }}</span>
          <span class="bereich-titel">{{ bereich.titel }}</span>
          <button class="bereich-delete-btn" @click="confirmDeleteBereich = bIdx"
                  title="Bereich löschen">🗑</button>
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

      <button class="btn btn-ghost add-bereich-btn" @click="showNewBereich = true">+ Bereich</button>
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

    <!-- Neues Protokoll Dialog -->
    <div v-if="showNewDialog" class="overlay" @click.self="showNewDialog = false">
      <div class="dialog-card">
        <h3>Neues Protokoll</h3>
        <div class="dialog-field">
          <label class="field-label">Titel *</label>
          <input class="input" v-model="newTitel" placeholder="z.B. Baubesprechung Projekt X" />
        </div>
        <div class="dialog-field">
          <label class="field-label">Datum</label>
          <input class="input" v-model="newDatum" />
        </div>
        <div class="dialog-field">
          <label class="field-label">Ort</label>
          <input class="input" v-model="newOrt" placeholder="Baustellenadresse" />
        </div>
        <div class="dialog-field">
          <label class="field-label">Verfasser</label>
          <input class="input" v-model="newVerfasser" placeholder="Name / Kürzel" />
        </div>
        <div class="dialog-actions">
          <button class="btn btn-ghost" @click="showNewDialog = false">Abbrechen</button>
          <button class="btn btn-primary" :disabled="!newTitel" @click="doCreateProto">Anlegen</button>
        </div>
      </div>
    </div>

    <!-- Bereich löschen Confirm -->
    <div v-if="confirmDeleteBereich !== null" class="overlay" @click.self="confirmDeleteBereich = null">
      <div class="dialog-card">
        <h3>Bereich löschen?</h3>
        <p class="delete-warning">Bereich <strong>{{ proto.bereiche[confirmDeleteBereich]?.kennung }} – {{ proto.bereiche[confirmDeleteBereich]?.titel }}</strong>
          mit {{ proto.bereiche[confirmDeleteBereich]?.punkte?.length || 0 }} Punkt(en) wird unwiderruflich gelöscht.</p>
        <div class="dialog-actions">
          <button class="btn btn-ghost" @click="confirmDeleteBereich = null">Abbrechen</button>
          <button class="btn btn-danger" @click="doDeleteBereich(confirmDeleteBereich)">Löschen</button>
        </div>
      </div>
    </div>

    <!-- Neuer Bereich Dialog -->
    <div v-if="showNewBereich" class="overlay" @click.self="showNewBereich = false">
      <div class="dialog-card">
        <h3>Neuer Bereich</h3>
        <div class="dialog-field">
          <label class="field-label">Kennung * (1 Buchstabe)</label>
          <input class="input" v-model="nbKennung" maxlength="2" placeholder="z.B. B" style="width:60px" />
        </div>
        <div class="dialog-field">
          <label class="field-label">Titel</label>
          <input class="input" v-model="nbTitel" placeholder="z.B. Haustechnik" />
        </div>
        <div class="dialog-actions">
          <button class="btn btn-ghost" @click="showNewBereich = false">Abbrechen</button>
          <button class="btn btn-primary" :disabled="!nbKennung" @click="doAddBereich">Hinzufügen</button>
        </div>
      </div>
    </div>
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
.bereich-titel { font-weight: 600; font-size: 15px; flex: 1; }
.bereich-delete-btn {
  background: none; border: none; font-size: 16px; cursor: pointer;
  opacity: .4; padding: 4px 6px; border-radius: 6px;
}
.bereich-delete-btn:hover { opacity: 1; background: var(--danger); }
.delete-warning { font-size: 14px; color: var(--text-secondary); margin: 8px 0 4px; line-height: 1.5; }
.btn-danger { background: var(--danger); color: #fff; border: none; }
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
.new-tab { background: transparent; border-style: dashed; font-size: 16px; color: var(--accent); }
.proto-actions { margin-top: 8px; display: flex; gap: 8px; }
.btn-sm { padding: 4px 12px; font-size: 12px; }
.add-bereich-btn { width: 100%; margin-top: 4px; font-size: 13px; border-style: dashed; }
.dialog-card {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 20px; max-width: 360px; width: 100%;
}
.dialog-card h3 { font-size: 17px; font-weight: 600; margin-bottom: 14px; }
.dialog-field { margin-bottom: 12px; }
.dialog-field .field-label { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; display: block; }
.dialog-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
</style>
