<script setup>
import { ref, onMounted, onUnmounted, inject } from 'vue'

const navigate = inject('navigate')
const videoEl = ref(null)
const stream = ref(null)
const cameraReady = ref(false)
const facingMode = ref('environment')
const fileInput = ref(null)

onMounted(() => startCamera())
onUnmounted(() => stopCamera())

async function startCamera() {
  cameraReady.value = false
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode.value, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    })
    if (videoEl.value) {
      videoEl.value.srcObject = stream.value
      videoEl.value.onloadedmetadata = () => { cameraReady.value = true }
    }
  } catch (err) {
    console.warn('Kamera-Zugriff fehlgeschlagen:', err)
  }
}

function stopCamera() {
  if (stream.value) {
    stream.value.getTracks().forEach((t) => t.stop())
    stream.value = null
  }
}

async function flipCamera() {
  stopCamera()
  facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment'
  await startCamera()
}

function capturePhoto() {
  if (!videoEl.value) return
  const v = videoEl.value
  const canvas = document.createElement('canvas')
  canvas.width = v.videoWidth
  canvas.height = v.videoHeight
  canvas.getContext('2d').drawImage(v, 0, 0)
  canvas.toBlob((blob) => {
    if (blob) goToAnnotation([blob])
  }, 'image/jpeg', 0.92)
}

function openFilePicker() {
  fileInput.value?.click()
}

function onFilesSelected(e) {
  const files = Array.from(e.target.files || []).slice(0, 10)
  if (files.length === 0) return
  const blobs = files.filter((f) => f.type.startsWith('image/'))
  if (blobs.length > 0) goToAnnotation(blobs)
  e.target.value = ''
}

async function getGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000 }
    )
  })
}

async function goToAnnotation(blobs) {
  const gps = await getGPS()
  stopCamera()
  navigate('annotation', { blobs, gps })
}
</script>

<template>
  <div class="camera-screen">
    <video ref="videoEl" class="camera-preview" autoplay playsinline muted />

    <div v-if="!cameraReady" class="camera-placeholder">
      <p>Kamera wird gestartet…</p>
    </div>

    <div class="camera-controls">
      <button class="ctrl-btn" @click="openFilePicker" title="Galerie">
        <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
          <path d="M22 16V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2Zm-11-4 2.03 2.71L16 11l4 5H8l3-4ZM2 6v14a2 2 0 0 0 2 2h14v-2H4V6H2Z"/>
        </svg>
      </button>

      <button class="shutter-btn" :disabled="!cameraReady" @click="capturePhoto">
        <span class="shutter-ring" />
      </button>

      <button class="ctrl-btn" @click="flipCamera" title="Kamera wechseln">
        <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
          <path d="M20 5h-3.17L15 3H9L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm-5 11V13H9v3L5 12l4-4v3h6V8l4 4-4 4Z"/>
        </svg>
      </button>
    </div>

    <input ref="fileInput" type="file" accept="image/*" multiple
           class="sr-only" @change="onFilesSelected" />
  </div>
</template>

<style scoped>
.camera-screen {
  position: relative;
  height: 100%;
  background: #000;
  display: flex;
  flex-direction: column;
}
.camera-preview {
  flex: 1;
  width: 100%;
  object-fit: cover;
}
.camera-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 15px;
}
.camera-controls {
  position: absolute;
  bottom: calc(var(--bottomnav-h) + var(--safe-bottom) + 20px);
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 36px;
  padding: 0 24px;
}
.shutter-btn {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: rgba(255,255,255,.15);
  border: 3px solid #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform .15s;
}
.shutter-btn:active { transform: scale(.9); }
.shutter-btn:disabled { opacity: .4; }
.shutter-ring {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: #fff;
}
.ctrl-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,.12);
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ctrl-btn:active { background: rgba(255,255,255,.25); }
</style>
