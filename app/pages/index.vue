<script setup lang="ts">
const icons = useAppConfig()

const { openNewExpenseModal, openEditExpenseModal, formatCurrency, formatDate, triggerRefresh, openIncomeModal } = useFinanzas()
const { isOnline, enqueueAction } = useOfflineSync()
const toast = useToast()

const { data: dashboard, pending, refresh } = useCachedFetch('/api/dashboard', {
  key: 'dashboard'
})

useDailyRefresh(() => dashboard.value?.fechaConsulta, refresh)

const deletingId = ref<number | null>(null)
const deleteGasto = async (id: number) => {
  if (!confirm('¿Estás seguro de eliminar este gasto?')) return
  deletingId.value = id

  if (!isOnline.value) {
    enqueueAction({
      tipo: 'gasto_delete',
      url: `/api/gastos/${id}`,
      method: 'DELETE',
      descripcion: `Eliminar gasto #${id}`
    })
    toast.add({
      title: 'Eliminación guardada offline',
      description: 'Se aplicará en el servidor al conectarte.',
      color: 'warning',
      icon: icons.appIcons.cloudOff
    })
    deletingId.value = null
    return
  }

  try {
    await $fetch(`/api/gastos/${id}`, { method: 'DELETE' })
    toast.add({
      title: 'Gasto eliminado',
      color: 'success',
      icon: icons.ui.icons.trash
    })
    await triggerRefresh(['dashboard', 'gastos'])
  } catch (err: any) {
    if (!navigator.onLine || err?.name === 'FetchError') {
      enqueueAction({
        tipo: 'gasto_delete',
        url: `/api/gastos/${id}`,
        method: 'DELETE',
        descripcion: `Eliminar gasto #${id}`
      })
      toast.add({
        title: 'Eliminación guardada offline',
        description: 'Se aplicará en el servidor al conectarte.',
        color: 'warning',
        icon: icons.appIcons.cloudOff
      })
    } else {
      toast.add({
        title: 'Error',
        description: err?.message || 'No se pudo eliminar el gasto',
        color: 'error'
      })
    }
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="min-w-0 space-y-4">
    <!-- Estado de Carga -->
    <div
      v-if="pending && !dashboard"
      class="py-20 flex flex-col items-center justify-center gap-3"
    >
      <UIcon
        :name="icons.ui.icons.loading"
        class="w-8 h-8 text-primary animate-spin"
      />
      <span class="text-sm text-muted">Cargando tablero financiero...</span>
    </div>

    <template v-else-if="dashboard">
      <div class="page-header">
        <div><h1>Inicio</h1><p>Tu presupuesto y movimientos del período actual.</p></div>
        <UBadge
          color="neutral"
          variant="outline"
        >
          {{ dashboard.periodo.etiqueta }}
        </UBadge>
      </div>
      <ActiveCardHero :tarjeta-activa="dashboard.tarjetaActiva" />

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <UCard :ui="{ body: 'p-4 sm:p-5' }">
          <p class="text-xs font-medium text-muted">
            Disponible hoy
          </p>
          <p
            class="mt-2 text-3xl font-semibold tracking-tight tabular-nums"
            :class="dashboard.resumenDiario?.excesoHoy ? 'text-error' : 'text-primary'"
          >
            {{ dashboard.resumenDiario ? formatCurrency(dashboard.resumenDiario.disponibleHoy) : '—' }}
          </p>
          <p
            v-if="dashboard.resumenDiario?.excesoHoy"
            class="mt-1 text-xs text-error"
          >
            Excedido hoy por {{ formatCurrency(dashboard.resumenDiario.excesoHoy) }}
          </p>
          <p
            v-if="dashboard.resumenDiario"
            class="mt-2 text-xs text-muted"
          >
            Presupuesto inicial: {{ formatCurrency(dashboard.resumenDiario.presupuestoHoy) }} · Gastado hoy: {{ formatCurrency(dashboard.resumenDiario.gastadoHoy) }}
          </p>
          <p class="mt-1 text-xs text-muted">
            Repartido entre {{ dashboard.periodo.diasRestantes + 1 }} días, incluyendo hoy.
          </p>
        </UCard>
        <UCard :ui="{ body: 'p-4 sm:p-5' }">
          <p class="text-xs font-medium text-muted">
            Disponible del ciclo
          </p>
          <p
            class="mt-2 text-3xl font-semibold tracking-tight tabular-nums"
            :class="dashboard.resumenGasto.excedido ? 'text-error' : 'text-highlighted'"
          >
            {{ formatCurrency(dashboard.resumenGasto.restante) }}
          </p>
          <p class="mt-2 text-xs text-muted">
            De {{ formatCurrency(dashboard.resumenGasto.limite) }} presupuestados.
          </p>
          <p
            v-if="dashboard.resumenGasto.excedido"
            class="mt-1 text-xs text-error"
          >
            Límite superado por {{ formatCurrency(dashboard.resumenGasto.totalGastado - dashboard.resumenGasto.limite) }}
          </p>
        </UCard>
        <UCard :ui="{ body: 'p-4 sm:p-5' }">
          <p class="text-xs font-medium text-muted">
            Ahorro del período
          </p>
          <p
            class="mt-2 text-3xl font-semibold tracking-tight tabular-nums"
            :class="(dashboard.resumenAhorro.ahorro ?? 0) < 0 ? 'text-error' : 'text-highlighted'"
          >
            {{ dashboard.resumenAhorro.tieneIngreso ? formatCurrency(dashboard.resumenAhorro.ahorro) : '—' }}
          </p>
          <p
            v-if="dashboard.resumenAhorro.tieneIngreso"
            class="mt-2 text-xs text-muted"
          >
            Ingreso: {{ formatCurrency(dashboard.resumenAhorro.totalIngreso) }} · {{ dashboard.resumenAhorro.porcentajeAhorro }}% ahorrado
          </p>
          <UButton
            v-else
            size="xs"
            color="neutral"
            variant="outline"
            label="Registrar ingreso"
            class="mt-3"
            @click="openIncomeModal()"
          />
        </UCard>
      </div>
      <PeriodProgressBar
        :periodo="dashboard.periodo"
        :resumen-gasto="dashboard.resumenGasto"
        :resumen-diario="dashboard.resumenDiario"
      />

      <!-- 3. Grid de Desglose por Tarjeta y Categorías -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardBreakdown :resumen-gasto="dashboard.resumenGasto" />
        <CategoryBreakdown :categorias="dashboard.desgloseCategorias" />
      </div>

      <!-- 4. Sección de Últimos Gastos Registrados -->
      <UCard :ui="{ body: 'p-4 sm:p-5 space-y-4' }">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <UIcon
                :name="icons.appIcons.receipt"
                class="w-5 h-5"
              />
            </div>
            <div>
              <h3 class="font-bold text-highlighted">
                Últimos movimientos
              </h3>
              <p class="text-xs text-muted">
                Los cinco gastos más recientes del ciclo
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              to="/gastos"
              variant="ghost"
              color="neutral"
              size="xs"
              :icon="icons.ui.icons.arrowRight"
              trailing
              label="Ver todos"
            />
            <UButton
              size="xs"
              color="primary"
              :icon="icons.ui.icons.plus"
              label="Nuevo Gasto"
              @click="openNewExpenseModal()"
            />
          </div>
        </div>

        <!-- Tabla / Lista de Gastos -->
        <div
          v-if="dashboard.ultimosGastos.length === 0"
          class="text-center py-10 text-muted text-sm space-y-3"
        >
          <UIcon
            :name="icons.appIcons.inbox"
            class="w-10 h-10 mx-auto opacity-40"
          />
          <p>No hay gastos registrados en este período actual.</p>
          <UButton
            size="sm"
            color="primary"
            variant="outline"
            :icon="icons.ui.icons.plus"
            label="Registrar primer gasto"
            @click="openNewExpenseModal()"
          />
        </div>

        <div
          v-else
          class="overflow-x-auto"
        >
          <table class="data-table">
            <thead class="text-xs text-muted uppercase border-b border-default">
              <tr>
                <th class="py-2.5 px-3 font-semibold">
                  Fecha
                </th>
                <th class="py-2.5 px-3 font-semibold">
                  Tarjeta
                </th>
                <th class="py-2.5 px-3 font-semibold">
                  Descripción
                </th>
                <th class="py-2.5 px-3 font-semibold">
                  Categoría
                </th>
                <th class="py-2.5 px-3 font-semibold text-right">
                  Monto
                </th>
                <th class="py-2.5 px-3 font-semibold text-center">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr
                v-for="gasto in dashboard.ultimosGastos"
                :key="gasto.id"
                class="hover:bg-muted transition-colors"
              >
                <td class="py-3 px-3 font-medium whitespace-nowrap">
                  {{ formatDate(gasto.fecha) }}
                </td>
                <td class="py-3 px-3 whitespace-nowrap">
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    size="sm"
                  >
                    <CardIdentifier
                      :name="gasto.tarjeta?.nombre || 'Tarjeta'"
                      :color="gasto.tarjeta?.color"
                    />
                  </UBadge>
                </td>
                <td class="py-3 px-3 font-medium text-highlighted max-w-[200px]">
                  <div class="truncate">
                    {{ gasto.descripcion }}
                  </div>
                  <div
                    v-if="gasto.periodoPagoInfo"
                    class="text-[10px] font-normal flex items-center gap-1 mt-0.5"
                    :class="gasto.periodoPagoInfo.esDiferido ? 'text-info font-medium' : 'text-muted'"
                  >
                    <UIcon
                      :name="gasto.periodoPagoInfo.esDiferido ? icons.appIcons.calendarClock : icons.appIcons.calendarCheck"
                      class="w-3 h-3 shrink-0"
                    />
                    <span class="truncate">{{ gasto.periodoPagoInfo.esDiferido ? 'Diferido: se paga ' + formatDate(gasto.periodoPagoInfo.fechaPagoEstimada) : 'Corte actual' }}</span>
                  </div>
                </td>
                <td class="py-3 px-3 text-muted whitespace-nowrap">
                  <span class="inline-flex items-center gap-1 text-xs">
                    <span class="w-1.5 h-1.5 rounded-full bg-muted" />
                    {{ gasto.categoria || 'General' }}
                  </span>
                </td>
                <td class="py-3 px-3 text-right font-bold text-highlighted whitespace-nowrap">
                  {{ formatCurrency(gasto.monto) }}
                </td>
                <td class="py-3 px-3 text-center whitespace-nowrap">
                  <div class="flex items-center justify-center gap-1">
                    <UButton
                      aria-label="Editar gasto"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      :icon="icons.ui.icons.edit"
                      @click="openEditExpenseModal(gasto)"
                    />
                    <UButton
                      aria-label="Eliminar gasto"
                      size="xs"
                      color="error"
                      variant="ghost"
                      :icon="icons.ui.icons.trash"
                      :loading="deletingId === gasto.id"
                      @click="deleteGasto(gasto.id)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </template>
  </div>
</template>
