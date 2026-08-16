<script setup lang="ts">
const props = defineProps<{
  tarjetaActiva: {
    codigo?: string
    info?: { id: number; nombre: string; dia_corte: number; dia_pago_propio_tipo: string; color?: string | null }
    proximoCambio?: { tarjetaNueva?: string; tarjetaNuevaNombre?: string; fechaCambio: string; diasFaltantes: number }
  }
}>()

const { openNewExpenseModal, formatDate } = useFinanzas()

const cardColor = computed(() => props.tarjetaActiva?.info?.color || (props.tarjetaActiva?.codigo === 'B' ? 'indigo' : 'emerald'))

const colorClasses = computed(() => {
  const c = cardColor.value
  switch (c) {
    case 'indigo':
      return {
        cardBg: 'bg-linear-to-br from-indigo-500/15 via-indigo-500/5 to-background border-indigo-500/30',
        glow: 'bg-indigo-400',
        badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
        pill: 'bg-indigo-600',
        btnColor: 'primary' as const
      }
    case 'amber':
      return {
        cardBg: 'bg-linear-to-br from-amber-500/15 via-amber-500/5 to-background border-amber-500/30',
        glow: 'bg-amber-400',
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        pill: 'bg-amber-600',
        btnColor: 'warning' as const
      }
    case 'violet':
    case 'purple':
      return {
        cardBg: 'bg-linear-to-br from-violet-500/15 via-violet-500/5 to-background border-violet-500/30',
        glow: 'bg-violet-400',
        badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
        pill: 'bg-violet-600',
        btnColor: 'primary' as const
      }
    case 'rose':
    case 'red':
      return {
        cardBg: 'bg-linear-to-br from-rose-500/15 via-rose-500/5 to-background border-rose-500/30',
        glow: 'bg-rose-400',
        badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        pill: 'bg-rose-600',
        btnColor: 'error' as const
      }
    case 'sky':
    case 'cyan':
    case 'blue':
      return {
        cardBg: 'bg-linear-to-br from-sky-500/15 via-sky-500/5 to-background border-sky-500/30',
        glow: 'bg-sky-400',
        badge: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
        pill: 'bg-sky-600',
        btnColor: 'info' as const
      }
    default:
      return {
        cardBg: 'bg-linear-to-br from-emerald-500/15 via-emerald-500/5 to-background border-emerald-500/30',
        glow: 'bg-emerald-400',
        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        pill: 'bg-emerald-600',
        btnColor: 'success' as const
      }
  }
})
</script>

<template>
  <div
    class="relative overflow-hidden rounded-2xl border p-6 sm:p-8 transition-all shadow-lg"
    :class="colorClasses.cardBg"
  >
    <!-- Background Glow Effect -->
    <div
      class="absolute -right-16 -top-16 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
      :class="colorClasses.glow"
    />

    <div class="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div class="space-y-3 max-w-xl">
        <div class="flex items-center gap-2.5 flex-wrap">
          <span
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border shadow-xs"
            :class="colorClasses.badge"
          >
            <span class="w-2 h-2 rounded-full animate-ping" :class="colorClasses.glow" />
            Tarjeta Activa Hoy
          </span>

          <span v-if="props.tarjetaActiva?.proximoCambio" class="text-xs text-muted">
            Cambia a <strong class="text-foreground">{{ props.tarjetaActiva.proximoCambio.tarjetaNuevaNombre || props.tarjetaActiva.proximoCambio.tarjetaNueva }}</strong> en {{ props.tarjetaActiva.proximoCambio.diasFaltantes }} {{ props.tarjetaActiva.proximoCambio.diasFaltantes === 1 ? 'día' : 'días' }} ({{ formatDate(props.tarjetaActiva.proximoCambio.fechaCambio) }})
          </span>
        </div>

        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3 flex-wrap">
            <span class="text-muted">Usar:</span>
            <span
              class="px-3.5 py-0.5 rounded-xl font-bold text-white shadow-md"
              :class="colorClasses.pill"
            >
              {{ props.tarjetaActiva?.info?.nombre || 'Tarjeta Principal' }}
            </span>
          </h2>
          <p class="text-sm text-muted mt-2">
            <template v-if="props.tarjetaActiva?.info?.dia_corte">
              Corte el día {{ props.tarjetaActiva.info.dia_corte }}.
              {{ props.tarjetaActiva.info.dia_pago_propio_tipo === 'dia_siguiente_corte' ? 'Se paga el día posterior al corte.' : 'Se paga con el depósito de nómina.' }}
            </template>
            <template v-else>
              Tarjeta recomendada para maximizar tu plazo de financiamiento según el ciclo actual.
            </template>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <UButton
          size="lg"
          :color="colorClasses.btnColor"
          icon="i-lucide-plus"
          label="Registrar Gasto Rápido"
          class="font-semibold shadow-md"
          @click="openNewExpenseModal({ tarjeta_id: props.tarjetaActiva?.info?.id })"
        />
      </div>
    </div>
  </div>
</template>
