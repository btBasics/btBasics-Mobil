<script setup>
import { ref, onMounted, provide, readonly } from 'vue'
import BottomNav from './components/BottomNav.vue'
import IntroOverlay from './components/IntroOverlay.vue'
import Camera from './screens/Camera.vue'
import Annotation from './screens/Annotation.vue'
import Metadata from './screens/Metadata.vue'
import Gallery from './screens/Gallery.vue'
import Protocol from './screens/Protocol.vue'
import Settings from './screens/Settings.vue'

const screen = ref('camera')
const theme = ref(localStorage.getItem('btb-theme') || 'dark')
const connected = ref(false)
const showIntro = ref(true)

function setTheme(t) {
  theme.value = t
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem('btb-theme', t)
}

function navigate(s, opts) {
  screen.value = s
  if (opts) screenOpts.value = opts
}

const screenOpts = ref({})

provide('theme', readonly(theme))
provide('setTheme', setTheme)
provide('connected', readonly(connected))
provide('setConnected', (v) => { connected.value = v })
provide('navigate', navigate)

onMounted(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
})
</script>

<template>
  <IntroOverlay v-if="showIntro" @done="showIntro = false" />

  <div class="app-shell" v-show="!showIntro">
    <header class="topbar">
      <span class="topbar-title">btBasics</span>
      <span class="topbar-dot" :class="connected ? 'online' : 'offline'"
            :title="connected ? 'Verbunden' : 'Offline'" />
    </header>

    <main class="screen-area">
      <Camera v-if="screen === 'camera'" />
      <Annotation v-else-if="screen === 'annotation'" :blobs="screenOpts.blobs" :gps="screenOpts.gps" />
      <Metadata v-else-if="screen === 'metadata'" :blobs="screenOpts.blobs" :gps="screenOpts.gps" />
      <Gallery v-else-if="screen === 'gallery'" />
      <Protocol v-else-if="screen === 'protocol'" />
      <Settings v-else-if="screen === 'settings'" />
    </main>

    <BottomNav :active="screen" @nav="navigate" />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100dvh;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--topbar-h);
  padding: 0 16px;
  background: var(--topbar-bg);
  border-bottom: 1px solid var(--border);
}
.topbar-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--accent-light);
  letter-spacing: .3px;
}
.topbar-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  transition: background var(--transition);
}
.topbar-dot.online { background: var(--status-erledigt); box-shadow: 0 0 6px var(--status-erledigt); }
.topbar-dot.offline { background: var(--text-muted); }
.screen-area {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(var(--bottomnav-h) + var(--safe-bottom));
}
</style>
