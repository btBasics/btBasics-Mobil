<script setup>
defineProps({ active: String })
const emit = defineEmits(['nav'])

const tabs = [
  { id: 'camera', label: 'Kamera', icon: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z M9 2 7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.17L15 2H9Z' },
  { id: 'gallery', label: 'Galerie', icon: 'M22 16V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2Zm-11-4 2.03 2.71L16 11l4 5H8l3-4ZM2 6v14a2 2 0 0 0 2 2h14v-2H4V6H2Z' },
  { id: 'protocol', label: 'Protokoll', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm4 18H6V4h7v5h5v11ZM8 15.01V17h1.99l5.9-5.9-1.99-1.99L8 15.01Zm7.35-5.94 1.42-1.42a.5.5 0 0 0 0-.7l-1.3-1.3a.5.5 0 0 0-.7 0l-1.42 1.42 2 2Z' },
  { id: 'settings', label: 'Einstellungen', icon: 'M19.14 12.94a7.07 7.07 0 0 0 .06-.94c0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.04 7.04 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58a7.2 7.2 0 0 0-.07.94c0 .32.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z' },
]
</script>

<template>
  <nav class="bottom-nav">
    <button v-for="tab in tabs" :key="tab.id"
            class="nav-tab" :class="{ active: active === tab.id }"
            @click="emit('nav', tab.id)">
      <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
        <path :d="tab.icon" />
      </svg>
      <span class="nav-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  height: calc(var(--bottomnav-h) + var(--safe-bottom));
  padding-bottom: var(--safe-bottom);
  background: var(--bottomnav-bg);
  border-top: 1px solid var(--bottomnav-border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.nav-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: color var(--transition);
  -webkit-user-select: none;
  user-select: none;
  padding: 0;
}
.nav-tab.active { color: var(--accent-light); }
.nav-icon { width: 24px; height: 24px; }
.nav-label { font-size: 10px; font-weight: 500; letter-spacing: .2px; }
</style>
