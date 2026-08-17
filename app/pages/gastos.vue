<script setup lang="ts">
import { periodoActual } from '#shared/utils/cicloFinanciero'

const { openNewExpenseModal, openEditExpenseModal, formatCurrency, formatDate, triggerRefresh } = useFinanzas()
const { isOnline, enqueueAction } = useOfflineSync()
const toast = useToast()

// Filtros
const filtroPeriodo = ref<'actual' | 'todos' | 'custom'>('actual')
const fechaInicio = ref('')
const fechaFin = ref('')
const tarjetaId = ref<string>('todas')
const categoriaFiltro = ref('Todas')
const search = ref('')

const periodoHoy = periodoActual(new Date())

// Inicializar fechas con el período actual
watch(filtroPeriodo, (val) => {
  if (val === 'actual') {
    fechaInicio.value = periodoHoy.inicio
    fechaFin.value = periodoHoy.fin
  } else if (val === 'todos') {
    fechaInicio.value = ''
    fechaFin.value = ''
  }
}, { immediate: true })

// Cargar tarjetas
const { data: configData } = await useFetch('/api/configuracion', {
  key: 'global-config'
})

// Cargar gastos con filtros
const { data: gastosData, pending, refresh } = await useFetch('/api/gastos', {
  key: 'gastos',
  query: computed(() => ({
    inicio: fechaInicio.value || undefined,
    fin: fechaFin.value || undefined,
    tarjeta_id: tarjetaId.value !== 'todas' ? tarjetaId.value : undefined,
    categoria: categoriaFiltro.value !== 'Todas' ? categoriaFiltro.value : undefined,
    q: search.value || undefined
  }))
})

const categorias = [
  'Todas',
  'Alimentos',
  'Transporte',
  'Servicios',
  'Ocio & Salidas',
  'Salud & Farmacia',
  'Compras',
  'Hogar',
  'Educación',
  'Suscripciones',
  'Otros'
]

