<script setup lang="ts">
const icons = useAppConfig()

const { openIncomeModal, openEditIncomeModal, formatCurrency, formatDate, triggerRefresh } = useFinanzas()
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
      icon: icons.appIcons.cloudOff
    })
    deletingId.value = null
    return
  }

  try {
    await $fetch(`/api/ingresos/${id}`, { method: 'DELETE' })
    toast.add({
      title: 'Ingreso eliminado',
      color: 'success',
      icon: icons.ui.icons.trash
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
          Ingresos de Nómina
        </h1>
        <p class="text-sm text-muted">
          Registro manual de pagos recibidos para cálculo de ahorro por período
        </p>
      </div>

      <UButton
        size="md"
        color="primary"
        :icon="icons.ui.icons.plus"
        label="Registrar Nómina"
        class="font-semibold shadow-xs"
        @click="openIncomeModal"
      />
    </div>

    <UCard :ui="{ body: 'p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3' }">
      <div>
        <p class="text-xs text-muted">
          Total registrado
        </p><p class="mt-1 text-2xl font-semibold tabular-nums text-highlighted">
          {{ formatCurrency(ingresosData?.total || 0) }}
        </p>
      </div>
      <p class="max-w-lg text-xs text-muted">
        Los ingresos se vinculan a su período de nómina. El ahorro se calcula restando los gastos del período.
      </p>
    </UCard>

    <!-- Lista de Ingresos -->
    <UCard :ui="{ body: 'p-0 sm:p-0 overflow-hidden' }">
      <div class="p-5 border-b border-default flex items-center justify-between">
        <h3 class="font-bold text-highlighted">
          Historial de Depósitos
        </h3>
        <span class="text-xs text-muted">
          Total acumulado: <strong class="text-highlighted font-semibold">{{ formatCurrency(ingresosData?.total || 0) }}</strong>
        </span>
      </div>

      <div
        v-if="pending"
        class="py-16 text-center text-muted"
      >
        <UIcon
          :name="icons.ui.icons.loading"
          class="w-8 h-8 animate-spin mx-auto mb-2 text-primary"
        />
        <span>Cargando ingresos...</span>
      </div>

      <div
        v-else-if="!ingresosData?.ingresos || ingresosData.ingresos.length === 0"
        class="py-16 text-center text-muted space-y-3"
      >
        <UIcon
          :name="icons.appIcons.piggyBank"
          class="w-12 h-12 mx-auto opacity-30"
        />
        <p class="text-sm">
          Aún no has registrado depósitos de nómina.
        </p>
        <UButton
          size="sm"
          color="primary"
          :icon="icons.ui.icons.plus"
          label="Registrar primer ingreso"
          @click="openIncomeModal"
        />
      </div>

      <div
        v-else
        class="min-w-0"
      >
        <ul
          class="divide-y divide-default px-4 lg:hidden"
          aria-label="Ingresos"
        >
          <li
            v-for="ing in ingresosData.ingresos"
            :key="ing.id"
            class="min-w-0 space-y-3 py-4"
          >
            <div class="flex items-start justify-between gap-3">
              <p class="min-w-0 flex-1 break-words text-sm font-medium text-highlighted [overflow-wrap:anywhere]">
                {{ ing.descripcion || 'Nómina' }}
              </p>
              <span class="shrink-0 text-sm font-semibold tabular-nums text-success">+{{ formatCurrency(ing.monto) }}</span>
            </div>
            <div class="flex items-end justify-between gap-3">
              <div class="space-y-1 text-xs text-muted">
                <p>Depósito: {{ formatDate(ing.fecha) }}</p><p>Registrado: {{ formatDate(ing.fecha_registro.slice(0, 10)) }}</p>
              </div>
              <div class="flex shrink-0 gap-1">
                <UButton
                  :icon="icons.ui.icons.edit"
                  color="neutral"
                  variant="ghost"
                  label="Editar"
                  aria-label="Editar nómina"
                  class="min-h-10 justify-center"
                  @click="openEditIncomeModal(ing)"
                />
                <UButton
                  :icon="icons.ui.icons.trash"
                  color="error"
                  variant="ghost"
                  aria-label="Eliminar ingreso"
                  :loading="deletingId === ing.id"
                  class="min-h-10 min-w-10 justify-center"
                  @click="deleteIngreso(ing.id)"
                />
              </div>
            </div>
          </li>
        </ul>
        <div class="hidden overflow-x-auto lg:block">
          <table class="data-table">
            <thead class="text-xs text-muted uppercase bg-muted border-b border-default">
              <tr>
                <th class="py-3 px-4 font-semibold">
                  Fecha de Nómina
                </th>
                <th class="py-3 px-4 font-semibold">
                  Concepto / Descripción
                </th>
                <th class="py-3 px-4 font-semibold">
                  Fecha de Registro
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
                v-for="ing in ingresosData.ingresos"
                :key="ing.id"
                class="hover:bg-muted transition-colors"
              >
                <td class="py-3.5 px-4 font-bold text-highlighted whitespace-nowrap">
                  {{ formatDate(ing.fecha) }}
                </td>
                <td class="py-3.5 px-4 text-muted">
                  {{ ing.descripcion || 'Nómina' }}
                </td>
                <td class="py-3.5 px-4 text-xs text-muted whitespace-nowrap">
                  {{ formatDate(ing.fecha_registro.slice(0, 10)) }}
                </td>
                <td class="py-3.5 px-4 text-right font-extrabold text-success whitespace-nowrap text-base">
                  +{{ formatCurrency(ing.monto) }}
                </td>
                <td class="py-3.5 px-4 text-center whitespace-nowrap">
                  <UButton
                    aria-label="Editar nómina"
                    label="Editar"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :icon="icons.ui.icons.edit"
                    @click="openEditIncomeModal(ing)"
                  />
                  <UButton
                    aria-label="Eliminar ingreso"
                    size="xs"
                    color="error"
                    variant="ghost"
                    :icon="icons.ui.icons.trash"
                    :loading="deletingId === ing.id"
                    @click="deleteIngreso(ing.id)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </UCard>
  </div>
</template>
