<script setup lang="ts">
export interface DesgloseTarjetaItem {
  id: number
  nombre: string
  codigo: string
  color: string
  dia_corte?: number
  dia_pago_propio_tipo?: string
  es_principal?: boolean
  total: number
  porcentaje: number
}

const props = defineProps<{
  resumenGasto: {
    totalGastado: number
    gastoTarjetaA?: number
    gastoTarjetaB?: number
    porcentajeTarjetaA?: number
    porcentajeTarjetaB?: number
    desgloseTarjetas?: DesgloseTarjetaItem[]
  }
}>()

const { formatCurrency } = useFinanzas()

const tarjetas = computed(() => {
  if (props.resumenGasto.desgloseTarjetas && props.resumenGasto.desgloseTarjetas.length > 0) {
    return props.resumenGasto.desgloseTarjetas
  }
  return [
    {
      id: 1,
      nombre: 'Tarjeta A',
      codigo: 'A',
      color: 'emerald',
      dia_corte: 5,
      dia_pago_propio_tipo: 'dia_siguiente_corte',
      total: props.resumenGasto.gastoTarjetaA || 0,
      porcentaje: props.resumenGasto.porcentajeTarjetaA || 0
    },
    {
      id: 2,
      nombre: 'Tarjeta B',
      codigo: 'B',
      color: 'indigo',
      dia_corte: 9,
      dia_pago_propio_tipo: 'dia_nomina',
      total: props.resumenGasto.gastoTarjetaB || 0,
      porcentaje: props.resumenGasto.porcentajeTarjetaB || 0
    }
  ]
})
</script>

<template>
  <UCard
    :ui="{ body: 'p-4 sm:p-5 space-y-4' }"
    class="h-full"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-sm font-semibold text-highlighted">
        Gasto por tarjeta
      </h2>
      <span class="text-xs text-muted">{{ formatCurrency(resumenGasto.totalGastado) }} en total</span>
    </div>
    <div
      v-if="resumenGasto.totalGastado > 0"
      class="flex h-2 overflow-hidden rounded-full bg-accented"
      role="img"
      aria-label="Distribución de gastos por tarjeta"
    >
      <div
        v-for="t in tarjetas"
        :key="t.id"
        :class="cardColorClass(t.color)"
        :style="{ width: `${t.porcentaje}%` }"
        :title="`${t.nombre}: ${t.porcentaje}%`"
      />
    </div>
    <div class="divide-y divide-default">
      <div
        v-for="t in tarjetas"
        :key="t.id"
        class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
      >
        <div class="min-w-0">
          <CardIdentifier
            :name="t.nombre"
            :color="t.color"
            class="text-sm font-medium"
          />
          <p class="mt-1 text-xs text-muted">
            Corte {{ t.dia_corte }} · {{ t.dia_pago_propio_tipo === 'dia_siguiente_corte' ? 'Pago después del corte' : 'Pago en nómina' }}
          </p>
        </div>
        <div class="shrink-0 text-right">
          <p class="text-sm font-semibold tabular-nums text-highlighted">
            {{ formatCurrency(t.total) }}
          </p>
          <p class="text-xs text-muted">
            {{ t.porcentaje }}%
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>
