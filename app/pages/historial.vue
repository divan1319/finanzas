<script setup lang="ts">
const { refreshKey, formatCurrency } = useFinanzas()

const mesesSeleccionados = ref(6)

const { data: historialData, pending, refresh } = await useFetch('/api/historial', {
  query: computed(() => ({ meses: mesesSeleccionados.value })),
  watch: [refreshKey]
})
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Historial de Períodos</h1>
        <p class="text-sm text-muted">Comparativa histórica de gasto, nómina y ahorro entre períodos</p>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs text-muted">Mostrar últimos:</span>
        <select
          v-model="mesesSeleccionados"
          class="rounded-md border border-muted/30 bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option :value="3">3 períodos</option>
          <option :value="6">6 períodos</option>
          <option :value="12">12 períodos</option>
        </select>
      </div>
    </div>

    <!-- Estado de Carga -->
    <div v-if="pending" class="py-16 text-center text-muted">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
      <span>Calculando historial de períodos...</span>
    </div>

    <div v-else-if="!historialData?.periodos || historialData.periodos.length === 0" class="py-16 text-center text-muted">
      No hay datos de períodos para mostrar.
    </div>

    <!-- Grid de Períodos -->
    <div v-else class="space-y-4">
      <div
        v-for="(p, index) in historialData.periodos"
        :key="p.inicio"
        class="rounded-2xl border border-muted/20 bg-card p-5 sm:p-6 shadow-xs space-y-4 transition-all hover:border-muted/40"
      >
        <!-- Encabezado del Período -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-muted/15 pb-4">
          <div class="flex items-center gap-3">
            <span
              class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono"
              :class="index === 0 ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/20 text-muted'"
            >
              {{ index === 0 ? 'ACT' : `#${index + 1}` }}
            </span>
            <div>
              <h3 class="text-lg font-bold text-foreground">{{ p.etiqueta }}</h3>
              <span class="text-xs text-muted font-mono">{{ p.inicio }} al {{ p.fin }} ({{ p.diasTotales }} días)</span>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <UBadge
              :color="p.cumpleLimite ? 'success' : 'error'"
              variant="subtle"
              size="md"
            >
              {{ p.cumpleLimite ? 'Dentro de Presupuesto' : 'Presupuesto Superado' }} ({{ p.porcentajeLimite }}%)
            </UBadge>
          </div>
        </div>

        <!-- Métricas del Período -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <!-- Total Gastado -->
          <div class="p-3 rounded-xl bg-muted/10 space-y-1">
            <span class="text-muted block">Total Gastado</span>
            <span class="text-lg font-extrabold text-foreground block">
              {{ formatCurrency(p.totalGastado) }}
            </span>
            <span class="text-[11px] text-muted">{{ p.cantidadGastos }} movimientos</span>
          </div>

          <!-- Desglose Tarjetas -->
          <div class="p-3 rounded-xl bg-muted/10 space-y-1">
            <span class="text-muted block">Por Tarjeta</span>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-emerald-500 font-medium">Tarjeta A:</span>
              <span class="font-bold">{{ formatCurrency(p.gastoTarjetaA) }}</span>
            </div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-indigo-500 font-medium">Tarjeta B:</span>
              <span class="font-bold">{{ formatCurrency(p.gastoTarjetaB) }}</span>
            </div>
          </div>

          <!-- Ingreso Nómina -->
          <div class="p-3 rounded-xl bg-muted/10 space-y-1">
            <span class="text-muted block">Nómina Registrada</span>
            <span class="text-lg font-extrabold text-foreground block">
              {{ p.tieneIngreso ? formatCurrency(p.totalIngreso) : 'Sin registro' }}
            </span>
            <span class="text-[11px] text-muted">
              {{ p.tieneIngreso ? 'Depósito confirmado' : 'Pendiente captura' }}
            </span>
          </div>

          <!-- Ahorro Neto -->
          <div
            class="p-3 rounded-xl space-y-1 border"
            :class="[
              !p.tieneIngreso
                ? 'border-muted/20 bg-muted/5 text-muted'
                : (p.ahorro || 0) >= 0
                  ? 'border-emerald-500/20 bg-emerald-500/10'
                  : 'border-red-500/20 bg-red-500/10'
            ]"
          >
            <span class="text-muted block">Ahorro Neto</span>
            <span
              class="text-lg font-extrabold block"
              :class="[
                !p.tieneIngreso
                  ? 'text-muted'
                  : (p.ahorro || 0) >= 0
                    ? 'text-emerald-500'
                    : 'text-red-500'
              ]"
            >
              {{ p.tieneIngreso ? formatCurrency(p.ahorro) : '—' }}
            </span>
            <span class="text-[11px] text-muted">
              {{ p.tieneIngreso ? ((p.ahorro || 0) >= 0 ? 'Ahorro positivo' : 'Déficit del período') : 'Sin nómina' }}
            </span>
          </div>
        </div>

        <!-- Barra comparativa de tarjetas en el período -->
        <div v-if="p.totalGastado > 0" class="pt-1">
          <div class="w-full bg-muted/20 rounded-full h-1.5 overflow-hidden flex">
            <div
              class="bg-emerald-500 h-full"
              :style="{ width: `${Math.round((p.gastoTarjetaA / p.totalGastado) * 100)}%` }"
            />
            <div
              class="bg-indigo-500 h-full"
              :style="{ width: `${Math.round((p.gastoTarjetaB / p.totalGastado) * 100)}%` }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
