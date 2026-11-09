<script setup lang="ts">
import { periodoActual } from '#shared/utils/cicloFinanciero'

const icons = useAppConfig()

const { openNewExpenseModal, openEditExpenseModal, formatCurrency, formatDate, triggerRefresh, refreshKey } = useFinanzas()
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
const { data: configData } = useCachedFetch('/api/configuracion', {
  key: 'global-config'
})

// Paginación
const page = ref(1)
const itemsPerPage = ref(10)

// Reiniciar página a 1 cuando cambian los filtros
watch([filtroPeriodo, fechaInicio, fechaFin, tarjetaId, categoriaFiltro, search], () => {
  page.value = 1
})

// Cargar gastos con filtros y paginación en servidor
const { data: gastosData, pending, refresh } = useCachedFetch('/api/gastos', {
  key: computed(() => `gastos-${filtroPeriodo.value}-${tarjetaId.value}-${categoriaFiltro.value}-${page.value}-${itemsPerPage.value}-${search.value}-${fechaInicio.value}-${fechaFin.value}`),
  query: computed(() => ({
    page: page.value,
    limit: itemsPerPage.value,
    periodo_nomina: filtroPeriodo.value === 'actual' ? 'actual' : undefined,
    inicio: filtroPeriodo.value === 'custom' ? (fechaInicio.value || undefined) : undefined,
    fin: filtroPeriodo.value === 'custom' ? (fechaFin.value || undefined) : undefined,
    tarjeta_id: tarjetaId.value !== 'todas' ? tarjetaId.value : undefined,
    categoria: categoriaFiltro.value !== 'Todas' ? categoriaFiltro.value : undefined,
    q: search.value || undefined
  }))
})

// Filtered queries have dynamic keys; refresh the active list after a mutation.
watch(refreshKey, () => refresh())

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

const totalGastos = computed(() => gastosData.value?.cantidad || 0)
const totalPaginas = computed(() => gastosData.value?.totalPages || 1)

