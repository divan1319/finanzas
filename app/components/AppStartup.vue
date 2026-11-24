<script setup lang="ts">
const starting = ref(true)

onNuxtReady(() => {
  starting.value = false
})
</script>

<template>
  <Transition name="app-startup">
    <div
      v-if="starting"
      class="app-startup"
      role="status"
    >
      <div class="app-startup-content">
        <img
          src="/icon.svg"
          width="128"
          height="128"
          alt=""
          fetchpriority="high"
        >
        <div class="app-startup-status">
          <span>Cargando Finanzas…</span>
          <span
            class="app-startup-progress"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.app-startup {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: var(--ui-bg);
  color: var(--ui-text-muted);
}

.app-startup-content {
  position: relative;
}

.app-startup-status {
  position: absolute;
  inset-block-start: calc(100% + 1.25rem);
  inset-inline: 50% auto;
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  transform: translateX(-50%);
  font-size: 0.875rem;
  white-space: nowrap;
}

.app-startup-progress {
  width: 4rem;
  height: 0.1875rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--ui-bg-elevated);
}

.app-startup-progress::before {
  display: block;
  width: 45%;
  height: 100%;
  border-radius: inherit;
  background: var(--ui-primary);
  content: '';
  animation: app-startup-progress 1.15s ease-in-out infinite;
}

@keyframes app-startup-progress {
  from { transform: translateX(-110%); }
  to { transform: translateX(235%); }
}

.app-startup-leave-active {
  pointer-events: none;
  transition: opacity 160ms ease-out;
}

.app-startup-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .app-startup-progress::before {
    animation: none;
    width: 100%;
  }

  .app-startup-leave-active {
    transition: none;
  }
}

@media (scripting: none) {
  .app-startup {
    display: none;
  }
}
</style>
