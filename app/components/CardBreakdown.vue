<script setup lang="ts">
export interface DesgloseTarjetaItem {
  id: number
  nombre: string
  codigo: string
  color: string
  dia_corte?: number
  dia_pago_propio_tipo?: string
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

const getBarColorClass = (color?: string) => {
  switch (color) {
    case 'indigo': return 'bg-indigo-500'
    case 'amber': return 'bg-amber-500'
    case 'violet':
    case 'purple': return 'bg-violet-500'
    case 'rose':
    case 'red': return 'bg-rose-500'
    case 'sky':
    case 'cyan':
    case 'blue': return 'bg-sky-500'
    default: return 'bg-emerald-500'
  }
}

const getCardStyle = (color?: string) => {
  switch (color) {
    case 'indigo':
      return {
        container: 'border-indigo-500/20 bg-indigo-500/5',
        title: 'text-indigo-400',
        dot: 'bg-indigo-500'
      }
    case 'amber':
      return {
        container: 'border-amber-500/20 bg-amber-500/5',
        title: 'text-amber-400',
        dot: 'bg-amber-500'
      }
    case 'violet':
    case 'purple':
      return {
        container: 'border-violet-500/20 bg-violet-500/5',
        title: 'text-violet-400',
        dot: 'bg-violet-500'
      }
    case 'rose':
    case 'red':
      return {
        container: 'border-rose-500/20 bg-rose-500/5',
        title: 'text-rose-400',
        dot: 'bg-rose-500'
      }
    case 'sky':
    case 'cyan':
    case 'blue':
      return {
        container: 'border-sky-500/20 bg-sky-500/5',
        title: 'text-sky-400',
        dot: 'bg-sky-500'
      }
    default:
      return {
        container: 'border-emerald-500/20 bg-emerald-500/5',
        title: 'text-emerald-400',
        dot: 'bg-emerald-500'
      }
  }
}
</script>

<template>
  <div class="rounded-2xl border border-muted/20 bg-card p-6 shadow-xs space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <UIcon name="i-lucide-credit-card" class="w-5 h-5" />
        </div>
        <h3 class="font-bold text-foreground">Gasto por Tarjeta en el Período</h3>
      </div>
      <span class="text-xs text-muted">
        Total: {{ formatCurrency(props.resumenGasto.totalGastado) }}
      </span>
    </div>

    <!-- Barra combinada proporcional multi-tarjeta -->
    <div class="space-y-2">
      <div class="w-full bg-muted/20 rounded-full h-3 overflow-hidden flex">
        <div
          v-for="t in tarjetas"
          :key="t.id"
          class="h-full transition-all duration-500"
          :class="getBarColorClass(t.color)"
          :style="{ width: `${t.porcentaje}%` }"
          :title="`${t.nombre}: ${t.porcentaje}%`"
        />
      </div>
    </div>

    <!-- Tarjetas comparativas dinámicas -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
      <div
        v-for="t in tarjetas"
        :key="t.id"
        class="p-3.5 rounded-xl border space-y-1 transition-all"
        :class="getCardStyle(t.color).container"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="font-bold text-xs flex items-center gap-1.5 truncate" :class="getCardStyle(t.color).title">
            <span class="w-2 h-2 rounded-full shrink-0" :class="getCardStyle(t.color).dot" />
            <span class="truncate">{{ t.nombre }}</span>
          </span>
          <span class="text-[11px] text-muted shrink-0">{{ t.porcentaje }}%</span>
        </div>
        <div class="text-lg font-extrabold text-foreground">
          {{ formatCurrency(t.total) }}
        </div>
        <span class="text-[11px] text-muted block truncate">
          <template v-if="t.dia_corte">Corte día {{ t.dia_corte }}</template>
          <template v-if="t.dia_pago_propio_tipo === 'dia_siguiente_corte'"> • Paga corte + 1</template>
          <template v-else-if="t.dia_pago_propio_tipo === 'dia_nomina'"> • Paga en Nómina</template>
        </span>
      </div>
    </div>
  </div>
</template>
