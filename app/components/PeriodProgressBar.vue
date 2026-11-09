<script setup lang="ts">
import type { ResumenDiario } from '#shared/utils/presupuestoDiario'

const icons = useAppConfig()

const props = defineProps<{
  periodo: {
    inicio: string
    fin: string
    diasTotales: number
    diasRestantes: number
    diasTranscurridos: number
    etiqueta: string
  }
  resumenGasto: {
    limite: number
    totalGastado: number
    restante: number
    porcentajeLimite: number
    excedido: boolean
    tienePresupuestoPersonalizado?: boolean
  }
  resumenDiario?: ResumenDiario
}>()

const { formatCurrency, openBudgetModal } = useFinanzas()

const progressColor = computed(() => {
  if (props.resumenGasto.excedido || props.resumenGasto.porcentajeLimite >= 100) return 'error'
  if (props.resumenGasto.porcentajeLimite >= 80) return 'warning'
  return 'success'
})

const handleEditBudget = () => {
  if (!props.periodo) return
  openBudgetModal({
    inicio: props.periodo.inicio,
    fin: props.periodo.fin,
    etiqueta: props.periodo.etiqueta,
    limite: props.resumenGasto.limite,
    tienePresupuestoPersonalizado: props.resumenGasto.tienePresupuestoPersonalizado
  })
}
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-5 space-y-4' }">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 class="text-sm font-semibold text-highlighted">
          Presupuesto del ciclo
        </h2>
        <p class="mt-1 text-xs text-muted">
          {{ periodo.etiqueta }} · Día {{ periodo.diasTranscurridos }} de {{ periodo.diasTotales }}
        </p>
      </div>
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        :icon="icons.ui.icons.edit"
        :label="formatCurrency(resumenGasto.limite)"
        aria-label="Editar presupuesto del ciclo"
        @click="handleEditBudget"
      />
    </div>
    <div class="flex flex-wrap justify-between gap-2 text-sm">
      <span><strong class="font-semibold text-highlighted">{{ formatCurrency(resumenGasto.totalGastado) }}</strong> <span class="text-muted">gastados</span></span>
      <span class="text-muted">{{ resumenGasto.porcentajeLimite }}% del presupuesto</span>
    </div>
    <UProgress
      :model-value="Math.min(100, resumenGasto.porcentajeLimite)"
      :color="progressColor"
      aria-label="Porcentaje utilizado del presupuesto"
    />
    <p
      v-if="resumenGasto.excedido"
      class="text-xs text-error"
    >
      Límite superado por {{ formatCurrency(resumenGasto.totalGastado - resumenGasto.limite) }}
    </p>
    <p
      v-else
      class="text-xs text-muted"
    >
      {{ periodo.diasRestantes }} {{ periodo.diasRestantes === 1 ? 'día después de hoy' : 'días después de hoy' }} para terminar el ciclo.
    </p>
  </UCard>
</template>
