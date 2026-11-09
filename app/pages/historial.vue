<script setup lang="ts">
const icons = useAppConfig()

const { formatCurrency, openBudgetModal } = useFinanzas()

const mesesSeleccionados = ref(6)

const { data: historialData, pending, refresh } = useCachedFetch('/api/historial', {
  key: 'historial',
  query: computed(() => ({ meses: mesesSeleccionados.value }))
})
</script>

<template>
  <div class="min-w-0 space-y-4">
    <div class="page-header">
      <div><h1>Historial de períodos</h1><p>Compara tu presupuesto, gastos y ahorro.</p></div>
      <USelect
        v-model="mesesSeleccionados"
        :items="[3, 6, 12].map(value => ({ label: `${value} períodos`, value }))"
        aria-label="Períodos a mostrar"
        class="w-40"
      />
    </div>
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <div
        v-if="pending"
        class="flex items-center justify-center gap-2 p-10 text-sm text-muted"
        role="status"
      >
        <UIcon
          :name="icons.ui.icons.loading"
          class="size-5 animate-spin"
        />Calculando historial…
      </div>
      <p
        v-else-if="!historialData?.periodos?.length"
        class="p-10 text-center text-sm text-muted"
      >
        No hay períodos para mostrar.
      </p>
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="data-table">
          <caption class="sr-only">
            Comparativa de períodos de nómina
          </caption>
          <thead>
            <tr>
              <th>Período</th><th class="text-right">
                Presupuesto
              </th><th class="text-right">
                Gastado
              </th><th class="text-right">
                Ingreso
              </th><th class="text-right">
                Ahorro
              </th><th>Estado</th>
            </tr>
          </thead>
          <tbody
            v-for="(p, index) in historialData.periodos"
            :key="p.inicio"
          >
            <tr>
              <td class="min-w-48">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-highlighted">{{ p.etiqueta }}</span><UBadge
                    v-if="index === 0"
                    size="sm"
                    variant="subtle"
                  >
                    Actual
                  </UBadge>
                </div><p class="mt-1 text-xs text-muted">
                  {{ p.diasTotales }} días · {{ p.cantidadGastos }} movimientos
                </p>
              </td>
              <td class="text-right">
                <UButton
                  :label="formatCurrency(p.limite)"
                  :icon="icons.ui.icons.edit"
                  :color="p.tienePresupuestoPersonalizado ? 'primary' : 'neutral'"
                  variant="ghost"
                  size="xs"
                  :aria-label="`Editar presupuesto de ${p.etiqueta}`"
                  @click="openBudgetModal({ inicio: p.inicio, fin: p.fin, etiqueta: p.etiqueta, limite: p.limite, tienePresupuestoPersonalizado: p.tienePresupuestoPersonalizado })"
                />
              </td>
              <td class="text-right font-medium tabular-nums text-highlighted">
                {{ formatCurrency(p.totalGastado) }}
              </td>
              <td class="text-right tabular-nums">
                {{ p.tieneIngreso ? formatCurrency(p.totalIngreso) : '—' }}
              </td>
              <td
                class="text-right font-medium tabular-nums"
                :class="!p.tieneIngreso ? 'text-muted' : (p.ahorro ?? 0) < 0 ? 'text-error' : 'text-success'"
              >
                {{ p.tieneIngreso ? formatCurrency(p.ahorro) : '—' }}
              </td>
              <td>
                <UBadge
                  :color="p.cumpleLimite ? 'success' : 'error'"
                  variant="subtle"
                  size="sm"
                >
                  {{ p.porcentajeLimite }}% · {{ p.cumpleLimite ? 'Dentro del límite' : 'Excedido' }}
                </UBadge>
              </td>
            </tr>
            <tr>
              <td
                colspan="6"
                class="!pt-0"
              >
                <details class="text-xs">
                  <summary class="w-fit cursor-pointer rounded text-muted">
                    Desglose por tarjeta
                  </summary>
                  <div class="mt-3 space-y-3 rounded-md bg-muted p-3">
                    <div
                      v-if="p.totalGastado > 0"
                      class="flex h-2 overflow-hidden rounded-full bg-accented"
                      role="img"
                      aria-label="Distribución por tarjeta"
                    >
                      <span
                        v-for="t in p.desgloseTarjetas"
                        :key="t.id"
                        :class="cardColorClass(t.color)"
                        :style="{ width: `${t.porcentaje}%` }"
                        :title="`${t.nombre}: ${t.porcentaje}%`"
                      />
                    </div>
                    <div
                      v-for="t in p.desgloseTarjetas"
                      :key="t.id"
                      class="flex justify-between gap-3"
                    >
                      <CardIdentifier
                        :name="t.nombre"
                        :color="t.color"
                      /><span class="tabular-nums">{{ formatCurrency(t.total) }} · {{ t.porcentaje }}%</span>
                    </div>
                    <p
                      v-if="!p.desgloseTarjetas?.length"
                      class="text-muted"
                    >
                      Sin desglose de tarjetas.
                    </p>
                  </div>
                </details>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
