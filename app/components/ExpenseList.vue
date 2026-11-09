<script setup lang="ts">
interface ExpenseListItem {
  id: number
  fecha: string
  descripcion: string
  monto: number
  categoria?: string | null
  tarjeta?: { nombre: string, color?: string | null } | null
  tarjeta_nombre?: string | null
  tarjeta_color?: string | null
  periodoPagoInfo?: { esDiferido: boolean, fechaPagoEstimada: string } | null
}

defineProps<{
  gastos: ExpenseListItem[]
  deletingId?: number | null
}>()

const emit = defineEmits<{
  edit: [gasto: ExpenseListItem]
  delete: [id: number]
}>()

const icons = useAppConfig()
const { formatCurrency, formatDate } = useFinanzas()
</script>

<template>
  <ul
    class="divide-y divide-default"
    aria-label="Movimientos"
  >
    <li
      v-for="gasto in gastos"
      :key="gasto.id"
      class="min-w-0 space-y-2.5 py-4"
    >
      <div class="flex items-start justify-between gap-3">
        <p class="min-w-0 flex-1 break-words text-sm font-medium text-highlighted [overflow-wrap:anywhere]">
          {{ gasto.descripcion }}
        </p>
        <span class="shrink-0 text-sm font-semibold tabular-nums text-highlighted">
          {{ formatCurrency(gasto.monto) }}
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <time :datetime="gasto.fecha">{{ formatDate(gasto.fecha) }}</time>
        <CardIdentifier
          :name="gasto.tarjeta?.nombre || gasto.tarjeta_nombre || 'Tarjeta'"
          :color="gasto.tarjeta?.color || gasto.tarjeta_color"
          class="max-w-full"
        />
        <span class="break-words">{{ gasto.categoria || 'General' }}</span>
      </div>
      <div class="flex items-end justify-between gap-3">
        <p
          v-if="gasto.periodoPagoInfo"
          class="min-w-0 flex-1 text-xs"
          :class="gasto.periodoPagoInfo.esDiferido ? 'text-info' : 'text-muted'"
        >
          {{ gasto.periodoPagoInfo.esDiferido ? 'Diferido · ' : '' }}Pago: {{ formatDate(gasto.periodoPagoInfo.fechaPagoEstimada) }}
        </p>
        <span
          v-else
          class="flex-1"
        />
        <div class="flex shrink-0 gap-1">
          <UButton
            :icon="icons.ui.icons.edit"
            color="neutral"
            variant="ghost"
            aria-label="Editar gasto"
            class="min-h-10 min-w-10 justify-center"
            @click="emit('edit', gasto)"
          />
          <UButton
            :icon="icons.ui.icons.trash"
            color="error"
            variant="ghost"
            aria-label="Eliminar gasto"
            :loading="deletingId === gasto.id"
            class="min-h-10 min-w-10 justify-center"
            @click="emit('delete', gasto.id)"
          />
        </div>
      </div>
    </li>
  </ul>
</template>
