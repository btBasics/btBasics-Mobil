<script setup>
import { ref, onMounted, inject, computed } from 'vue'

const props = defineProps({ blobs: Array, gps: Object })
const navigate = inject('navigate')

const canvasEl = ref(null)
const currentIdx = ref(0)
const tool = ref('pen')
const color = ref('#ff0000')
const lineWidth = ref(3)
const drawing = ref(false)
const paths = ref([])
const redoStack = ref([])
const imgLoaded = ref(false)
let ctx = null
let imgEl = null
let lastX = 0, lastY = 0
let canvasRect = null

const colors = ['#ff0000', '#f1c40f', '#2ecc71', '#ffffff', '#000000']
const widths = [2, 4, 7]
const tools = [
  { id: 'pen', label: '✏️' },
  { id: 'line', label: '╱' },
  { id: 'circle', label: '○' },
  { id: 'rect', label: '▭' },
  { id: 'arrow', label: '→' },
  { id: 'text', label: 'T' },
]

const currentBlob = computed(() => props.blobs?.[currentIdx.value])

onMounted(() => loadImage())

function loadImage() {
  if (!currentBlob.value || !canvasEl.value) return
  imgLoaded.value = false
  imgEl = new Image()
  const url = URL.createObjectURL(currentBlob.value)
  imgEl.onload = () => {
    URL.revokeObjectURL(url)
    const canvas = canvasEl.value
    const container = canvas.parentElement
    const maxW = container.clientWidth
    const maxH = container.clientHeight
    const scale = Math.min(maxW / imgEl.width, maxH / imgEl.height, 1)
    canvas.width = Math.round(imgEl.width * scale)
    canvas.height = Math.round(imgEl.height * scale)
    ctx = canvas.getContext('2d')
    redraw()
    imgLoaded.value = true
  }
  imgEl.src = url
}

function redraw() {
  if (!ctx || !imgEl) return
  ctx.clearRect(0, 0, canvasEl.value.width, canvasEl.value.height)
  ctx.drawImage(imgEl, 0, 0, canvasEl.value.width, canvasEl.value.height)
  for (const p of paths.value) drawPath(p)
}

