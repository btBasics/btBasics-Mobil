import { getSetting } from '../store/db.js'

let baseUrl = ''

export async function initApi() {
  baseUrl = await getSetting('serverUrl', '')
}

async function request(method, path, body = null) {
  if (!baseUrl) await initApi()
  if (!baseUrl) throw new Error('Keine Server-Verbindung konfiguriert')

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000),
  }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${baseUrl}${path}`, opts)
  if (!res.ok) throw new Error(`Server-Fehler: ${res.status}`)
  return res.json()
}

export async function checkConnection() {
  try {
    const data = await request('GET', '/api/sync/status')
    return { connected: true, version: data.version || '?' }
  } catch {
    return { connected: false, version: null }
  }
}

export async function fetchProject() {
  return request('GET', '/api/project')
}

export async function uploadPhoto(photoRecord) {
  if (!baseUrl) await initApi()
  if (!baseUrl) throw new Error('Keine Server-Verbindung konfiguriert')

  const form = new FormData()
  form.append('photo', photoRecord.blob, photoRecord.meta?.filename || 'photo.jpg')
  form.append('meta', JSON.stringify(photoRecord.meta))
  if (photoRecord.gps) form.append('gps', JSON.stringify(photoRecord.gps))

  const res = await fetch(`${baseUrl}/api/photos`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`Upload fehlgeschlagen: ${res.status}`)
  return res.json()
}

export async function fetchProtocol(id) {
  return request('GET', `/api/protocol/${id}`)
}

export async function pushProtocol(id, data) {
  return request('PUT', `/api/protocol/${id}`, data)
}

export async function importProtocol(id, data) {
  return request('POST', `/api/protocol/${id}/import`, data)
}

export function setBaseUrl(url) {
  baseUrl = url.replace(/\/+$/, '')
}
