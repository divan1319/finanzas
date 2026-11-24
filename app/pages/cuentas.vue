<script setup lang="ts">
import type { CuentaConSaldo, MovimientoCuentaItem } from '#shared/types/cuenta'

const icons = useAppConfig()

const {
  formatCurrency,
  formatDate,
  triggerRefresh,
  refreshKey,
  openAccountMovementModal,
  openVerifyCyclesModal
} = useFinanzas()
const { isOnline, enqueueAction } = useOfflineSync()
const toast = useToast()

const { data: cuentasData, pending: pendingCuentas, refresh: refreshCuentas } = useCachedFetch('/api/cuentas', {
  key: 'cuentas'
})

const { data: ciclosData, refresh: refreshCiclos } = useCachedFetch('/api/cuentas/ciclos-pendientes', {
  key: 'ciclos-pendientes'
})

const filtroCuenta = ref<string>('todas')
const filtroTipo = ref<string>('todos')
const search = ref('')
const page = ref(1)
const itemsPerPage = ref(10)

watch([filtroCuenta, filtroTipo, search], () => {
  page.value = 1
})

const { data: movimientosData, pending: pendingMovimientos, refresh: refreshMovimientos } = useCachedFetch('/api/cuentas/movimientos', {
  key: computed(() => `cuentas-movimientos-${filtroCuenta.value}-${filtroTipo.value}-${page.value}-${itemsPerPage.value}-${search.value}`),
  query: computed(() => ({
    cuenta_id: filtroCuenta.value !== 'todas' ? filtroCuenta.value : undefined,
    tipo: filtroTipo.value !== 'todos' ? filtroTipo.value : undefined,
    q: search.value || undefined,
    page: page.value,
    limit: itemsPerPage.value
  }))
})

watch(refreshKey, () => {
  refreshCuentas()
  refreshMovimientos()
  refreshCiclos()
})

const etiquetasCategoria: Record<string, string> = {
  nomina: 'Nómina',
  transferencia: 'Transferencia',
  aguinaldo: 'Aguinaldo',
  bono: 'Bono / Extra',
  retiro_tarjeta: 'Retiro de tarjeta',
  pago_tarjeta: 'Pago de tarjeta',
  retiro_efectivo: 'Retiro efectivo',
  traspaso: 'Traspaso',
  otro: 'Otro'
}

const colorOptions = [
  { value: 'emerald', label: 'Esmeralda', bgClass: cardColorClass('emerald') },
  { value: 'indigo', label: 'Índigo', bgClass: cardColorClass('indigo') },
  { value: 'amber', label: 'Ámbar', bgClass: cardColorClass('amber') },
  { value: 'violet', label: 'Violeta', bgClass: cardColorClass('violet') },
  { value: 'rose', label: 'Rosa', bgClass: cardColorClass('rose') },
  { value: 'sky', label: 'Azul Cielo', bgClass: cardColorClass('sky') }
]

const ciclosPendientesCount = computed(() => ciclosData.value?.ciclos?.length || 0)

// Modal Agregar / Editar Cuenta
const accountModalOpen = ref(false)
const getErrorMessage = (err: unknown, fallback: string): string => {
  const errObj = err as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
  return errObj?.data?.statusMessage || errObj?.statusMessage || errObj?.message || fallback
}

const savingAccount = ref(false)
const accountForm = ref({
  id: null as number | null,
  nombre: '',
  banco: '',
  saldo_inicial: '0',
  es_principal: false,
  color: 'emerald'
})

const isEditingAccount = computed(() => accountForm.value.id !== null)

const openAddAccountModal = () => {
  accountForm.value = {
    id: null,
    nombre: '',
    banco: '',
    saldo_inicial: '0',
    es_principal: false,
    color: 'sky'
  }
  accountModalOpen.value = true
}

const openEditAccountModal = (cta: CuentaConSaldo) => {
  accountForm.value = {
    id: cta.id,
    nombre: cta.nombre,
    banco: cta.banco || '',
    saldo_inicial: String(cta.saldo_inicial ?? 0),
    es_principal: Boolean(cta.es_principal),
    color: cta.color || 'emerald'
  }
  accountModalOpen.value = true
}

