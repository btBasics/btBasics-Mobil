<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({ photo: { type: Object, required: true } })

const url = ref('')

onMounted(() => {
  if (props.photo.blob) {
    url.value = URL.createObjectURL(props.photo.blob)
  }
})

onUnmounted(() => {
  if (url.value) URL.revokeObjectURL(url.value)
})

const statusLabel = { local: 'Lokal', sent: 'Gesendet', queued: 'Queue' }
</script>

<template>
  <div class="photo-card" role="button" tabindex="0">
    <img v-if="url" :src="url" class="thumb" loading="lazy" />
    <div v-else class="thumb placeholder">📷</div>
    <span class="badge" :class="photo.syncStatus">
      {{ statusLabel[photo.syncStatus] || photo.syncStatus }}
    </span>
    <span v-if="photo.meta?.kuerzel" class="krz">{{ photo.meta.kuerzel }}</span>
  </div>
</template>

<style scoped>
.photo-card {
  position: relative;
  border-radius: var(--radius-sm);
  overflow: hidden;
  aspect-ratio: 1;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--bg-card);
}
.thumb {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.placeholder {
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; background: var(--pill-bg);
}
.badge {
  position: absolute; top: 4px; right: 4px;
  font-size: 9px; padding: 2px 6px; border-radius: 99px;
  backdrop-filter: blur(4px);
}
.badge.local { background: rgba(0,0,0,.5); color: #ccc; }
.badge.sent { background: rgba(46,204,113,.8); color: #fff; }
.badge.queued { background: rgba(241,196,15,.85); color: #1a1a1a; }
.krz {
  position: absolute; bottom: 4px; left: 4px;
  font-size: 10px; font-weight: 700; font-family: var(--font-mono);
  background: rgba(0,0,0,.6); color: #fff; padding: 1px 5px; border-radius: 4px;
}
</style>