const deletingId = ref<number | null>(null)
const deleteGasto = async (id: number) => {
  if (!confirm('¿Deseas eliminar este gasto?')) return
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
      icon: 'i-lucide-cloud-off'
    })
    deletingId.value = null
    return
  }

  try {
    await $fetch(`/api/gastos/${id}`, { method: 'DELETE' })
    toast.add({
      title: 'Gasto eliminado',
      color: 'success',
      icon: 'i-lucide-trash'
    })
    await triggerRefresh(['dashboard', 'gastos', 'historial', 'reconciliaciones'])
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
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Registro de Gastos</h1>
        <p class="text-sm text-muted">Historial detallado y filtros de movimientos por tarjeta</p>
      </div>

      <UButton
        size="md"
        color="primary"
        icon="i-lucide-plus"
        label="Registrar Gasto"
        class="font-semibold shadow-xs"
        @click="openNewExpenseModal()"
      />
    </div>

    <!-- Barra de Filtros -->
    <div class="rounded-2xl border border-muted/20 bg-card p-4 sm:p-5 shadow-xs space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- Búsqueda de texto -->
        <div>
          <label class="block text-xs font-medium text-muted mb-1">Buscar comercio / descripción</label>
          <UInput
            v-model="search"
            placeholder="Ej. Soriana, Uber..."
            icon="i-lucide-search"
            class="w-full"
          />
        </div>

        <!-- Filtro Tarjeta -->
        <div>
          <label class="block text-xs font-medium text-muted mb-1">Tarjeta</label>
          <select
            v-model="tarjetaId"
            class="w-full rounded-md border border-muted/30 bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="todas">Todas las tarjetas</option>
            <option
              v-for="t in configData?.tarjetas"
              :key="t.id"
              :value="String(t.id)"
            >
              {{ t.nombre }}
            </option>
          </select>
        </div>

        <!-- Filtro Categoría -->
        <div>
          <label class="block text-xs font-medium text-muted mb-1">Categoría</label>
          <select
            v-model="categoriaFiltro"
            class="w-full rounded-md border border-muted/30 bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option v-for="cat in categorias" :key="cat" :value="cat">
              {{ cat }}
            </option>
          </select>
        </div>

        <!-- Filtro Rápido de Período -->
        <div>
          <label class="block text-xs font-medium text-muted mb-1">Rango Temporal</label>
          <select
            v-model="filtroPeriodo"
            class="w-full rounded-md border border-muted/30 bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="actual">Período Nómina Actual</option>
            <option value="todos">Todos los tiempos</option>
            <option value="custom">Rango Personalizado</option>
          </select>
        </div>
      </div>

      <!-- Fechas personalizadas si aplica -->
      <div v-if="filtroPeriodo === 'custom'" class="grid grid-cols-2 gap-3 pt-2 border-t border-muted/15">
        <div>
          <label class="block text-xs text-muted mb-1">Desde</label>
          <UInput v-model="fechaInicio" type="date" class="w-full" />
        </div>
        <div>
          <label class="block text-xs text-muted mb-1">Hasta</label>
          <UInput v-model="fechaFin" type="date" class="w-full" />
        </div>
      </div>
    </div>

    <!-- Resumen de resultados filtrados -->
    <div class="flex items-center justify-between px-2 text-xs text-muted">
      <span>Mostrando {{ gastosData?.cantidad || 0 }} movimientos</span>
      <span>
        Total filtrado:
        <strong class="text-sm font-bold text-foreground">{{ formatCurrency(gastosData?.total || 0) }}</strong>
      </span>
    </div>

    <!-- Tabla Principal de Gastos -->
    <div class="rounded-2xl border border-muted/20 bg-card overflow-hidden shadow-xs">
      <div v-if="pending" class="py-16 text-center text-muted">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
        <span>Cargando gastos...</span>
      </div>

      <div v-else-if="!gastosData?.gastos || gastosData.gastos.length === 0" class="py-16 text-center text-muted space-y-3">
        <UIcon name="i-lucide-receipt" class="w-12 h-12 mx-auto opacity-30" />
        <p class="text-sm">No se encontraron gastos con los filtros seleccionados.</p>
        <UButton
          size="sm"
          color="primary"
          icon="i-lucide-plus"
          label="Registrar Nuevo Gasto"
          @click="openNewExpenseModal()"
        />
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="text-xs text-muted uppercase bg-muted/5 border-b border-muted/20">
            <tr>
              <th class="py-3 px-4 font-semibold">Fecha</th>
              <th class="py-3 px-4 font-semibold">Tarjeta</th>
              <th class="py-3 px-4 font-semibold">Descripción</th>
              <th class="py-3 px-4 font-semibold">Categoría</th>
              <th class="py-3 px-4 font-semibold text-right">Monto</th>
              <th class="py-3 px-4 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-muted/15">
            <tr
              v-for="g in gastosData.gastos"
              :key="g.id"
              class="hover:bg-muted/5 transition-colors"
            >
              <td class="py-3.5 px-4 font-medium whitespace-nowrap">
                {{ formatDate(g.fecha) }}
              </td>
              <td class="py-3.5 px-4 whitespace-nowrap">
                <UBadge
                  :color="g.tarjeta_color === 'indigo' ? 'info' : (g.tarjeta_color === 'amber' ? 'warning' : (g.tarjeta_color === 'rose' || g.tarjeta_color === 'red' ? 'error' : 'success'))"
                  variant="subtle"
                  size="sm"
                >
                  {{ g.tarjeta_nombre }}
                </UBadge>
              </td>
              <td class="py-3.5 px-4 font-medium text-foreground max-w-[260px] truncate">
                {{ g.descripcion }}
              </td>
              <td class="py-3.5 px-4 text-muted whitespace-nowrap">
                <span class="inline-flex items-center gap-1.5 text-xs bg-muted/10 px-2 py-0.5 rounded-md">
                  {{ g.categoria || 'General' }}
                </span>
              </td>
              <td class="py-3.5 px-4 text-right font-extrabold text-foreground whitespace-nowrap">
                {{ formatCurrency(g.monto) }}
              </td>
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div class="flex items-center justify-center gap-1">
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-pencil"
                    @click="openEditExpenseModal(g)"
                  />
                  <UButton
                    size="xs"
                    color="error"
                    variant="ghost"
                    icon="i-lucide-trash"
                    :loading="deletingId === g.id"
                    @click="deleteGasto(g.id)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