const submitAccount = async () => {
  if (!accountForm.value.nombre.trim()) {
    toast.add({ title: 'Nombre requerido', description: 'Ingresa un nombre para la cuenta.', color: 'warning' })
    return
  }

  const saldoInicialNum = Number(accountForm.value.saldo_inicial || 0)
  if (!Number.isFinite(saldoInicialNum)) {
    toast.add({ title: 'Saldo inicial inválido', description: 'Ingresa un número válido.', color: 'error' })
    return
  }

  savingAccount.value = true
  try {
    const payload = {
      nombre: accountForm.value.nombre.trim(),
      banco: accountForm.value.banco.trim() || null,
      saldo_inicial: saldoInicialNum,
      es_principal: accountForm.value.es_principal,
      color: accountForm.value.color
    }

    if (isEditingAccount.value) {
      await $fetch(`/api/cuentas/${accountForm.value.id}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({ title: 'Cuenta actualizada', color: 'success', icon: icons.ui.icons.success })
    } else {
      await $fetch('/api/cuentas', {
        method: 'POST',
        body: payload
      })
      toast.add({ title: 'Cuenta creada', color: 'success', icon: icons.ui.icons.success })
    }

    accountModalOpen.value = false
    await triggerRefresh(['global-config', 'dashboard', 'cuentas', 'cuentas-movimientos'])
  } catch (err: unknown) {
    toast.add({
      title: 'Error al guardar cuenta',
      description: getErrorMessage(err, 'No se pudo guardar la cuenta.'),
      color: 'error'
    })
  } finally {
    savingAccount.value = false
  }
}

const settingPrincipalId = ref<number | null>(null)
const marcarComoPrincipal = async (cta: CuentaConSaldo) => {
  if (cta.es_principal) return
  settingPrincipalId.value = cta.id
  try {
    await $fetch(`/api/cuentas/${cta.id}`, {
      method: 'PUT',
      body: { es_principal: true }
    })
    toast.add({
      title: 'Cuenta Principal Actualizada',
      description: `"${cta.nombre}" ahora es tu cuenta principal.`,
      color: 'success',
      icon: icons.ui.icons.star
    })
    await triggerRefresh(['global-config', 'dashboard', 'cuentas'])
  } catch (err: unknown) {
    toast.add({
      title: 'Error',
      description: getErrorMessage(err, 'No se pudo cambiar la cuenta principal.'),
      color: 'error'
    })
  } finally {
    settingPrincipalId.value = null
  }
}

const deleteAccountModalOpen = ref(false)
const accountToDelete = ref<CuentaConSaldo | null>(null)
const deletingAccount = ref(false)
const deleteAccountError = ref<string | null>(null)

const openDeleteAccountModal = (cta: CuentaConSaldo) => {
  accountToDelete.value = cta
  deleteAccountError.value = null
  deleteAccountModalOpen.value = true
}

const confirmDeleteAccount = async () => {
  if (!accountToDelete.value) return
  deletingAccount.value = true
  deleteAccountError.value = null
  try {
    await $fetch(`/api/cuentas/${accountToDelete.value.id}`, { method: 'DELETE' })
    toast.add({
      title: 'Cuenta eliminada',
      description: `Se eliminó "${accountToDelete.value.nombre}".`,
      color: 'success',
      icon: icons.ui.icons.trash
    })
    deleteAccountModalOpen.value = false
    accountToDelete.value = null
    await triggerRefresh(['global-config', 'dashboard', 'cuentas', 'cuentas-movimientos'])
  } catch (err: unknown) {
    deleteAccountError.value = getErrorMessage(err, 'No se pudo eliminar la cuenta.')
    toast.add({
      title: 'No se puede eliminar',
      description: deleteAccountError.value || undefined,
      color: 'error'
    })
  } finally {
    deletingAccount.value = false
  }
}

const deletingMovId = ref<number | null>(null)
const deleteMovimiento = async (mov: MovimientoCuentaItem) => {
  const aviso = mov.transferencia_par_id
    ? 'Este movimiento es parte de un traspaso entre tus cuentas; se eliminará en ambas cuentas. ¿Continuar?'
    : '¿Deseas eliminar este movimiento de cuenta?'
  if (!confirm(aviso)) return

  deletingMovId.value = mov.id
  if (!isOnline.value) {
    enqueueAction({
      tipo: 'movimiento_cuenta_delete',
      url: `/api/cuentas/movimientos/${mov.id}`,
      method: 'DELETE',
      descripcion: `Eliminar movimiento #${mov.id}`
    })
    toast.add({
      title: 'Eliminación guardada offline',
      description: 'Se aplicará al conectarte.',
      color: 'warning',
      icon: icons.appIcons.cloudOff
    })
    deletingMovId.value = null
    return
  }

  try {
    await $fetch(`/api/cuentas/movimientos/${mov.id}`, { method: 'DELETE' })
    toast.add({
      title: 'Movimiento eliminado',
      color: 'success',
      icon: icons.ui.icons.trash
    })
    await triggerRefresh(['dashboard', 'cuentas', 'cuentas-movimientos', 'ingresos', 'gastos'])
  } catch (err: unknown) {
    toast.add({
      title: 'Error al eliminar',
      description: getErrorMessage(err, 'No se pudo eliminar el movimiento.'),
      color: 'error'
    })
  } finally {
    deletingMovId.value = null
  }
}

