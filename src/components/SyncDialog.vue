<script setup>
import { ref } from 'vue'

const props = defineProps({
  conflict: {
    type: Object,
    default: () => ({ localVersion: '', remoteVersion: '', label: '' }),
  },
})

const emit = defineEmits(['resolve', 'close'])

const choice = ref('')

function pick(action) {
  choice.value = action
  emit('resolve', action)
}
</script>

<template>
  <div class="sd-overlay" @click.self="emit('close')">
    <div class="sd-card">
      <h3 class="sd-title">Sync-Konflikt</h3>
      <p class="sd-desc">
        {{ conflict.label || 'Daten wurden auf beiden Seiten geändert.' }}
      </p>

      <div class="sd-versions">
        <div class="sd-version">
          <span class="sd-vlabel">Lokal</span>
          <span class="sd-vval mono">v{{ conflict.localVersion || '?' }}</span>
        </div>
        <div class="sd-version">
          <span class="sd-vlabel">Server</span>
          <span class="sd-vval mono">v{{ conflict.remoteVersion || '?' }}</span>
        </div>
      </div>

      <div class="sd-actions">
        <button class="btn btn-ghost" @click="pick('keepLocal')">
          Lokal behalten
        </button>
        <button class="btn btn-primary" @click="pick('overwrite')">
          Überschreiben
        </button>
        <button class="btn btn-ghost" @click="pick('duplicate')">
          Als Kopie importieren
        </button>
      </div>

      <button class="sd-close" @click="emit('close')">Abbrechen</button>
    </div>
  </div>
</template>

<style scoped>
.sd-overlay {
  position: fixed; inset: 0; z-index: 400;
  background: var(--overlay);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.sd-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  max-width: 360px; width: 100%;
}
.sd-title { font-size: 17px; font-weight: 600; margin-bottom: 8px; }
.sd-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; }
.sd-versions { display: flex; gap: 12px; margin-bottom: 18px; }
.sd-version {
  flex: 1; text-align: center; padding: 10px;
  border-radius: var(--radius-sm); background: var(--pill-bg); border: 1px solid var(--border);
}
.sd-vlabel { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.sd-vval { display: block; font-size: 15px; font-weight: 600; }
.mono { font-family: var(--font-mono); }
.sd-actions { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.sd-actions .btn { width: 100%; justify-content: center; }
.sd-close {
  display: block; width: 100%; padding: 8px;
  background: none; border: none; color: var(--text-muted);
  font-size: 13px; cursor: pointer; text-align: center;
}
</style>
