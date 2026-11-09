<script setup lang="ts">
const icons = useAppConfig()

defineProps<{
  tarjetaActiva?: {
    codigo?: string
    esPrincipal?: boolean
    motivo?: string
    info?: { id?: number, nombre?: string, dia_corte?: number, dia_pago_propio_tipo?: string, es_principal?: boolean, color?: string | null } | null
    proximoCambio?: { tarjetaNueva?: string, tarjetaNuevaNombre?: string, fechaCambio: string, diasFaltantes: number }
  }
}>()

const { openNewExpenseModal, formatDate } = useFinanzas()
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-5' }">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0 space-y-1">
        <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Tarjeta sugerida hoy</span>
          <UBadge
            v-if="tarjetaActiva?.info?.es_principal || tarjetaActiva?.esPrincipal"
            color="primary"
            variant="subtle"
            size="sm"
          >
            Principal
          </UBadge>
        </div>
        <h2 class="font-semibold text-highlighted">
          <CardIdentifier
            :name="tarjetaActiva?.info?.nombre || 'Tarjeta principal'"
            :color="tarjetaActiva?.info?.color"
          />
        </h2>
        <p class="max-w-2xl text-xs text-muted">
          {{ tarjetaActiva?.motivo || 'Tarjeta recomendada según el ciclo actual.' }}
        </p>
        <p
          v-if="tarjetaActiva?.proximoCambio"
          class="text-xs text-muted"
        >
          Próximo cambio: {{ tarjetaActiva.proximoCambio.tarjetaNuevaNombre || tarjetaActiva.proximoCambio.tarjetaNueva }} · {{ formatDate(tarjetaActiva.proximoCambio.fechaCambio) }}
        </p>
      </div>
      <UButton
        :icon="icons.ui.icons.plus"
        label="Registrar gasto"
        size="sm"
        @click="openNewExpenseModal({ tarjeta_id: tarjetaActiva?.info?.id })"
      />
    </div>
  </UCard>
</template>
