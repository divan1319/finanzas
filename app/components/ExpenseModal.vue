<script setup lang="ts">
import { tarjetaSugeridaEn, calcularPeriodoPagoGasto, formatDateISO } from '#shared/utils/cicloFinanciero'

const icons = useAppConfig()

const props = defineProps<{
  tarjetas?: Array<{
    id: number
    codigo: string
    nombre: string
    color?: string | null
    dia_corte: number
    dia_pago_propio_tipo: string
    es_principal?: boolean
  }>
  cuentas?: Array<{
    id: number
    nombre: string
    banco?: string | null
    es_principal?: boolean
    color?: string | null
  }>
  diaObjetivoNomina?: number
}>()

const { expenseModalOpen, expenseModalData, closeExpenseModal, triggerRefresh } = useFinanzas()
const { isOnline, enqueueAction } = useOfflineSync()
const toast = useToast()

const categorias = [
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

const form = ref({
  id: null as number | null,
  tarjeta_id: undefined as number | undefined,
  fecha: formatDateISO(new Date()),
  monto: '',
  descripcion: '',
  categoria: 'Alimentos',
  aporta_cuenta: false,
  cuenta_destino_id: undefined as number | undefined,
  monto_cuenta: ''
})

const loading = ref(false)
const manualCardOverride = ref(false)
const manualMontoCuentaOverride = ref(false)

const isEditing = computed(() => !!form.value.id)

const cuentaPrincipalId = computed(() => {
  return props.cuentas?.find(c => c.es_principal)?.id ?? props.cuentas?.[0]?.id
})

const cuentasSelectItems = computed(() => {
  return (props.cuentas || []).map(c => ({
    label: c.es_principal ? `${c.nombre} (Principal)` : c.nombre,
    value: c.id
  }))
})

// Tarjeta sugerida dinámicamente según la fecha y tarjetas
const sugerenciaActual = computed(() => {
  if (!form.value.fecha || !props.tarjetas?.length) return null
  return tarjetaSugeridaEn(form.value.fecha, props.tarjetas, props.diaObjetivoNomina || 26)
})

const tarjetaSugeridaId = computed(() => {
  return sugerenciaActual.value?.tarjeta?.id || props.tarjetas?.[0]?.id
})

// Tarjeta actualmente seleccionada
const tarjetaSeleccionada = computed(() => {
  return props.tarjetas?.find(t => t.id === form.value.tarjeta_id) || props.tarjetas?.[0]
})

// Cálculo en tiempo real de cuándo se pagará el gasto
const infoPagoGasto = computed(() => {
  if (!form.value.fecha || !tarjetaSeleccionada.value) return null
  return calcularPeriodoPagoGasto(form.value.fecha, tarjetaSeleccionada.value, props.diaObjetivoNomina || 26)
})

// Auto-seleccionar tarjeta al cambiar la fecha si el usuario no ha forzado un override manual
watch(() => form.value.fecha, (newFecha) => {
  if (!isEditing.value && !manualCardOverride.value && newFecha) {
    if (tarjetaSugeridaId.value) {
      form.value.tarjeta_id = tarjetaSugeridaId.value
    }
  }
})

// Sincronizar monto que entra a la cuenta con el monto del gasto mientras no se edite manualmente
watch(() => form.value.monto, (newMonto) => {
  if (!manualMontoCuentaOverride.value) {
    form.value.monto_cuenta = newMonto
  }
})

// Autoseleccionar cuenta principal y prellenar monto al activar el switch
watch(() => form.value.aporta_cuenta, (activo) => {
  if (activo) {
    if (!form.value.cuenta_destino_id && cuentaPrincipalId.value) {
      form.value.cuenta_destino_id = cuentaPrincipalId.value
    }
    if (!form.value.monto_cuenta && form.value.monto) {
      form.value.monto_cuenta = form.value.monto
    }
  }
})

// Inicializar cuando se abre el modal
watch(expenseModalOpen, (open) => {
  if (open) {
    manualCardOverride.value = false
    if (expenseModalData.value) {
      const montoStr = expenseModalData.value.monto != null ? String(expenseModalData.value.monto) : ''
      const montoCuentaStr = expenseModalData.value.monto_cuenta != null
        ? String(expenseModalData.value.monto_cuenta)
        : montoStr
      manualMontoCuentaOverride.value = (
        expenseModalData.value.monto_cuenta != null
        && expenseModalData.value.monto != null
        && Number(expenseModalData.value.monto_cuenta) !== Number(expenseModalData.value.monto)
      )
      form.value = {
        id: expenseModalData.value.id || null,
        tarjeta_id: expenseModalData.value.tarjeta_id || tarjetaSugeridaId.value,
        fecha: expenseModalData.value.fecha || formatDateISO(new Date()),
        monto: montoStr,
        descripcion: expenseModalData.value.descripcion || '',
        categoria: expenseModalData.value.categoria || 'Alimentos',
        aporta_cuenta: Boolean(expenseModalData.value.aporta_cuenta),
        cuenta_destino_id: expenseModalData.value.cuenta_destino_id || cuentaPrincipalId.value,
        monto_cuenta: montoCuentaStr
      }
    } else {
      manualMontoCuentaOverride.value = false
      form.value = {
        id: null,
        tarjeta_id: tarjetaSugeridaId.value,
        fecha: formatDateISO(new Date()),
        monto: '',
        descripcion: '',
        categoria: 'Alimentos',
        aporta_cuenta: false,
        cuenta_destino_id: cuentaPrincipalId.value,
        monto_cuenta: ''
      }
    }
  }
})

const onMontoCuentaInput = (val: string | number) => {
  const str = String(val ?? '')
  form.value.monto_cuenta = str
  manualMontoCuentaOverride.value = (str !== form.value.monto)
}

const onTarjetaSelectChange = (val: number) => {
  form.value.tarjeta_id = val
  manualCardOverride.value = (val !== tarjetaSugeridaId.value)
}

const aplicarSugerida = () => {
  if (tarjetaSugeridaId.value) {
    form.value.tarjeta_id = tarjetaSugeridaId.value
    manualCardOverride.value = false
  }
}

const submitGasto = async () => {
  if (!form.value.tarjeta_id || !form.value.fecha || !form.value.monto || !form.value.descripcion) {
    toast.add({
      title: 'Campos incompletos',
      description: 'Por favor llena todos los campos obligatorios.',
      color: 'warning',
      icon: icons.ui.icons.warning
    })
    return
  }

  const montoNum = Number(form.value.monto)
  if (isNaN(montoNum) || montoNum <= 0) {
    toast.add({
      title: 'Monto inválido',
      description: 'El monto debe ser un valor numérico positivo.',
      color: 'error',
      icon: icons.ui.icons.error
    })
    return
  }

  let montoCuentaNum: number | null = null
  if (form.value.aporta_cuenta) {
    if (!form.value.cuenta_destino_id) {
      toast.add({
        title: 'Cuenta requerida',
        description: 'Selecciona la cuenta donde se abonará este saldo.',
        color: 'warning',
        icon: icons.ui.icons.warning
      })
      return
    }
    montoCuentaNum = Number(form.value.monto_cuenta || form.value.monto)
    if (!Number.isFinite(montoCuentaNum) || montoCuentaNum <= 0) {
      toast.add({
        title: 'Monto de cuenta inválido',
        description: 'El monto que entra a la cuenta debe ser mayor a 0.',
        color: 'error',
        icon: icons.ui.icons.error
      })
      return
    }
  }

  const payload = {
    tarjeta_id: form.value.tarjeta_id,
    fecha: form.value.fecha,
    monto: montoNum,
    descripcion: form.value.descripcion,
    categoria: form.value.categoria,
    aporta_cuenta: form.value.aporta_cuenta,
    cuenta_destino_id: form.value.aporta_cuenta ? form.value.cuenta_destino_id : null,
    monto_cuenta: form.value.aporta_cuenta ? montoCuentaNum : null
  }

  // Si estamos sin conexión, guardar directamente en la cola local
  if (!isOnline.value) {
    enqueueAction({
      tipo: isEditing.value ? 'gasto_update' : 'gasto_create',
      url: isEditing.value ? `/api/gastos/${form.value.id}` : '/api/gastos',
      method: isEditing.value ? 'PUT' : 'POST',
      body: payload,
      descripcion: `Gasto: ${form.value.descripcion} ($${montoNum.toFixed(2)})`
    })

    toast.add({
      title: 'Guardado sin conexión',
      description: 'El gasto se guardó en tu dispositivo. Se sincronizará automáticamente al conectarte.',
      color: 'warning',
      icon: icons.appIcons.cloudOff
    })

    closeExpenseModal()
    return
  }

  loading.value = true
  try {
    if (isEditing.value) {
      await $fetch(`/api/gastos/${form.value.id}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({
        title: 'Gasto actualizado',
        description: 'Se guardaron los cambios correctamente.',
        color: 'success',
        icon: icons.ui.icons.check
      })
    } else {
      await $fetch('/api/gastos', {
        method: 'POST',
        body: payload
      })
      toast.add({
        title: 'Gasto registrado',
        description: `Se registró el gasto de $${montoNum.toFixed(2)} exitosamente.`,
        color: 'success',
        icon: icons.ui.icons.success
      })
    }

    await triggerRefresh(['dashboard', 'gastos', 'historial', 'reconciliaciones', 'cuentas', 'cuentas-movimientos'])
    closeExpenseModal()
  } catch (err: unknown) {
    const errObj = err as { name?: string, message?: string, statusMessage?: string, data?: { statusMessage?: string } }
    // Si falló por pérdida súbita de conexión, encolar offline
    if (!navigator.onLine || errObj?.name === 'FetchError' || errObj?.message?.includes('fetch')) {
      enqueueAction({
        tipo: isEditing.value ? 'gasto_update' : 'gasto_create',
        url: isEditing.value ? `/api/gastos/${form.value.id}` : '/api/gastos',
        method: isEditing.value ? 'PUT' : 'POST',
        body: payload,
        descripcion: `Gasto: ${form.value.descripcion} ($${montoNum.toFixed(2)})`
      })
      toast.add({
        title: 'Guardado en modo offline',
        description: 'No se pudo conectar con el servidor. Se guardó localmente para sincronizar.',
        color: 'warning',
        icon: icons.appIcons.cloudOff
      })
      closeExpenseModal()
    } else {
      toast.add({
        title: 'Error al guardar',
        description: errObj?.data?.statusMessage || errObj?.statusMessage || errObj?.message || 'Ocurrió un problema al guardar el gasto.',
        color: 'error',
        icon: icons.ui.icons.error
      })
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="expenseModalOpen"
    :title="isEditing ? 'Editar Gasto' : 'Registrar Nuevo Gasto'"
  >
    <template #body>
      <form
        class="min-w-0 space-y-4"
        @submit.prevent="submitGasto"
      >
        <!-- Fecha del gasto -->
        <UFormField label="Fecha del Gasto">
          <UInput
            v-model="form.fecha"
            type="date"
            class="w-full"
            :icon="icons.appIcons.calendar"
          />
        </UFormField>

        <!-- Tarjeta sugerida y selector -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-sm font-medium text-muted">Tarjeta de Pago</label>
            <div
              v-if="tarjetaSugeridaId"
              class="flex items-center gap-1.5 text-xs"
            >
              <span class="text-muted">Sugerida:</span>
              <UButton
                color="primary"
                variant="subtle"
                size="sm"
                class="cursor-pointer"
                @click="aplicarSugerida"
              >
                {{ props.tarjetas?.find(c => c.id === tarjetaSugeridaId)?.nombre || 'Activa' }}
              </UButton>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              v-for="t in props.tarjetas"
              :key="t.id"
              :aria-pressed="form.tarjeta_id === t.id"
              type="button"
              class="p-3 rounded-lg border text-left transition-all relative flex flex-col justify-between"
              :class="[
                form.tarjeta_id === t.id
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm'
                  : 'border-default hover:border-default bg-muted'
              ]"
              @click="onTarjetaSelectChange(t.id)"
            >
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-1.5 min-w-0">
                  <CardIdentifier
                    :name="t.nombre"
                    :color="t.color"
                    class="text-sm font-medium"
                  />
                  <UIcon
                    v-if="t.es_principal"
                    :name="icons.ui.icons.star"
                    class="w-3 h-3 text-primary fill-current shrink-0"
                    title="Tarjeta Principal"
                  />
                </div>
                <UIcon
                  v-if="form.tarjeta_id === t.id"
                  :name="icons.ui.icons.success"
                  class="w-4 h-4 text-primary shrink-0 ml-1"
                />
              </div>
              <div class="flex items-center justify-between mt-1 text-xs text-muted">
                <span>Corte día {{ t.dia_corte }}</span>
                <span
                  v-if="t.id === tarjetaSugeridaId"
                  class="text-[10px] font-medium text-primary flex items-center gap-1"
                >
                  <UIcon
                    :name="icons.appIcons.sparkles"
                    class="w-3 h-3"
                  /> Recomendada
                </span>
              </div>
            </button>
          </div>

          <!-- Información en tiempo real de liquidación y nómina de pago -->
          <div
            v-if="infoPagoGasto"
            class="mt-2 p-2.5 rounded-lg border text-xs flex items-center gap-2.5 transition-all shadow-xs"
            :class="[
              infoPagoGasto.esDiferido
                ? 'border-info/30 bg-info/10 text-info'
                : 'border-success/30 bg-success/10 text-success dark:text-success'
            ]"
          >
            <UIcon
              :name="infoPagoGasto.esDiferido ? icons.appIcons.calendarClock : icons.appIcons.calendarCheck"
              class="w-4 h-4 shrink-0"
            />
            <div class="leading-tight">
              <span class="font-semibold text-highlighted block">
                {{ infoPagoGasto.etiquetaPago }}
              </span>
              <span class="text-[11px] opacity-80 block mt-0.5">
                Corte de facturación: {{ infoPagoGasto.fechaCorte }}
                <template v-if="infoPagoGasto.esDiferido"> (Gasto diferido al próximo mes)</template>
              </span>
            </div>
          </div>
        </div>

        <!-- Monto y Categoría -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField
            label="Monto ($ USD)"
            required
          >
            <UInput
              v-model="form.monto"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              :icon="icons.appIcons.dollarSign"
              class="w-full"
              required
            />
          </UFormField>

          <UFormField label="Categoría">
            <USelect
              v-model="form.categoria"
              :items="categorias"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Descripción -->
        <UFormField
          label="Descripción / Comercio"
          required
        >
          <UInput
            v-model="form.descripcion"
            placeholder="Ej. Supermercado Chedraui, Retiro de efectivo..."
            :icon="icons.appIcons.shoppingBag"
            class="w-full"
            required
          />
        </UFormField>

        <!-- Aporte de saldo a cuenta (ej. Retiro de efectivo desde tarjeta) -->
        <div
          v-if="cuentasSelectItems.length > 0"
          class="rounded-lg border border-default bg-muted/60 p-3.5 space-y-3"
        >
          <USwitch
            v-model="form.aporta_cuenta"
            label="¿Aporta saldo a una cuenta?"
            description="Actívalo si este movimiento (ej. retiro de efectivo) ingresa dinero a tu cuenta."
          />

          <div
            v-if="form.aporta_cuenta"
            class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-default"
          >
            <UFormField label="Cuenta destino">
              <USelect
                v-model="form.cuenta_destino_id"
                :items="cuentasSelectItems"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Monto abonado ($ USD)"
              hint="Editable si hubo comisión"
            >
              <UInput
                :model-value="form.monto_cuenta"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                :icon="icons.appIcons.landmark"
                class="w-full"
                @update:model-value="onMontoCuentaInput"
              />
            </UFormField>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-default">
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancelar"
            @click="closeExpenseModal"
          />
          <UButton
            type="submit"
            color="primary"
            :loading="loading"
            :icon="isEditing ? icons.appIcons.save : icons.ui.icons.plus"
            :label="isEditing ? 'Guardar Cambios' : 'Registrar Gasto'"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