function drawPath(p) {
  ctx.strokeStyle = p.color
  ctx.fillStyle = p.color
  ctx.lineWidth = p.lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (p.tool === 'pen' && p.points.length > 1) {
    ctx.beginPath()
    ctx.moveTo(p.points[0].x, p.points[0].y)
    for (let i = 1; i < p.points.length; i++) ctx.lineTo(p.points[i].x, p.points[i].y)
    ctx.stroke()
  } else if (p.tool === 'line') {
    ctx.beginPath()
    ctx.moveTo(p.x1, p.y1)
    ctx.lineTo(p.x2, p.y2)
    ctx.stroke()
  } else if (p.tool === 'circle') {
    const rx = Math.abs(p.x2 - p.x1) / 2
    const ry = Math.abs(p.y2 - p.y1) / 2
    const cx = (p.x1 + p.x2) / 2
    const cy = (p.y1 + p.y2) / 2
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (p.tool === 'rect') {
    ctx.strokeRect(p.x1, p.y1, p.x2 - p.x1, p.y2 - p.y1)
  } else if (p.tool === 'arrow') {
    ctx.beginPath()
    ctx.moveTo(p.x1, p.y1)
    ctx.lineTo(p.x2, p.y2)
    ctx.stroke()
    const angle = Math.atan2(p.y2 - p.y1, p.x2 - p.x1)
    const headLen = 14
    ctx.beginPath()
    ctx.moveTo(p.x2, p.y2)
    ctx.lineTo(p.x2 - headLen * Math.cos(angle - 0.4), p.y2 - headLen * Math.sin(angle - 0.4))
    ctx.moveTo(p.x2, p.y2)
    ctx.lineTo(p.x2 - headLen * Math.cos(angle + 0.4), p.y2 - headLen * Math.sin(angle + 0.4))
    ctx.stroke()
  } else if (p.tool === 'text') {
    ctx.font = `${p.lineWidth * 5 + 10}px system-ui`
    ctx.fillText(p.text, p.x1, p.y1)
  }
}

function getPos(e) {
  canvasRect = canvasEl.value.getBoundingClientRect()
  const touch = e.touches ? e.touches[0] : e
  return {
    x: touch.clientX - canvasRect.left,
    y: touch.clientY - canvasRect.top,
  }
}

function onStart(e) {
  e.preventDefault()
  drawing.value = true
  redoStack.value = []
  const pos = getPos(e)
  lastX = pos.x
  lastY = pos.y

  if (tool.value === 'text') {
    const text = prompt('Text eingeben:')
    if (text) {
      paths.value.push({ tool: 'text', color: color.value, lineWidth: lineWidth.value, x1: pos.x, y1: pos.y, text })
      redraw()
    }
    drawing.value = false
    return
  }

  if (tool.value === 'pen') {
    paths.value.push({ tool: 'pen', color: color.value, lineWidth: lineWidth.value, points: [{ x: pos.x, y: pos.y }] })
  }
}

function onMove(e) {
  if (!drawing.value) return
  e.preventDefault()
  const pos = getPos(e)

  if (tool.value === 'pen') {
    const current = paths.value[paths.value.length - 1]
    current.points.push({ x: pos.x, y: pos.y })
    redraw()
  } else {
    redraw()
    // Live preview
    const preview = { tool: tool.value, color: color.value, lineWidth: lineWidth.value, x1: lastX, y1: lastY, x2: pos.x, y2: pos.y }
    drawPath(preview)
  }
}

function onEnd(e) {
  if (!drawing.value) return
  drawing.value = false
  if (tool.value !== 'pen' && tool.value !== 'text') {
    const pos = e.changedTouches ? { x: e.changedTouches[0].clientX - canvasRect.left, y: e.changedTouches[0].clientY - canvasRect.top } : getPos(e)
    paths.value.push({ tool: tool.value, color: color.value, lineWidth: lineWidth.value, x1: lastX, y1: lastY, x2: pos.x, y2: pos.y })
    redraw()
  }
}

function undo() {
  if (paths.value.length === 0) return
  redoStack.value.push(paths.value.pop())
  redraw()
}

function redo() {
  if (redoStack.value.length === 0) return
  paths.value.push(redoStack.value.pop())
  redraw()
}

function reset() {
  paths.value = []
  redoStack.value = []
  redraw()
}

function getAnnotatedBlob() {
  return new Promise((resolve) => {
    // Render full-res
    const full = document.createElement('canvas')
    full.width = imgEl.naturalWidth || imgEl.width
    full.height = imgEl.naturalHeight || imgEl.height
    const fctx = full.getContext('2d')
    fctx.drawImage(imgEl, 0, 0, full.width, full.height)
    const sx = full.width / canvasEl.value.width
    const sy = full.height / canvasEl.value.height
    for (const p of paths.value) {
      fctx.strokeStyle = p.color
      fctx.fillStyle = p.color
      fctx.lineWidth = p.lineWidth * sx
      fctx.lineCap = 'round'
      fctx.lineJoin = 'round'
      if (p.tool === 'pen' && p.points?.length > 1) {
        fctx.beginPath()
        fctx.moveTo(p.points[0].x * sx, p.points[0].y * sy)
        for (let i = 1; i < p.points.length; i++) fctx.lineTo(p.points[i].x * sx, p.points[i].y * sy)
        fctx.stroke()
      } else if (['line', 'arrow'].includes(p.tool)) {
        fctx.beginPath(); fctx.moveTo(p.x1 * sx, p.y1 * sy); fctx.lineTo(p.x2 * sx, p.y2 * sy); fctx.stroke()
        if (p.tool === 'arrow') {
          const angle = Math.atan2((p.y2 - p.y1) * sy, (p.x2 - p.x1) * sx)
          const hl = 14 * sx
          fctx.beginPath(); fctx.moveTo(p.x2 * sx, p.y2 * sy)
          fctx.lineTo(p.x2 * sx - hl * Math.cos(angle - .4), p.y2 * sy - hl * Math.sin(angle - .4))
          fctx.moveTo(p.x2 * sx, p.y2 * sy)
          fctx.lineTo(p.x2 * sx - hl * Math.cos(angle + .4), p.y2 * sy - hl * Math.sin(angle + .4))
          fctx.stroke()
        }
      } else if (p.tool === 'circle') {
        fctx.beginPath()
        fctx.ellipse((p.x1 + p.x2) / 2 * sx, (p.y1 + p.y2) / 2 * sy,
          Math.abs(p.x2 - p.x1) / 2 * sx, Math.abs(p.y2 - p.y1) / 2 * sy, 0, 0, Math.PI * 2)
        fctx.stroke()
      } else if (p.tool === 'rect') {
        fctx.strokeRect(p.x1 * sx, p.y1 * sy, (p.x2 - p.x1) * sx, (p.y2 - p.y1) * sy)
      } else if (p.tool === 'text') {
        fctx.font = `${(p.lineWidth * 5 + 10) * sx}px system-ui`
        fctx.fillText(p.text, p.x1 * sx, p.y1 * sy)
      }
    }
    full.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
  })
}

async function done() {
  const annotated = paths.value.length > 0 ? await getAnnotatedBlob() : currentBlob.value
  const allBlobs = [...(props.blobs || [])]
  allBlobs[currentIdx.value] = annotated
  navigate('metadata', { blobs: allBlobs, gps: props.gps })
}
</script>

<template>
  <div class="annotation-screen">
    <div class="canvas-area">
      <canvas ref="canvasEl"
              @mousedown="onStart" @mousemove="onMove" @mouseup="onEnd"
              @touchstart="onStart" @touchmove="onMove" @touchend="onEnd" />
    </div>

    <div class="toolbar">
      <div class="tool-row">
        <button v-for="t in tools" :key="t.id"
                class="tool-btn" :class="{ active: tool === t.id }"
                @click="tool = t.id">{{ t.label }}</button>
      </div>
      <div class="tool-row">
        <button v-for="c in colors" :key="c"
                class="color-dot" :class="{ active: color === c }"
                :style="{ background: c }" @click="color = c" />
        <span class="sep" />
        <button v-for="w in widths" :key="w"
                class="width-btn" :class="{ active: lineWidth === w }"
                @click="lineWidth = w">
          <span class="width-dot" :style="{ width: w * 2 + 'px', height: w * 2 + 'px' }" />
        </button>
      </div>
      <div class="tool-row actions">
        <button class="btn btn-ghost" @click="undo">↩ Rückgängig</button>
        <button class="btn btn-ghost" @click="redo">↪ Wiederholen</button>
        <button class="btn btn-ghost" @click="reset">✕ Reset</button>
        <button class="btn btn-primary" @click="done">Weiter ›</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.annotation-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #000;
}
.canvas-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  touch-action: none;
}
canvas {
  max-width: 100%;
  max-height: 100%;
  touch-action: none;
}
.toolbar {
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  padding: 8px 12px calc(8px + var(--safe-bottom));
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tool-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.tool-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-input);
  color: var(--text);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tool-btn.active { border-color: var(--accent); background: var(--pill-bg); }
.color-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
}
.color-dot.active { border-color: var(--accent-light); box-shadow: 0 0 0 2px var(--accent); }
.sep { width: 1px; height: 20px; background: var(--border); margin: 0 4px; }
.width-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-input);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.width-btn.active { border-color: var(--accent); }
.width-dot { border-radius: 50%; background: var(--text); }
.actions { justify-content: flex-end; }
.actions .btn { padding: 7px 14px; font-size: 13px; }
</style>
