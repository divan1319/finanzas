<script setup lang="ts">
const { openIncomeModal, formatCurrency, formatDate, triggerRefresh } = useFinanzas()
const { isOnline, enqueueAction } = useOfflineSync()
const toast = useToast()

const { data: ingresosData, pending, refresh } = useCachedFetch('/api/ingresos', {
  key: 'ingresos'
})

const deletingId = ref<number | null>(null)
const deleteIngreso = async (id: number) => {
  if (!confirm('¿Deseas eliminar este registro de ingreso?')) return
  deletingId.value = id

  if (!isOnline.value) {
    enqueueAction({
      tipo: 'ingreso_delete',
      url: `/api/ingresos/${id}`,
      method: 'DELETE',
      descripcion: `Eliminar ingreso #${id}`
    })
    toast.add({
      title: 'Eliminación guardada offline',
      description: 'Se aplicará en el servidor al conectarte.',
      color: 'warning',
      icon: 'i-lucide-cloud-off'
    })
    deletingId.value = null
    return
  }

  try {
    await $fetch(`/api/ingresos/${id}`, { method: 'DELETE' })
    toast.add({
      title: 'Ingreso eliminado',
      color: 'success',
      icon: 'i-lucide-trash'
    })
    await triggerRefresh(['dashboard', 'ingresos', 'historial'])
  } catch (err: any) {
    if (!navigator.onLine || err?.name === 'FetchError') {
      enqueueAction({
        tipo: 'ingreso_delete',
        url: `/api/ingresos/${id}`,
        method: 'DELETE',
        descripcion: `Eliminar ingreso #${id}`
      })
      toast.add({
        title: 'Eliminación guardada offline',
        description: 'Se aplicará en el servidor al conectarte.',
        color: 'warning',
        icon: 'i-lucide-cloud-off'
      })
    } else {
      toast.add({
        title: 'Error al eliminar',
        description: err?.message,
        color: 'error'
      })
    }
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Ingresos de Nómina</h1>
        <p class="text-sm text-muted">Registro manual de pagos recibidos para cálculo de ahorro por período</p>
      </div>

      <UButton
        size="md"
        color="primary"
        icon="i-lucide-plus"
        label="Registrar Nómina"
        class="font-semibold shadow-xs"
        @click="openIncomeModal"
      />
    </div>

    <!-- Banner Explicativo -->
    <div class="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex items-start gap-4">
      <div class="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
        <UIcon name="i-lucide-wallet" class="w-6 h-6" />
      </div>
      <div class="text-xs text-muted space-y-1">
        <strong class="text-foreground text-sm block">Cálculo de Ahorro Automático</strong>
        <p>
          Cada ingreso registrado se vincula automáticamente al período de nómina correspondiente.
          La app calcula en tiempo real tu ahorro neto: <code class="px-1.5 py-0.5 rounded bg-muted/20 text-foreground font-mono">Ahorro = Ingreso - Gastos del Período</code>.
        </p>
      </div>
    </div>

    <!-- Lista de Ingresos -->
    <div class="rounded-2xl border border-muted/20 bg-card overflow-hidden shadow-xs">
      <div class="p-5 border-b border-muted/20 flex items-center justify-between">
        <h3 class="font-bold text-foreground">Historial de Depósitos</h3>
        <span class="text-xs text-muted">
          Total acumulado: <strong class="text-foreground font-semibold">{{ formatCurrency(ingresosData?.total || 0) }}</strong>
        </span>
      </div>

      <div v-if="pending" class="py-16 text-center text-muted">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
        <span>Cargando ingresos...</span>
      </div>

      <div v-else-if="!ingresosData?.ingresos || ingresosData.ingresos.length === 0" class="py-16 text-center text-muted space-y-3">
        <UIcon name="i-lucide-piggy-bank" class="w-12 h-12 mx-auto opacity-30" />
        <p class="text-sm">Aún no has registrado depósitos de nómina.</p>
        <UButton
          size="sm"
          color="primary"
          icon="i-lucide-plus"
          label="Registrar primer ingreso"
          @click="openIncomeModal"
        />
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="text-xs text-muted uppercase bg-muted/5 border-b border-muted/20">
            <tr>
              <th class="py-3 px-4 font-semibold">Fecha de Nómina</th>
              <th class="py-3 px-4 font-semibold">Concepto / Descripción</th>
              <th class="py-3 px-4 font-semibold">Fecha de Registro</th>
              <th class="py-3 px-4 font-semibold text-right">Monto</th>
              <th class="py-3 px-4 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-muted/15">
            <tr
              v-for="ing in ingresosData.ingresos"
              :key="ing.id"
              class="hover:bg-muted/5 transition-colors"
            >
              <td class="py-3.5 px-4 font-bold text-foreground whitespace-nowrap">
                {{ formatDate(ing.fecha) }}
              </td>
              <td class="py-3.5 px-4 text-muted">
                {{ ing.descripcion || 'Nómina' }}
              </td>
              <td class="py-3.5 px-4 text-xs text-muted whitespace-nowrap">
                {{ formatDate(ing.fecha_registro.slice(0, 10)) }}
              </td>
              <td class="py-3.5 px-4 text-right font-extrabold text-emerald-500 whitespace-nowrap text-base">
                +{{ formatCurrency(ing.monto) }}
              </td>
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash"
                  :loading="deletingId === ing.id"
                  @click="deleteIngreso(ing.id)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