const totalMovimientos = computed(() => movimientosData.value?.cantidad || 0)
const totalPaginas = computed(() => movimientosData.value?.totalPages || 1)
watch(totalPaginas, (max) => {
  if (page.value > max) page.value = Math.max(1, max)
})
</script>

<template>
  <div class="min-w-0 space-y-4">
    <!-- Encabezado -->
    <div class="page-header">
      <div>
        <h1>Cuentas y Saldos</h1>
        <p>Administra tus cuentas bancarias, entradas, salidas y cortes cerrados de tarjetas.</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UButton
          size="sm"
          :color="ciclosPendientesCount > 0 ? 'warning' : 'neutral'"
          variant="outline"
          :icon="icons.appIcons.calendarCheck"
          @click="openVerifyCyclesModal()"
        >
          Verificar cortes
          <UBadge
            v-if="ciclosPendientesCount > 0"
            color="warning"
            variant="solid"
            size="xs"
            class="ml-1"
          >
            {{ ciclosPendientesCount }}
          </UBadge>
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          :icon="icons.appIcons.landmark"
          label="Nueva cuenta"
          @click="openAddAccountModal()"
        />
        <UButton
          size="sm"
          color="primary"
          :icon="icons.ui.icons.plus"
          label="Registrar movimiento"
          @click="openAccountMovementModal()"
        />
      </div>
    </div>

    <!-- Resumen Consolidado -->
    <UCard :ui="{ body: 'p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4' }">
      <div>
        <p class="text-xs font-medium text-muted">
          Saldo total disponible en cuentas
        </p>
        <p class="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-highlighted">
          {{ formatCurrency(cuentasData?.saldo_total || 0) }}
        </p>
      </div>

      <div
        v-if="cuentasData?.cuentaPrincipal"
        class="rounded-md border border-default bg-muted/60 px-3.5 py-2.5 text-xs"
      >
        <span class="text-muted block">Cuenta Principal (recibe nómina)</span>
        <div class="mt-1 flex items-center gap-2 font-semibold text-highlighted">
          <CardIdentifier
            :name="cuentasData.cuentaPrincipal.nombre"
            :color="cuentasData.cuentaPrincipal.color"
          />
          <span class="tabular-nums text-primary">{{ formatCurrency(cuentasData.cuentaPrincipal.saldo_actual) }}</span>
        </div>
      </div>
    </UCard>

    <!-- Listado de Cuentas -->
    <div
      v-if="pendingCuentas && !cuentasData"
      class="py-12 text-center text-muted text-sm"
    >
      <UIcon
        :name="icons.ui.icons.loading"
        class="size-6 animate-spin mx-auto mb-2 text-primary"
      />
      Cargando cuentas...
    </div>

    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <UCard
        v-for="cta in cuentasData?.cuentas || []"
        :key="cta.id"
        :ui="{ body: 'p-4 sm:p-5 space-y-3' }"
        :class="cta.es_principal ? 'ring-2 ring-primary/40' : ''"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 space-y-1">
            <CardIdentifier
              :name="cta.nombre"
              :color="cta.color"
              class="text-base font-bold"
            />
            <p
              v-if="cta.banco"
              class="text-xs text-muted truncate"
            >
              {{ cta.banco }}
            </p>
            <UBadge
              v-if="cta.es_principal"
              color="primary"
              variant="subtle"
              size="xs"
            >
              <UIcon
                :name="icons.ui.icons.star"
                class="size-3 mr-1"
              />
              Cuenta Principal
            </UBadge>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <UButton
              v-if="!cta.es_principal"
              size="xs"
              color="primary"
              variant="subtle"
              :icon="icons.ui.icons.star"
              label="Principal"
              :loading="settingPrincipalId === cta.id"
              @click="marcarComoPrincipal(cta)"
            />
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              :icon="icons.ui.icons.edit"
              aria-label="Editar cuenta"
              @click="openEditAccountModal(cta)"
            />
            <UButton
              size="xs"
              color="error"
              variant="ghost"
              :icon="icons.ui.icons.trash"
              aria-label="Eliminar cuenta"
              @click="openDeleteAccountModal(cta)"
            />
          </div>
        </div>

        <div>
          <p class="text-xs text-muted">
            Saldo actual
          </p>
          <p
            class="text-2xl font-bold tracking-tight tabular-nums"
            :class="cta.saldo_actual < 0 ? 'text-error' : 'text-highlighted'"
          >
            {{ formatCurrency(cta.saldo_actual) }}
          </p>
        </div>

        <dl class="grid grid-cols-3 gap-2 pt-2 border-t border-default text-xs">
          <div>
            <dt class="text-muted">
              Inicial
            </dt>
            <dd class="font-medium tabular-nums">
              {{ formatCurrency(cta.saldo_inicial) }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              Entradas
            </dt>
            <dd class="font-medium tabular-nums text-success">
              +{{ formatCurrency(cta.total_entradas) }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              Salidas
            </dt>
            <dd class="font-medium tabular-nums text-error">
              -{{ formatCurrency(cta.total_salidas) }}
            </dd>
          </div>
        </dl>

        <div class="flex items-center gap-2 pt-1">
          <UButton
            size="xs"
            color="primary"
            variant="subtle"
            :icon="icons.ui.icons.plus"
            label="Entrada"
            class="flex-1 justify-center"
            @click="openAccountMovementModal({ tipo: 'entrada', cuenta_id: cta.id })"
          />
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            :icon="icons.ui.icons.minus"
            label="Salida"
            class="flex-1 justify-center"
            @click="openAccountMovementModal({ tipo: 'salida', cuenta_id: cta.id })"
          />
        </div>
      </UCard>
    </div>

    <!-- Filtros del Historial de Movimientos -->
    <UCard :ui="{ body: 'p-4 sm:p-5' }">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <UFormField label="Buscar descripción">
          <UInput
            v-model="search"
            placeholder="Ej. Nómina, Bono, Pago..."
            :icon="icons.ui.icons.search"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Cuenta">
          <USelect
            v-model="filtroCuenta"
            :items="[{ label: 'Todas las cuentas', value: 'todas' }, ...(cuentasData?.cuentas || []).map(c => ({ label: c.nombre, value: String(c.id) }))]"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Tipo de movimiento">
          <USelect
            v-model="filtroTipo"
            :items="[{ label: 'Todos', value: 'todos' }, { label: 'Entradas (+)', value: 'entrada' }, { label: 'Salidas (-)', value: 'salida' }]"
            class="w-full"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Historial de Movimientos -->
    <UCard :ui="{ body: 'p-0 sm:p-0 overflow-hidden' }">
      <div class="p-4 sm:p-5 border-b border-default flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-bold text-highlighted">
          Movimientos en Cuentas
        </h2>
        <div class="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>Entradas: <strong class="text-success tabular-nums">+{{ formatCurrency(movimientosData?.totalEntradas || 0) }}</strong></span>
          <span>Salidas: <strong class="text-error tabular-nums">-{{ formatCurrency(movimientosData?.totalSalidas || 0) }}</strong></span>
        </div>
      </div>

      <div
        v-if="pendingMovimientos && !movimientosData"
        class="py-12 text-center text-muted text-sm"
      >
        <UIcon
          :name="icons.ui.icons.loading"
          class="size-6 animate-spin mx-auto mb-2 text-primary"
        />
        Cargando movimientos...
      </div>

      <div
        v-else-if="!movimientosData?.movimientos || movimientosData.movimientos.length === 0"
        class="py-14 text-center text-muted space-y-3"
      >
        <UIcon
          :name="icons.appIcons.inbox"
          class="size-10 mx-auto opacity-40"
        />
        <p class="text-sm">
          No hay movimientos registrados con estos filtros.
        </p>
        <UButton
          size="sm"
          color="primary"
          :icon="icons.ui.icons.plus"
          label="Registrar primer movimiento"
          @click="openAccountMovementModal()"
        />
      </div>

      <div
        v-else
        class="min-w-0"
      >
        <ul
          class="divide-y divide-default px-4 lg:hidden"
          aria-label="Movimientos en cuentas"
        >
          <li
            v-for="mov in movimientosData.movimientos"
            :key="mov.id"
            class="min-w-0 space-y-2 py-4"
          >
            <div class="flex items-start justify-between gap-3">
              <p class="min-w-0 flex-1 break-words text-sm font-medium text-highlighted">
                {{ mov.descripcion }}
              </p>
              <span
                class="shrink-0 text-sm font-semibold tabular-nums"
                :class="mov.tipo === 'entrada' ? 'text-success' : 'text-error'"
              >
                {{ mov.tipo === 'entrada' ? '+' : '-' }}{{ formatCurrency(mov.monto) }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-2 text-xs text-muted">
              <div class="flex flex-wrap items-center gap-2">
                <span>{{ formatDate(mov.fecha) }}</span>
                <CardIdentifier
                  :name="mov.cuenta_nombre || 'Cuenta'"
                  :color="mov.cuenta_color"
                />
                <UBadge
                  color="neutral"
                  variant="subtle"
                  size="xs"
                >
                  {{ etiquetasCategoria[mov.categoria] || mov.categoria }}
                </UBadge>
              </div>
              <UButton
                :icon="icons.ui.icons.trash"
                color="error"
                variant="ghost"
                size="xs"
                aria-label="Eliminar movimiento"
                :loading="deletingMovId === mov.id"
                @click="deleteMovimiento(mov)"
              />
            </div>
          </li>
        </ul>

        <div class="hidden overflow-x-auto lg:block">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cuenta</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th class="text-right">
                  Monto
                </th>
                <th class="text-center">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="mov in movimientosData.movimientos"
                :key="mov.id"
              >
                <td class="whitespace-nowrap font-medium">
                  {{ formatDate(mov.fecha) }}
                </td>
                <td class="whitespace-nowrap">
                  <CardIdentifier
                    :name="mov.cuenta_nombre || 'Cuenta'"
                    :color="mov.cuenta_color"
                  />
                </td>
                <td class="max-w-xs truncate font-medium text-highlighted">
                  {{ mov.descripcion }}
                </td>
                <td class="whitespace-nowrap">
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    size="sm"
                  >
                    {{ etiquetasCategoria[mov.categoria] || mov.categoria }}
                  </UBadge>
                </td>
                <td
                  class="text-right font-bold tabular-nums whitespace-nowrap"
                  :class="mov.tipo === 'entrada' ? 'text-success' : 'text-error'"
                >
                  {{ mov.tipo === 'entrada' ? '+' : '-' }}{{ formatCurrency(mov.monto) }}
                </td>
                <td class="text-center whitespace-nowrap">
                  <UButton
                    :icon="icons.ui.icons.trash"
                    color="error"
                    variant="ghost"
                    size="xs"
                    aria-label="Eliminar movimiento"
                    :loading="deletingMovId === mov.id"
                    @click="deleteMovimiento(mov)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        v-if="totalMovimientos > 0"
        class="px-4 py-3 border-t border-default bg-muted flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted"
      >
        <span>
          Mostrando {{ (page - 1) * itemsPerPage + 1 }} – {{ Math.min(page * itemsPerPage, totalMovimientos) }} de {{ totalMovimientos }} movimientos
        </span>
        <UPagination
          v-if="totalMovimientos > itemsPerPage"
          v-model:page="page"
          :total="totalMovimientos"
          :items-per-page="itemsPerPage"
          size="xs"
          color="neutral"
          variant="subtle"
          :sibling-count="1"
        />
      </div>
    </UCard>

    <!-- Modal Agregar / Editar Cuenta -->
    <UModal
      v-model:open="accountModalOpen"
      :title="isEditingAccount ? 'Editar Cuenta' : 'Agregar Nueva Cuenta'"
    >
      <template #body>
        <form
          class="space-y-4"
          @submit.prevent="submitAccount"
        >
          <UFormField
            label="Nombre de la Cuenta"
            required
          >
            <UInput
              v-model="accountForm.nombre"
              placeholder="Ej. Cuenta Nómina, Ahorros, Efectivo..."
              class="w-full"
              required
            />
          </UFormField>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField
              label="Banco / Institución"
              hint="Opcional"
            >
              <UInput
                v-model="accountForm.banco"
                placeholder="Ej. Agrícola, Cuscatlán..."
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Saldo Inicial ($ USD)"
              required
            >
              <UInput
                v-model="accountForm.saldo_inicial"
                type="number"
                step="0.01"
                placeholder="0.00"
                :icon="icons.appIcons.dollarSign"
                class="w-full"
                required
              />
            </UFormField>
          </div>

          <div class="p-3 rounded-md border border-default bg-muted space-y-2">
            <USwitch
              v-model="accountForm.es_principal"
              label="Marcar como Cuenta Principal"
              description="Se seleccionará por defecto al registrar tu nómina y retiros hacia cuenta."
            />
          </div>

          <fieldset>
            <legend class="block text-xs font-medium text-muted mb-2">
              Color distintivo
            </legend>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="opt in colorOptions"
                :key="opt.value"
                type="button"
                class="p-2 rounded-lg border text-xs flex items-center gap-2 transition-all"
                :class="[
                  accountForm.color === opt.value
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30 font-bold'
                    : 'border-default bg-muted'
                ]"
                :aria-pressed="accountForm.color === opt.value"
                @click="accountForm.color = opt.value"
              >
                <span
                  class="w-3 h-3 rounded-full shrink-0"
                  :class="opt.bgClass"
                />
                <span class="truncate">{{ opt.label }}</span>
              </button>
            </div>
          </fieldset>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-default">
            <UButton
              color="neutral"
              variant="ghost"
              label="Cancelar"
              @click="accountModalOpen = false"
            />
            <UButton
              type="submit"
              color="primary"
              :icon="icons.appIcons.save"
              :label="isEditingAccount ? 'Guardar Cambios' : 'Crear Cuenta'"
              :loading="savingAccount"
            />
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal Confirmar Eliminación de Cuenta -->
    <UModal
      v-model:open="deleteAccountModalOpen"
      title="Eliminar Cuenta"
    >
      <template #body>
        <div class="space-y-4">
          <UAlert
            v-if="deleteAccountError"
            color="error"
            variant="subtle"
            :icon="icons.ui.icons.warning"
            title="Acción no permitida"
            :description="deleteAccountError"
          />
          <p
            v-else
            class="text-sm text-muted"
          >
            ¿Estás seguro de eliminar la cuenta <strong>"{{ accountToDelete?.nombre }}"</strong>? Solo se puede eliminar si no tiene movimientos registrados.
          </p>
          <div class="flex items-center justify-end gap-2 pt-3 border-t border-default">
            <UButton
              color="neutral"
              variant="ghost"
              :label="deleteAccountError ? 'Cerrar' : 'Cancelar'"
              @click="deleteAccountModalOpen = false"
            />
            <UButton
              v-if="!deleteAccountError"
              color="error"
              :icon="icons.ui.icons.trash"
              label="Sí, eliminar"
              :loading="deletingAccount"
              @click="confirmDeleteAccount"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
