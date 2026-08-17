<script setup lang="ts">
const { isOnline, isSyncing, pendingQueue, syncNow } = useOfflineSync()
</script>

<template>
  <ClientOnly>
    <div
      v-if="!isOnline || pendingQueue.length > 0 || isSyncing"
      class="transition-all duration-300 ease-in-out"
    >
      <!-- Estado: Sin conexión -->
      <div
        v-if="!isOnline"
        class="bg-amber-500/10 border border-amber-500/20 text-amber-300 px-4 py-2 rounded-xl flex items-center justify-between text-xs sm:text-sm shadow-xs"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-wifi-off" class="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Modo sin conexión:</strong> Tus registros se guardan en el dispositivo.
            <span v-if="pendingQueue.length > 0" class="ml-1 font-semibold text-amber-200">
              ({{ pendingQueue.length }} pendiente{{ pendingQueue.length > 1 ? 's' : '' }})
            </span>
          </span>
        </div>
      </div>

      <!-- Estado: Sincronizando en progreso -->
      <div
        v-else-if="isSyncing"
        class="bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-xl flex items-center justify-between text-xs sm:text-sm shadow-xs animate-pulse"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-refresh-cw" class="w-4 h-4 animate-spin text-primary shrink-0" />
          <span>Sincronizando {{ pendingQueue.length }} cambio(s) con el servidor...</span>
        </div>
      </div>

      <!-- Estado: Online pero hay pendientes (ej. esperando disparo) -->
      <div
        v-else-if="pendingQueue.length > 0"
        class="bg-blue-500/10 border border-blue-500/20 text-blue-300 px-4 py-2 rounded-xl flex items-center justify-between text-xs sm:text-sm shadow-xs"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-cloud-upload" class="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            Tienes <strong>{{ pendingQueue.length }}</strong> registro(s) pendiente(s) de sincronizar.
          </span>
        </div>
        <UButton
          size="xs"
          color="primary"
          variant="soft"
          icon="i-lucide-refresh-cw"
          label="Sincronizar ahora"
          :loading="isSyncing"
          @click="syncNow"
        />
      </div>
    </div>
  </ClientOnly>
</template>
