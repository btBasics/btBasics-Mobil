<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  beteiligte: { type: Array, default: () => [] },
  selected: { type: String, default: '' },
  multi: { type: Boolean, default: false },
  multiSelected: { type: Array, default: () => [] },
})

const emit = defineEmits(['pick', 'pickMulti', 'close'])

const chosen = ref([])
const lastUsed = ref([])

onMounted(() => {
  if (props.multi) {
    chosen.value = [...props.multiSelected]
  }
  try {
    const stored = JSON.parse(localStorage.getItem('btb-lastKuerzel') || '[]')
    if (Array.isArray(stored)) lastUsed.value = stored.slice(0, 5)
  } catch { /* ignore */ }
})

const sorted = computed(() => {
  const lu = new Set(lastUsed.value)
  const top = props.beteiligte.filter((b) => lu.has(b.kuerzel))
  const rest = props.beteiligte.filter((b) => !lu.has(b.kuerzel))
  return [...top, ...rest]
})

function isActive(k) {
  if (props.multi) return chosen.value.includes(k)
  return k === props.selected
}

function tap(k) {
  // remember last used
  const lu = [k, ...lastUsed.value.filter((x) => x !== k)].slice(0, 5)
  lastUsed.value = lu
  localStorage.setItem('btb-lastKuerzel', JSON.stringify(lu))

  if (props.multi) {
    const idx = chosen.value.indexOf(k)
    if (idx >= 0) chosen.value.splice(idx, 1)
    else chosen.value.push(k)
  } else {
    emit('pick', k)
  }
}

function confirm() {
  emit('pickMulti', [...chosen.value])
}
</script>

<template>
  <div class="kp-overlay" @click.self="emit('close')">
    <div class="kp-card">
      <div class="kp-header">
        <h3 class="kp-title">Kürzel wählen</h3>
        <button class="kp-close" @click="emit('close')">✕</button>
      </div>

      <div v-if="sorted.length === 0" class="kp-empty">
        Keine Beteiligten konfiguriert.<br/>
        <small>Synchronisiere mit dem Desktop.</small>
      </div>

      <div v-else class="kp-grid">
        <button v-for="b in sorted" :key="b.kuerzel"
                class="kp-btn" :class="{ active: isActive(b.kuerzel) }"
                @click="tap(b.kuerzel)">
          <span class="kp-krz">{{ b.kuerzel }}</span>
          <span v-if="b.name" class="kp-name">{{ b.name }}</span>
        </button>
      </div>

      <div v-if="multi" class="kp-footer">
        <span class="kp-count">{{ chosen.length }} gewählt</span>
        <button class="btn btn-primary" @click="confirm">Übernehmen</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kp-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: var(--overlay);
  display: flex; align-items: flex-end; justify-content: center;
  padding: 0 0 0 0;
}
.kp-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  width: 100%; max-width: 500px;
  max-height: 60vh; overflow-y: auto;
  padding: 16px;
  animation: slideUp .2s ease;
}
@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } }
.kp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.kp-title { font-size: 16px; font-weight: 600; }
.kp-close { background: none; border: none; font-size: 20px; color: var(--text-muted); cursor: pointer; padding: 4px 8px; }
.kp-empty { text-align: center; padding: 30px 10px; color: var(--text-muted); font-size: 14px; }
.kp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; }
.kp-btn {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 12px 6px; border-radius: var(--radius-md); border: 1.5px solid var(--border);
  background: var(--pill-bg); color: var(--text); cursor: pointer;
  transition: background var(--transition), border-color var(--transition);
  min-height: 56px;
}
.kp-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.kp-krz { font-size: 16px; font-weight: 700; font-family: var(--font-mono); }
.kp-name { font-size: 10px; margin-top: 2px; opacity: .7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80px; }
.kp-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }
.kp-count { font-size: 13px; color: var(--text-secondary); }
</style>