watch(totalPaginas, (max) => {
  if (page.value > max) {
    page.value = Math.max(1, max)
  }
})

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
        icon: icons.appIcons.cloudOff
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
  <div class="min-w-0 space-y-4">
    <!-- Encabezado -->
    <div class="page-header">
      <div>
        <h1 class="text-xl sm:text-2xl font-semibold tracking-tight">
          Registro de Gastos
        </h1>
        <p class="text-sm text-muted">
          Historial detallado y filtros de movimientos por tarjeta
        </p>
      </div>

      <UButton
        size="md"
        color="primary"
        :icon="icons.ui.icons.plus"
        label="Registrar Gasto"
        class="font-semibold shadow-xs"
        @click="openNewExpenseModal()"
      />
    </div>

    <!-- Barra de Filtros -->
    <UCard :ui="{ body: 'p-4 sm:p-5 space-y-4' }">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- Búsqueda de texto -->
        <UFormField label="Buscar comercio / descripción">
          <UInput
            v-model="search"
            placeholder="Ej. Soriana, Uber..."
            :icon="icons.ui.icons.search"
            class="w-full"
          />
        </UFormField>

        <!-- Filtro Tarjeta -->
        <UFormField label="Tarjeta">
          <USelect
            v-model="tarjetaId"
            :items="[{ label: 'Todas las tarjetas', value: 'todas' }, ...(configData?.tarjetas || []).map(t => ({ label: t.nombre, value: String(t.id) }))]"
            class="w-full"
          />
        </UFormField>

        <!-- Filtro Categoría -->
        <UFormField label="Categoría">
          <USelect
            v-model="categoriaFiltro"
            :items="categorias"
            class="w-full"
          />
        </UFormField>

        <!-- Filtro Rápido de Período -->
        <UFormField label="Rango Temporal">
          <USelect
            v-model="filtroPeriodo"
            :items="[{ label: 'Período actual', value: 'actual' }, { label: 'Todos los tiempos', value: 'todos' }, { label: 'Rango personalizado', value: 'custom' }]"
            class="w-full"
          />
        </UFormField>
      </div>

      <!-- Fechas personalizadas si aplica -->
      <div
        v-if="filtroPeriodo === 'custom'"
        class="grid grid-cols-2 gap-3 pt-2 border-t border-default"
      >
        <UFormField label="Desde">
          <UInput
            v-model="fechaInicio"
            type="date"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Hasta">
          <UInput
            v-model="fechaFin"
            type="date"
            class="w-full"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Resumen de resultados filtrados -->
    <div class="flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-muted">
      <span>Mostrando {{ gastosData?.cantidad || 0 }} movimientos</span>
      <span>
        Total filtrado:
        <strong class="text-sm font-bold text-highlighted">{{ formatCurrency(gastosData?.total || 0) }}</strong>
      </span>
    </div>

    <!-- Tabla Principal de Gastos -->
    <UCard :ui="{ body: 'p-0 sm:p-0 overflow-hidden' }">
      <div
        v-if="pending"
        class="py-16 text-center text-muted"
      >
        <UIcon
          :name="icons.ui.icons.loading"
          class="w-8 h-8 animate-spin mx-auto mb-2 text-primary"
        />
        <span>Cargando gastos...</span>
      </div>

      <div
        v-else-if="!gastosData?.gastos || gastosData.gastos.length === 0"
        class="py-16 text-center text-muted space-y-3"
      >
        <UIcon
          :name="icons.appIcons.receipt"
          class="w-12 h-12 mx-auto opacity-30"
        />
        <p class="text-sm">
          No se encontraron gastos con los filtros seleccionados.
        </p>
        <UButton
          size="sm"
          color="primary"
          :icon="icons.ui.icons.plus"
          label="Registrar Nuevo Gasto"
          @click="openNewExpenseModal()"
        />
      </div>

      <div
        v-else
        class="min-w-0"
      >
        <ExpenseList
          :gastos="gastosData.gastos"
          :deleting-id="deletingId"
          class="lg:hidden px-4"
          @edit="openEditExpenseModal"
          @delete="deleteGasto"
        />
        <div class="hidden overflow-x-auto lg:block">
          <table class="data-table">
            <thead class="text-xs text-muted uppercase bg-muted border-b border-default">
              <tr>
                <th class="py-3 px-4 font-semibold">
                  Fecha
                </th>
                <th class="py-3 px-4 font-semibold">
                  Tarjeta
                </th>
                <th class="py-3 px-4 font-semibold">
                  Descripción
                </th>
                <th class="py-3 px-4 font-semibold">
                  Categoría
                </th>
                <th class="py-3 px-4 font-semibold text-right">
                  Monto
                </th>
                <th class="py-3 px-4 font-semibold text-center">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr
                v-for="g in gastosData.gastos"
                :key="g.id"
                class="hover:bg-muted transition-colors"
              >
                <td class="py-3.5 px-4 font-medium whitespace-nowrap">
                  {{ formatDate(g.fecha) }}
                </td>
                <td class="py-3.5 px-4 whitespace-nowrap">
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    size="sm"
                  >
                    <CardIdentifier
                      :name="g.tarjeta_nombre || 'Tarjeta'"
                      :color="g.tarjeta_color"
                    />
                  </UBadge>
                </td>
                <td class="py-3.5 px-4 font-medium text-highlighted max-w-[260px]">
                  <div class="truncate">
                    {{ g.descripcion }}
                  </div>
                  <div
                    v-if="g.periodoPagoInfo"
                    class="text-[11px] font-normal flex items-center gap-1 mt-0.5"
                    :class="g.periodoPagoInfo.esDiferido ? 'text-info font-medium' : 'text-muted'"
                  >
                    <UIcon
                      :name="g.periodoPagoInfo.esDiferido ? icons.appIcons.calendarClock : icons.appIcons.calendarCheck"
                      class="w-3 h-3 shrink-0"
                    />
                    <span class="truncate">{{ g.periodoPagoInfo.etiquetaPago }}</span>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-muted whitespace-nowrap">
                  <span class="inline-flex items-center gap-1.5 text-xs bg-muted px-2 py-0.5 rounded-md">
                    {{ g.categoria || 'General' }}
                  </span>
                </td>
                <td class="py-3.5 px-4 text-right font-extrabold text-highlighted whitespace-nowrap">
                  {{ formatCurrency(g.monto) }}
                </td>
                <td class="py-3.5 px-4 text-center whitespace-nowrap">
                  <div class="flex items-center justify-center gap-1">
                    <UButton
                      aria-label="Editar gasto"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      :icon="icons.ui.icons.edit"
                      @click="openEditExpenseModal(g)"
                    />
                    <UButton
                      aria-label="Eliminar gasto"
                      size="xs"
                      color="error"
                      variant="ghost"
                      :icon="icons.ui.icons.trash"
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

      <!-- Footer de Paginación -->
      <div
        v-if="totalGastos > 0"
        class="px-4 py-3 border-t border-default bg-muted flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted"
      >
        <div class="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto">
          <span>
            Mostrando {{ (page - 1) * itemsPerPage + 1 }} – {{ Math.min(page * itemsPerPage, totalGastos) }} de {{ totalGastos }} gastos
          </span>
          <USelect
            v-model="itemsPerPage"
            :items="[5, 10, 20, 50].map(value => ({ label: `${value} por pág.`, value }))"
            class="w-36 shrink-0"
            aria-label="Gastos por página"
            @update:model-value="page = 1"
          />
        </div>

        <UPagination
          v-if="totalGastos > itemsPerPage"
          v-model:page="page"
          :total="totalGastos"
          :items-per-page="itemsPerPage"
          size="xs"
          color="neutral"
          variant="subtle"
          :sibling-count="1"
        />
      </div>
    </UCard>
  </div>
</template>
