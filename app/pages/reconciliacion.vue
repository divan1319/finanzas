<script setup lang="ts">
import { formatDateISO } from '#shared/utils/cicloFinanciero'

const icons = useAppConfig()

const { formatCurrency, formatDate, triggerRefresh } = useFinanzas()
const toast = useToast()

const tarjetaId = ref<number>()
const fechaReferencia = ref(formatDateISO(new Date()))
const totalBancoInput = ref('')
const notasInput = ref('')
const saving = ref(false)

const { data: reconciliacionData, pending, refresh } = useCachedFetch('/api/reconciliaciones', {
  key: 'reconciliaciones',
  query: computed(() => ({
    tarjeta_id: tarjetaId.value || undefined,
    fecha: fechaReferencia.value
  }))
})

// Auto-seleccionar la primera tarjeta si no hay ninguna seleccionada
watch(reconciliacionData, (val) => {
  if (val?.tarjetas && val.tarjetas.length > 0 && val.tarjetas[0] && !tarjetaId.value) {
    tarjetaId.value = val.tarjetas[0].id
  }
}, { immediate: true })

const ciclo = computed(() => reconciliacionData.value?.cicloCalculado)
const totalApp = computed(() => ciclo.value?.totalApp || 0)

const diferenciaEnVivo = computed(() => {
  const banco = Number(totalBancoInput.value)
  if (isNaN(banco) || totalBancoInput.value === '') return null
  return Number((banco - totalApp.value).toFixed(2))
})

