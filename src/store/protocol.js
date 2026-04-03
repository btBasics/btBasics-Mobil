import { reactive } from 'vue'
import { getAll, put, getById } from './db.js'

export const protoState = reactive({
  protocols: {},
  activeId: null,
  loading: false,
})

export async function loadProtocols() {
  protoState.loading = true
  const all = await getAll('protocols')
  protoState.protocols = {}
  for (const p of all) protoState.protocols[p.id] = p
  protoState.loading = false
}

export async function saveProtocol(proto) {
  proto.lastModified = Date.now()
  await put('protocols', proto)
  protoState.protocols[proto.id] = proto
}

export async function setActiveProtocol(id) {
  protoState.activeId = id
}

export function getActiveProtocol() {
  if (!protoState.activeId) return null
  return protoState.protocols[protoState.activeId] || null
}

// ── Status-Codes ──
export const STATUS_CODES = {
  '': { label: '–', color: 'transparent', textColor: 'var(--text-muted)' },
  i: { label: 'Info', color: 'var(--status-info)', textColor: '#fff' },
  o: { label: 'Offen', color: 'var(--status-offen)', textColor: '#fff' },
  e: { label: 'Erledigt', color: 'var(--status-erledigt)', textColor: '#fff' },
  l: { label: 'Laufend', color: 'var(--status-laufend)', textColor: '#333' },
}

// ── Punkt-Nummerierung ──
export function punktNummer(kennung, erstelltProtoNr, erstelltPIdx) {
  const pn = String(erstelltProtoNr).padStart(2, '0')
  const pi = String(erstelltPIdx).padStart(2, '0')
  return `${kennung}${pn}/${pi}`
}

// ── Frist-Shortcuts ──
export function expandFrist(input) {
  if (!input) return ''
  const s = input.trim().toLowerCase()
  const today = new Date()
  const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d) }

  if (s === 'h') return fmt(today)
  if (s === 'm') return addDays(1)
  if (s === 'üm') return addDays(2)
  if (s === 'ew') { const d = new Date(today); d.setDate(d.getDate() + (5 - d.getDay())); return fmt(d) }
  if (s === 'nw') return addDays(7)
  if (s === 'üw') return addDays(14)
  if (s === 'em') { const d = new Date(today.getFullYear(), today.getMonth() + 1, 0); return fmt(d) }
  if (s === 'nb') return 'nächste Besprechung'

  // Nt, Nw, Nm patterns
  const mNum = s.match(/^(\d+)(t|w|m)$/)
  if (mNum) {
    const n = parseInt(mNum[1])
    if (mNum[2] === 't') return addDays(n)
    if (mNum[2] === 'w') return addDays(n * 7)
    if (mNum[2] === 'm') {
      const d = new Date(today)
      d.setMonth(d.getMonth() + n)
      return fmt(d)
    }
  }
  // 1w, 2w, 3w shortcuts
  if (/^[123]w$/.test(s)) return addDays(parseInt(s[0]) * 7)

  return input
}

// ── Neuen Punkt erstellen ──
export function createPunkt(protoNr, pIdx, kennung) {
  return {
    beschreibung: '',
    durch_wann: '',
    zustaendig: [],
    status: '',
    grau: false,
    durchgestrichen: false,
    farbe: '',
    pkt_farbe: '',
    erstellt_datum: new Date().toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: '2-digit' }),
    erstellt_proto_nr: protoNr,
    erstellt_p_idx: pIdx,
    _separator_proto: null,
    _separator_datum: null,
  }
}

// ── Neuen Bereich erstellen ──
export function createBereich(kennung, titel) {
  return { kennung, titel, punkte: [] }
}

// ── Text-Sperre prüfen ──
export function isLocked(punkt, currentProtoNr) {
  return punkt.erstellt_proto_nr !== 0 && punkt.erstellt_proto_nr !== currentProtoNr
}

// ── Beschreibungs-Propagation ──
export function propagateBeschreibung(protocols, punkt, currentProtoNr) {
  const { erstellt_proto_nr, erstellt_p_idx } = punkt
  for (const [nr, proto] of Object.entries(protocols)) {
    const pnr = parseInt(nr)
    if (pnr <= currentProtoNr) continue
    for (const bereich of (proto.bereiche || [])) {
      for (const p of (bereich.punkte || [])) {
        if (p.erstellt_proto_nr === erstellt_proto_nr && p.erstellt_p_idx === erstellt_p_idx) {
          p.beschreibung = punkt.beschreibung
        }
      }
    }
  }
}

// ── Protokoll-Integrität ──
export async function computeIntegrity(data) {
  const json = JSON.stringify(data)
  const buf = new TextEncoder().encode(json)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
