<script setup lang="ts">
const props = defineProps<{
  resumenGasto: {
    totalGastado: number
    gastoTarjetaA: number
    gastoTarjetaB: number
    porcentajeTarjetaA: number
    porcentajeTarjetaB: number
  }
}>()

const { formatCurrency } = useFinanzas()
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

    <!-- Barra combinada proporcional -->
    <div class="space-y-2">
      <div class="w-full bg-muted/20 rounded-full h-3 overflow-hidden flex">
        <div
          class="bg-emerald-500 h-full transition-all duration-500"
          :style="{ width: `${props.resumenGasto.porcentajeTarjetaA}%` }"
          :title="`Tarjeta A: ${props.resumenGasto.porcentajeTarjetaA}%`"
        />
        <div
          class="bg-indigo-500 h-full transition-all duration-500"
          :style="{ width: `${props.resumenGasto.porcentajeTarjetaB}%` }"
          :title="`Tarjeta B: ${props.resumenGasto.porcentajeTarjetaB}%`"
        />
      </div>
    </div>

    <!-- Tarjetas comparativas -->
    <div class="grid grid-cols-2 gap-3 pt-1">
      <div class="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
        <div class="flex items-center justify-between">
          <span class="font-bold text-xs text-emerald-500 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500" />
            Tarjeta A
          </span>
          <span class="text-[11px] text-muted">{{ props.resumenGasto.porcentajeTarjetaA }}%</span>
        </div>
        <div class="text-lg font-extrabold text-foreground">
          {{ formatCurrency(props.resumenGasto.gastoTarjetaA) }}
        </div>
        <span class="text-[11px] text-muted block">Corte día 5 / Paga 6</span>
      </div>

      <div class="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-1">
        <div class="flex items-center justify-between">
          <span class="font-bold text-xs text-indigo-500 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-indigo-500" />
            Tarjeta B
          </span>
          <span class="text-[11px] text-muted">{{ props.resumenGasto.porcentajeTarjetaB }}%</span>
        </div>
        <div class="text-lg font-extrabold text-foreground">
          {{ formatCurrency(props.resumenGasto.gastoTarjetaB) }}
        </div>
        <span class="text-[11px] text-muted block">Corte día 9 / Paga Nómina</span>
      </div>
    </div>
  </div>
</template>