const guardarReconciliacion = async () => {
  if (!ciclo.value) return

  const totalBanco = Number(totalBancoInput.value)
  if (isNaN(totalBanco) || totalBanco < 0) {
    toast.add({
      title: 'Monto bancario inválido',
      description: 'Ingresa el total que reporta el estado de cuenta.',
      color: 'warning'
    })
    return
  }

  saving.value = true
  try {
    await $fetch('/api/reconciliaciones', {
      method: 'POST',
      body: {
        tarjeta_id: ciclo.value.tarjeta.id,
        ciclo_inicio: ciclo.value.inicio,
        ciclo_fin: ciclo.value.fin,
        total_banco: totalBanco,
        total_app_calculado: totalApp.value,
        notas: notasInput.value
      }
    })

    toast.add({
      title: 'Reconciliación Guardada',
      description: `Ciclo reconciliado con éxito.`,
      color: 'success',
      icon: icons.ui.icons.success
    })

    totalBancoInput.value = ''
    notasInput.value = ''
    refresh()
  } catch (err: any) {
    toast.add({
      title: 'Error al guardar',
      description: err?.message,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

const deletingId = ref<number | null>(null)
const deleteReconciliacion = async (id: number) => {
  if (!confirm('¿Deseas eliminar este registro de reconciliación?')) return
  deletingId.value = id
  try {
    await $fetch(`/api/reconciliaciones/${id}`, { method: 'DELETE' })
    toast.add({
      title: 'Registro eliminado',
      color: 'success',
      icon: icons.ui.icons.trash
    })
    refresh()
  } catch (err: any) {
    toast.add({
      title: 'Error al eliminar',
      description: err?.message,
      color: 'error'
    })
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="min-w-0 space-y-4">
    <div class="page-header">
      <div><h1>Reconciliación bancaria</h1><p>Compara los movimientos del ciclo con tu estado de cuenta.</p></div>
    </div>
    <UCard :ui="{ body: 'p-4 sm:p-5' }">
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField label="Tarjeta a auditar">
          <ClientOnly>
            <USelect
              v-model="tarjetaId"
              :items="(reconciliacionData?.tarjetas || []).map(t => ({ label: t.nombre, value: t.id }))"
              placeholder="Selecciona una tarjeta"
              class="w-full"
            />
            <template #fallback>
              <USkeleton class="h-8 w-full" />
            </template>
          </ClientOnly>
        </UFormField>
        <UFormField label="Fecha dentro del ciclo">
          <UInput
            v-model="fechaReferencia"
            type="date"
            :icon="icons.appIcons.calendar"
            class="w-full"
          />
        </UFormField>
      </div>
    </UCard>
    <div
      v-if="pending && !reconciliacionData"
      class="flex items-center gap-2 p-8 text-muted"
      role="status"
    >
      <UIcon
        :name="icons.ui.icons.loading"
        class="size-5 animate-spin"
      />Cargando ciclo…
    </div>
    <div class="grid items-start gap-4 lg:grid-cols-2">
      <UCard :ui="{ body: 'p-4 sm:p-5 space-y-4' }">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold text-highlighted">
              Comparar con el banco
            </h2><p class="mt-1 text-xs text-muted">
              {{ ciclo?.etiqueta || 'Selecciona una tarjeta para comenzar.' }}
            </p>
          </div><UBadge
            v-if="ciclo"
            color="neutral"
            variant="subtle"
          >
            {{ ciclo.cantidadGastos }} movimientos
          </UBadge>
        </div>
        <div class="rounded-md bg-muted p-3">
          <p class="text-xs text-muted">
            Total registrado en la aplicación
          </p><p class="mt-1 text-2xl font-semibold tabular-nums text-highlighted">
            {{ formatCurrency(totalApp) }}
          </p>
        </div>
        <form
          class="space-y-4"
          @submit.prevent="guardarReconciliacion"
        >
          <UFormField
            label="Total del estado de cuenta ($ USD)"
            required
          >
            <UInput
              v-model="totalBancoInput"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              :icon="icons.appIcons.landmark"
              class="w-full"
              required
            />
          </UFormField>
          <UFormField
            label="Notas / observaciones"
            hint="Opcional"
          >
            <UTextarea
              v-model="notasInput"
              placeholder="Coincidencias, cargos pendientes…"
              class="w-full"
              :rows="2"
            />
          </UFormField>
          <UAlert
            v-if="diferenciaEnVivo !== null"
            :color="diferenciaEnVivo === 0 ? 'success' : diferenciaEnVivo > 0 ? 'warning' : 'info'"
            variant="subtle"
            :icon="diferenciaEnVivo === 0 ? icons.ui.icons.success : icons.ui.icons.info"
            :title="`Diferencia: ${formatCurrency(diferenciaEnVivo)}`"
            :description="diferenciaEnVivo === 0 ? 'Los movimientos coinciden con el banco.' : diferenciaEnVivo > 0 ? 'El banco reporta un importe mayor. Revisa compras, comisiones o intereses pendientes de registrar.' : 'La aplicación registra un importe mayor. Revisa si hay compras en tránsito.'"
          />
          <div class="flex justify-end">
            <UButton
              type="submit"
              :icon="icons.appIcons.save"
              label="Guardar reconciliación"
              :loading="saving"
              :disabled="diferenciaEnVivo === null || !ciclo"
            />
          </div>
        </form>
      </UCard>
      <UCard :ui="{ body: 'p-4 sm:p-5' }">
        <h2 class="text-sm font-semibold text-highlighted">
          Movimientos del ciclo
        </h2>
        <p
          v-if="!ciclo?.gastos?.length"
          class="py-8 text-center text-sm text-muted"
        >
          No hay gastos registrados para este ciclo.
        </p>
        <ul
          v-else
          class="mt-3 max-h-96 divide-y divide-default overflow-y-auto"
        >
          <li
            v-for="g in ciclo.gastos"
            :key="g.id"
            class="flex items-center justify-between gap-3 py-3"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ g.descripcion }}
              </p><p class="mt-1 text-xs text-muted">
                {{ formatDate(g.fecha) }} · {{ g.categoria }}
              </p>
            </div><span class="shrink-0 text-sm font-semibold tabular-nums">{{ formatCurrency(g.monto) }}</span>
          </li>
        </ul>
      </UCard>
    </div>
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <div class="flex items-center justify-between gap-2 border-b border-default p-4">
        <h2 class="text-sm font-semibold text-highlighted">
          Auditorías guardadas
        </h2><span class="text-xs text-muted">{{ reconciliacionData?.historial?.length || 0 }} registros</span>
      </div>
      <p
        v-if="!reconciliacionData?.historial?.length"
        class="p-8 text-center text-sm text-muted"
      >
        Aún no has guardado reconciliaciones.
      </p>
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="data-table">
          <caption class="sr-only">
            Historial de reconciliaciones bancarias
          </caption>
          <thead>
            <tr>
              <th>Tarjeta / ciclo</th><th class="text-right">
                Banco
              </th><th class="text-right">
                Aplicación
              </th><th class="text-right">
                Diferencia
              </th><th>Notas</th><th><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="rec in reconciliacionData.historial"
              :key="rec.id"
            >
              <td class="min-w-48">
                <CardIdentifier
                  :name="rec.tarjeta_nombre"
                  :color="rec.tarjeta_color"
                /><p class="mt-1 whitespace-nowrap text-xs text-muted">
                  {{ formatDate(rec.ciclo_inicio) }} al {{ formatDate(rec.ciclo_fin) }}
                </p>
              </td>
              <td class="text-right tabular-nums">
                {{ formatCurrency(rec.total_banco) }}
              </td><td class="text-right tabular-nums">
                {{ formatCurrency(rec.total_app_calculado) }}
              </td>
              <td class="text-right">
                <UBadge
                  :color="rec.diferencia === 0 ? 'success' : 'warning'"
                  variant="subtle"
                >
                  {{ formatCurrency(rec.diferencia) }}
                </UBadge>
              </td>
              <td class="max-w-48 truncate">
                {{ rec.notas || '—' }}
              </td>
              <td>
                <UButton
                  :icon="icons.ui.icons.trash"
                  color="error"
                  variant="ghost"
                  size="xs"
                  aria-label="Eliminar reconciliación"
                  :loading="deletingId === rec.id"
                  @click="deleteReconciliacion(rec.id)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
