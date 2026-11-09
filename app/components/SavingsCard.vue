<script setup lang="ts">
const icons = useAppConfig()

const props = defineProps<{
  resumenAhorro: {
    tieneIngreso: boolean
    ingreso?: { id: number, fecha: string, monto: number, descripcion?: string | null, fecha_registro?: string } | null
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
  <UCard :ui="{ body: 'p-4 sm:p-5 space-y-4' }">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <UIcon
            :name="icons.appIcons.piggyBank"
            class="w-5 h-5"
          />
        </div>
        <h3 class="font-bold text-highlighted">
          Ahorro del Período
        </h3>
      </div>

      <UButton
        v-if="!props.resumenAhorro.tieneIngreso"
        size="xs"
        color="primary"
        variant="subtle"
        :icon="icons.ui.icons.plus"
        label="Registrar Nómina"
        @click="openIncomeModal"
      />
      <span
        v-else
        class="text-xs text-muted"
      >
        Nómina: {{ formatDate(props.resumenAhorro.ingreso?.fecha) }}
      </span>
    </div>

    <!-- Si tiene ingreso registrado -->
    <div
      v-if="props.resumenAhorro.tieneIngreso"
      class="space-y-4"
    >
      <div class="flex items-baseline justify-between">
        <div>
          <span class="text-xs text-muted block">Ahorro Neto Real</span>
          <span
            class="text-2xl font-extrabold tracking-tight"
            :class="ahorroEsPositivo ? 'text-success' : 'text-error'"
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

      <div class="grid grid-cols-2 gap-3 pt-2 border-t border-default text-xs">
        <div>
          <span class="text-muted block">Ingreso Percibido</span>
          <span class="font-bold text-highlighted text-sm">
            {{ formatCurrency(props.resumenAhorro.totalIngreso) }}
          </span>
        </div>
        <div>
          <span class="text-muted block">Total Gastado</span>
          <span class="font-bold text-highlighted text-sm">
            {{ formatCurrency(props.totalGastado) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Si NO tiene ingreso registrado -->
    <div
      v-else
      class="rounded-md border border-warning/30 bg-warning/10 p-4 text-xs space-y-3"
    >
      <div class="flex items-start gap-2.5">
        <UIcon
          :name="icons.ui.icons.caution"
          class="w-4 h-4 text-warning shrink-0 mt-0.5"
        />
        <p class="text-muted text-xs leading-relaxed">
          <strong class="text-highlighted">Pendiente de registrar ingreso:</strong> Registra el depósito de nómina de este período para calcular tu ahorro neto y porcentaje real.
        </p>
      </div>

      <UButton
        size="sm"
        color="warning"
        variant="solid"
        :icon="icons.ui.icons.plus"
        label="Registrar Nómina Ahora"
        class="w-full justify-center font-medium"
        @click="openIncomeModal"
      />
    </div>
  </UCard>
</template>
