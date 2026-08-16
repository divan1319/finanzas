<script setup lang="ts">
const props = defineProps<{
  resumenAhorro: {
    tieneIngreso: boolean
    ingreso?: { id: number; fecha: string; monto: number; descripcion?: string | null; fecha_registro?: string } | null
    totalIngreso: number
    ahorro: number | null
    porcentajeAhorro: number | null
  }
  totalGastado: number
}>()

const { openIncomeModal, formatCurrency, formatDate } = useFinanzas()

const ahorroEsPositivo = computed(() => (props.resumenAhorro?.ahorro ?? 0) >= 0)
</script>

<template>
  <div class="rounded-2xl border border-muted/20 bg-card p-6 shadow-xs space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <UIcon name="i-lucide-piggy-bank" class="w-5 h-5" />
        </div>
        <h3 class="font-bold text-foreground">Ahorro del Período</h3>
      </div>

      <UButton
        v-if="!props.resumenAhorro.tieneIngreso"
        size="xs"
        color="primary"
        variant="subtle"
        icon="i-lucide-plus"
        label="Registrar Nómina"
        @click="openIncomeModal"
      />
      <span v-else class="text-xs text-muted">
        Nómina: {{ formatDate(props.resumenAhorro.ingreso?.fecha) }}
      </span>
    </div>

    <!-- Si tiene ingreso registrado -->
    <div v-if="props.resumenAhorro.tieneIngreso" class="space-y-4">
      <div class="flex items-baseline justify-between">
        <div>
          <span class="text-xs text-muted block">Ahorro Neto Real</span>
          <span
            class="text-2xl font-extrabold tracking-tight"
            :class="ahorroEsPositivo ? 'text-emerald-500' : 'text-red-500'"
          >
            {{ formatCurrency(props.resumenAhorro.ahorro) }}
          </span>
        </div>
        <div class="text-right">
          <UBadge
            :color="ahorroEsPositivo ? 'success' : 'error'"
            variant="subtle"
            size="md"
          >
            {{ props.resumenAhorro.porcentajeAhorro }}% del ingreso
          </UBadge>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 pt-2 border-t border-muted/15 text-xs">
        <div>
          <span class="text-muted block">Ingreso Percibido</span>
          <span class="font-bold text-foreground text-sm">
            {{ formatCurrency(props.resumenAhorro.totalIngreso) }}
          </span>
        </div>
        <div>
          <span class="text-muted block">Total Gastado</span>
          <span class="font-bold text-foreground text-sm">
            {{ formatCurrency(props.totalGastado) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Si NO tiene ingreso registrado -->
    <div v-else class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs space-y-3">
      <div class="flex items-start gap-2.5">
        <UIcon name="i-lucide-alert-circle" class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p class="text-muted text-xs leading-relaxed">
          <strong class="text-foreground">Pendiente de registrar ingreso:</strong> Registra el depósito de nómina de este período para calcular tu ahorro neto y porcentaje real.
        </p>
      </div>

      <UButton
        size="sm"
        color="warning"
        variant="solid"
        icon="i-lucide-plus"
        label="Registrar Nómina Ahora"
        class="w-full justify-center font-medium"
        @click="openIncomeModal"
      />
    </div>
  </div>
</template>
