<script setup lang="ts">
const { refreshKey, openNewExpenseModal, openEditExpenseModal, formatCurrency, formatDate } = useFinanzas()
const toast = useToast()

const { data: dashboard, pending, refresh } = await useFetch('/api/dashboard', {
  watch: [refreshKey]
})

const deletingId = ref<number | null>(null)
const deleteGasto = async (id: number) => {
  if (!confirm('¿Estás seguro de eliminar este gasto?')) return
  deletingId.value = id
  try {
    await $fetch(`/api/gastos/${id}`, { method: 'DELETE' })
    toast.add({
      title: 'Gasto eliminado',
      color: 'success',
      icon: 'i-lucide-trash'
    })
    refresh()
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.message || 'No se pudo eliminar el gasto',
      color: 'error'
    })
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Estado de Carga -->
    <div v-if="pending && !dashboard" class="py-20 flex flex-col items-center justify-center gap-3">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 text-primary animate-spin" />
      <span class="text-sm text-muted">Cargando tablero financiero...</span>
    </div>

    <template v-else-if="dashboard">
      <!-- 1. Banner Principal de Tarjeta Activa Hoy -->
      <ActiveCardHero :tarjeta-activa="dashboard.tarjetaActiva" />

      <!-- 2. Grid de Métricas Principales: Presupuesto & Ahorro -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PeriodProgressBar
          :periodo="dashboard.periodo"
          :resumen-gasto="dashboard.resumenGasto"
        />

        <SavingsCard
          :resumen-ahorro="dashboard.resumenAhorro"
          :total-gastado="dashboard.resumenGasto.totalGastado"
        />
      </div>

      <!-- 3. Grid de Desglose por Tarjeta y Categorías -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardBreakdown :resumen-gasto="dashboard.resumenGasto" />
        <CategoryBreakdown :categorias="dashboard.desgloseCategorias" />
      </div>

      <!-- 4. Sección de Últimos Gastos Registrados -->
      <div class="rounded-2xl border border-muted/20 bg-card p-6 shadow-xs space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <UIcon name="i-lucide-receipt" class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-bold text-foreground">Últimos Gastos Registrados</h3>
              <p class="text-xs text-muted">Gastos recientes en cualquiera de las dos tarjetas</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              to="/gastos"
              variant="ghost"
              color="neutral"
              size="xs"
              icon="i-lucide-arrow-right"
              trailing
              label="Ver todos"
            />
            <UButton
              size="xs"
              color="primary"
              icon="i-lucide-plus"
              label="Nuevo Gasto"
              @click="openNewExpenseModal()"
            />
          </div>
        </div>

        <!-- Tabla / Lista de Gastos -->
        <div v-if="dashboard.ultimosGastos.length === 0" class="text-center py-10 text-muted text-sm space-y-3">
          <UIcon name="i-lucide-inbox" class="w-10 h-10 mx-auto opacity-40" />
          <p>Aún no hay gastos registrados en el sistema.</p>
          <UButton
            size="sm"
            color="primary"
            variant="outline"
            icon="i-lucide-plus"
            label="Registrar primer gasto"
            @click="openNewExpenseModal()"
          />
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="text-xs text-muted uppercase border-b border-muted/20">
              <tr>
                <th class="py-2.5 px-3 font-semibold">Fecha</th>
                <th class="py-2.5 px-3 font-semibold">Tarjeta</th>
                <th class="py-2.5 px-3 font-semibold">Descripción</th>
                <th class="py-2.5 px-3 font-semibold">Categoría</th>
                <th class="py-2.5 px-3 font-semibold text-right">Monto</th>
                <th class="py-2.5 px-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-muted/15">
              <tr
                v-for="gasto in dashboard.ultimosGastos"
                :key="gasto.id"
                class="hover:bg-muted/5 transition-colors"
              >
                <td class="py-3 px-3 font-medium whitespace-nowrap">
                  {{ formatDate(gasto.fecha) }}
                </td>
                <td class="py-3 px-3 whitespace-nowrap">
                  <UBadge
                    :color="gasto.tarjeta?.codigo === 'A' ? 'success' : 'info'"
                    variant="subtle"
                    size="sm"
                  >
                    Tarjeta {{ gasto.tarjeta?.codigo || '?' }}
                  </UBadge>
                </td>
                <td class="py-3 px-3 font-medium text-foreground max-w-[200px] truncate">
                  {{ gasto.descripcion }}
                </td>
                <td class="py-3 px-3 text-muted whitespace-nowrap">
                  <span class="inline-flex items-center gap-1 text-xs">
                    <span class="w-1.5 h-1.5 rounded-full bg-muted" />
                    {{ gasto.categoria || 'General' }}
                  </span>
                </td>
                <td class="py-3 px-3 text-right font-bold text-foreground whitespace-nowrap">
                  {{ formatCurrency(gasto.monto) }}
                </td>
                <td class="py-3 px-3 text-center whitespace-nowrap">
                  <div class="flex items-center justify-center gap-1">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-pencil"
                      @click="openEditExpenseModal(gasto)"
                    />
                    <UButton
                      size="xs"
                      color="error"
                      variant="ghost"
                      icon="i-lucide-trash"
                      :loading="deletingId === gasto.id"
                      @click="deleteGasto(gasto.id)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
