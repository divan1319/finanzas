<script setup lang="ts">
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
  }
}>()

const { formatCurrency } = useFinanzas()

const progressColor = computed(() => {
  if (props.resumenGasto.excedido || props.resumenGasto.porcentajeLimite >= 100) return 'error'
  if (props.resumenGasto.porcentajeLimite >= 80) return 'warning'
  return 'success'
})

const presupuestoDiarioRestante = computed(() => {
  if (!props.periodo?.diasRestantes || props.periodo.diasRestantes <= 0) return 0
  return Math.max(0, props.resumenGasto.restante / props.periodo.diasRestantes)
})
</script>

<template>
  <div class="rounded-2xl border border-muted/20 bg-card p-6 shadow-xs space-y-5">
    <!-- Encabezado de período -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <span class="text-xs font-semibold uppercase tracking-wider text-muted">Período de Nómina Actual</span>
        <h3 class="text-lg font-bold text-foreground">{{ props.periodo?.etiqueta }}</h3>
      </div>
      <div class="flex items-center gap-2">
        <UBadge color="neutral" variant="subtle" size="md">
          <UIcon name="i-lucide-clock" class="w-3.5 h-3.5 mr-1" />
          {{ props.periodo?.diasRestantes }} {{ props.periodo?.diasRestantes === 1 ? 'día restante' : 'días restantes' }}
        </UBadge>
        <UBadge
          :color="progressColor"
          variant="subtle"
          size="md"
        >
          {{ props.resumenGasto.porcentajeLimite }}% del límite
        </UBadge>
      </div>
    </div>

    <!-- Barra de Progreso de Gasto -->
    <div class="space-y-2">
      <div class="flex items-baseline justify-between">
        <div>
          <span class="text-2xl font-extrabold text-foreground tracking-tight">
            {{ formatCurrency(props.resumenGasto.totalGastado) }}
          </span>
          <span class="text-xs text-muted ml-1">gastados</span>
        </div>
        <div class="text-right">
          <span class="text-xs text-muted block">Límite mensual</span>
          <span class="text-sm font-semibold text-foreground">
            {{ formatCurrency(props.resumenGasto.limite) }}
          </span>
        </div>
      </div>

      <!-- Barra personalizada estilizada -->
      <div class="w-full bg-muted/20 rounded-full h-3.5 overflow-hidden p-0.5">
        <div
          class="h-full rounded-full transition-all duration-500 ease-out"
          :class="[
            progressColor === 'error'
              ? 'bg-gradient-to-r from-red-500 to-rose-600'
              : progressColor === 'warning'
                ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                : 'bg-gradient-to-r from-emerald-400 to-teal-500'
          ]"
          :style="{ width: `${Math.min(100, props.resumenGasto.porcentajeLimite)}%` }"
        />
      </div>
    </div>

    <!-- Métricas inferiores -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-muted/15 text-xs">
      <div>
        <span class="text-muted block">Disponible para gastar</span>
        <span
          class="font-bold text-sm"
          :class="props.resumenGasto.excedido ? 'text-red-500' : 'text-foreground'"
        >
          {{ props.resumenGasto.excedido ? 'Límite superado por ' + formatCurrency(props.resumenGasto.totalGastado - props.resumenGasto.limite) : formatCurrency(props.resumenGasto.restante) }}
        </span>
      </div>

      <div>
        <span class="text-muted block">Presupuesto sugerido/día</span>
        <span class="font-bold text-sm text-foreground">
          {{ formatCurrency(presupuestoDiarioRestante) }} / día
        </span>
      </div>

      <div class="col-span-2 sm:col-span-1">
        <span class="text-muted block">Progreso del ciclo</span>
        <span class="font-bold text-sm text-foreground">
          Día {{ props.periodo?.diasTranscurridos }} de {{ props.periodo?.diasTotales }}
        </span>
      </div>
    </div>
  </div>
</template>
