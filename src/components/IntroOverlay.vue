<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['done'])
const visible = ref(true)
const base = import.meta.env.BASE_URL || '/'
let timer = null

onMounted(() => {
  timer = setTimeout(() => skip(), 5000)
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})

function skip() {
  visible.value = false
  emit('done')
}
</script>

<template>
  <div v-if="visible" class="intro-overlay" @click.self="skip">
    <iframe class="intro-frame" :src="`${base}btbasics_intro_final.html`"
            frameborder="0" allowfullscreen />
    <button class="skip-btn" @click="skip">Überspringen ›</button>
  </div>
</template>

<style scoped>
.intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.intro-frame {
  width: 100%;
  height: 100%;
  border: none;
}
.skip-btn {
  position: absolute;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  right: 20px;
  background: rgba(15,110,86,.6);
  color: #e8f5f0;
  border: 1px solid rgba(159,225,203,.25);
  border-radius: 20px;
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: background .2s;
  z-index: 10;
}
.skip-btn:active { background: rgba(15,110,86,.9); }
</style>
