<script setup lang="ts">
const props = defineProps<{
  tarjetaActiva: {
    codigo: 'A' | 'B'
    info?: { id: number; nombre: string; dia_corte: number; dia_pago_propio_tipo: string; color?: string }
    proximoCambio?: { tarjetaNueva: 'A' | 'B'; fechaCambio: string; diasFaltantes: number }
  }
}>()

const { openNewExpenseModal, formatDate } = useFinanzas()

const esTarjetaA = computed(() => props.tarjetaActiva?.codigo === 'A')
</script>

<template>
  <div
    class="relative overflow-hidden rounded-2xl border p-6 sm:p-8 transition-all shadow-lg"
    :class="[
      esTarjetaA
        ? 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-background border-emerald-500/30'
        : 'bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-background border-indigo-500/30'
    ]"
  >
    <!-- Background Glow Effect -->
    <div
      class="absolute -right-16 -top-16 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
      :class="esTarjetaA ? 'bg-emerald-400' : 'bg-indigo-400'"
    />

    <div class="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div class="space-y-3 max-w-xl">
        <div class="flex items-center gap-2.5 flex-wrap">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border shadow-xs"
            :class="[
              esTarjetaA
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
            ]"
          >
            <span class="w-2 h-2 rounded-full animate-ping" :class="esTarjetaA ? 'bg-emerald-400' : 'bg-indigo-400'" />
            Tarjeta Activa Hoy
          </span>

          <span v-if="props.tarjetaActiva?.proximoCambio" class="text-xs text-muted">
            Cambia a <strong class="text-foreground">Tarjeta {{ props.tarjetaActiva.proximoCambio.tarjetaNueva }}</strong> en {{ props.tarjetaActiva.proximoCambio.diasFaltantes }} {{ props.tarjetaActiva.proximoCambio.diasFaltantes === 1 ? 'día' : 'días' }} ({{ formatDate(props.tarjetaActiva.proximoCambio.fechaCambio) }})
          </span>
        </div>

        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <span>Usar:</span>
            <span
              class="px-3.5 py-0.5 rounded-xl font-mono text-white shadow-md"
              :class="esTarjetaA ? 'bg-emerald-600' : 'bg-indigo-600'"
            >
              Tarjeta {{ props.tarjetaActiva?.codigo }}
            </span>
            <span class="text-base sm:text-xl font-medium text-muted truncate">
              {{ props.tarjetaActiva?.info?.nombre || (esTarjetaA ? 'Corte 5 / Paga 6' : 'Corte 9 / Paga Nómina') }}
            </span>
          </h2>
          <p class="text-sm text-muted mt-2">
            <template v-if="esTarjetaA">
              Se activó el día 6 tras pagarla. Úsala para todos los gastos hasta el día de tu nómina.
            </template>
            <template v-else>
              Se activó en tu día de nómina. Úsala para todos tus gastos hasta el día 6 (corte de Tarjeta A).
            </template>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <UButton
          size="lg"
          :color="esTarjetaA ? 'success' : 'primary'"
          icon="i-lucide-plus"
          label="Registrar Gasto Rápido"
          class="font-semibold shadow-md"
          @click="openNewExpenseModal()"
        />
      </div>
    </div>
  </div>
</template>
