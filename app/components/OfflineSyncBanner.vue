<script setup lang="ts">
const icons = useAppConfig()

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
        class="bg-warning/10 border border-warning/20 text-warning px-4 py-2 rounded-md flex items-center justify-between text-xs sm:text-sm shadow-xs"
      >
        <div class="flex items-center gap-2">
          <UIcon
            :name="icons.appIcons.wifiOff"
            class="w-4 h-4 text-warning shrink-0"
          />
          <span>
            <strong>Modo sin conexión:</strong> Tus registros se guardan en el dispositivo.
            <span
              v-if="pendingQueue.length > 0"
              class="ml-1 font-semibold text-warning"
            >
              ({{ pendingQueue.length }} pendiente{{ pendingQueue.length > 1 ? 's' : '' }})
            </span>
          </span>
        </div>
      </div>

      <!-- Estado: Sincronizando en progreso -->
      <div
        v-else-if="isSyncing"
        class="bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-md flex items-center justify-between text-xs sm:text-sm shadow-xs animate-pulse"
      >
        <div class="flex items-center gap-2">
          <UIcon
            :name="icons.ui.icons.reload"
            class="w-4 h-4 animate-spin text-primary shrink-0"
          />
          <span>Sincronizando {{ pendingQueue.length }} cambio(s) con el servidor...</span>
        </div>
      </div>

      <!-- Estado: Online pero hay pendientes (ej. esperando disparo) -->
      <div
        v-else-if="pendingQueue.length > 0"
        class="bg-info/10 border border-info/20 text-info px-4 py-2 rounded-md flex items-center justify-between text-xs sm:text-sm shadow-xs"
      >
        <div class="flex items-center gap-2">
          <UIcon
            :name="icons.appIcons.cloudUpload"
            class="w-4 h-4 text-info shrink-0"
          />
          <span>
            Tienes <strong>{{ pendingQueue.length }}</strong> registro(s) pendiente(s) de sincronizar.
          </span>
        </div>
        <UButton
          size="xs"
          color="primary"
          variant="soft"
          :icon="icons.ui.icons.reload"
          label="Sincronizar ahora"
          :loading="isSyncing"
          @click="syncNow"
        />
      </div>
    </div>
  </ClientOnly>
</template>
