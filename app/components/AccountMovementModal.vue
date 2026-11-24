<script setup lang="ts">
import { formatDateISO } from '#shared/utils/cicloFinanciero'

const icons = useAppConfig()

const props = defineProps<{
  cuentas?: Array<{
    id: number
    nombre: string
    banco?: string | null
    es_principal?: boolean
    color?: string | null
  }>
}>()

const { accountMovementModalOpen, accountMovementModalData, closeAccountMovementModal, triggerRefresh } = useFinanzas()
const { isOnline, enqueueAction } = useOfflineSync()
const toast = useToast()

const categoriasEntrada = [
  { label: 'Transferencia recibida', value: 'transferencia' },
  { label: 'Aguinaldo', value: 'aguinaldo' },
  { label: 'Bono / Extra', value: 'bono' },
  { label: 'Otro ingreso', value: 'otro' }
]

const categoriasSalida = [
  { label: 'Transferencia', value: 'transferencia' },
  { label: 'Pago de tarjeta', value: 'pago_tarjeta' },
  { label: 'Retiro de efectivo', value: 'retiro_efectivo' },
  { label: 'Otro cargo', value: 'otro' }
]

const form = ref({
  tipo: 'entrada' as 'entrada' | 'salida',
  cuenta_id: undefined as number | undefined,
  categoria: 'transferencia',
  monto: '',
  fecha: formatDateISO(new Date()),
  descripcion: '',
  es_traspaso_propio: false,
  cuenta_destino_id: undefined as number | undefined
})

const loading = ref(false)

const cuentaPrincipalId = computed(() => {
  return props.cuentas?.find(c => c.es_principal)?.id ?? props.cuentas?.[0]?.id
})

const cuentasSelectItems = computed(() => {
  return (props.cuentas || []).map(c => ({
    label: c.es_principal ? `${c.nombre} (Principal)` : c.nombre,
    value: c.id
  }))
})

const cuentasDestinoItems = computed(() => {
  return (props.cuentas || [])
    .filter(c => c.id !== form.value.cuenta_id)
    .map(c => ({
      label: c.es_principal ? `${c.nombre} (Principal)` : c.nombre,
      value: c.id
    }))
})

const categoriasActuales = computed(() => {
  return form.value.tipo === 'entrada' ? categoriasEntrada : categoriasSalida
})

const puedeTraspasar = computed(() => {
  return form.value.tipo === 'salida'
    && form.value.categoria === 'transferencia'
    && (props.cuentas?.length || 0) > 1
})

watch(() => form.value.tipo, (nuevoTipo) => {
  const validValues = (nuevoTipo === 'entrada' ? categoriasEntrada : categoriasSalida).map(c => c.value)
  if (!validValues.includes(form.value.categoria)) {
    form.value.categoria = nuevoTipo === 'entrada' ? 'transferencia' : 'retiro_efectivo'
  }
  if (nuevoTipo === 'entrada') {
    form.value.es_traspaso_propio = false
  }
})

watch(() => form.value.categoria, (cat) => {
  if (cat !== 'transferencia') {
    form.value.es_traspaso_propio = false
  }
})

watch(() => form.value.es_traspaso_propio, (activo) => {
  if (activo && (!form.value.cuenta_destino_id || form.value.cuenta_destino_id === form.value.cuenta_id)) {
    form.value.cuenta_destino_id = cuentasDestinoItems.value[0]?.value
  }
})

watch(() => form.value.cuenta_id, (newOrigin) => {
  if (form.value.es_traspaso_propio && form.value.cuenta_destino_id === newOrigin) {
    form.value.cuenta_destino_id = cuentasDestinoItems.value[0]?.value
  }
})

watch(accountMovementModalOpen, (open) => {
  if (open) {
    const tipoInicial = accountMovementModalData.value?.tipo || 'entrada'
    const cuentaInicial = accountMovementModalData.value?.cuenta_id || cuentaPrincipalId.value
    const categoriaInicial = accountMovementModalData.value?.categoria
      || (tipoInicial === 'entrada' ? 'transferencia' : 'retiro_efectivo')

    form.value = {
      tipo: tipoInicial,
      cuenta_id: cuentaInicial,
      categoria: categoriaInicial,
      monto: '',
      fecha: formatDateISO(new Date()),
      descripcion: '',
      es_traspaso_propio: false,
      cuenta_destino_id: props.cuentas?.find(c => c.id !== cuentaInicial)?.id
    }
  }
})

const submitMovimiento = async () => {
  if (loading.value) return

  if (!form.value.cuenta_id || !form.value.fecha || !form.value.monto) {
    toast.add({
      title: 'Campos incompletos',
      description: 'Selecciona la cuenta, la fecha e ingresa un monto válido.',
      color: 'warning',
      icon: icons.ui.icons.warning
    })
    return
  }

  const montoNum = Number(form.value.monto)
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    toast.add({
      title: 'Monto inválido',
      description: 'El monto debe ser un número mayor a 0.',
      color: 'error',
      icon: icons.ui.icons.error
    })
    return
  }

  const esTraspaso = puedeTraspasar.value && form.value.es_traspaso_propio
  if (esTraspaso && (!form.value.cuenta_destino_id || form.value.cuenta_destino_id === form.value.cuenta_id)) {
    toast.add({
      title: 'Cuenta destino inválida',
      description: 'Selecciona otra de tus cuentas para realizar el traspaso.',
      color: 'warning',
      icon: icons.ui.icons.warning
    })
    return
  }

  const payload = {
    tipo: form.value.tipo,
    cuenta_id: form.value.cuenta_id,
    categoria: form.value.categoria,
    monto: montoNum,
    fecha: form.value.fecha,
    descripcion: form.value.descripcion,
    es_traspaso_propio: esTraspaso,
    cuenta_destino_id: esTraspaso ? form.value.cuenta_destino_id : undefined
  }

  const etiquetaDesc = form.value.descripcion.trim()
    || categoriasActuales.value.find(c => c.value === form.value.categoria)?.label
    || 'Movimiento'

  if (!isOnline.value) {
    enqueueAction({
      tipo: 'movimiento_cuenta_create',
      url: '/api/cuentas/movimientos',
      method: 'POST',
      body: payload,
      descripcion: `${form.value.tipo === 'entrada' ? 'Entrada' : 'Salida'}: ${etiquetaDesc} ($${montoNum.toFixed(2)})`
    })
    toast.add({
      title: 'Guardado sin conexión',
      description: 'El movimiento se guardó en tu dispositivo y se sincronizará al volver a conectarte.',
      color: 'warning',
      icon: icons.appIcons.cloudOff
    })
    closeAccountMovementModal()
    return
  }

  loading.value = true
  try {
    await $fetch('/api/cuentas/movimientos', {
      method: 'POST',
      body: payload
    })

    toast.add({
      title: esTraspaso ? 'Traspaso registrado' : (form.value.tipo === 'entrada' ? 'Entrada registrada' : 'Salida registrada'),
      description: `Se registró el movimiento por $${montoNum.toFixed(2)}.`,
      color: 'success',
      icon: icons.ui.icons.success
    })

    await triggerRefresh(['dashboard', 'cuentas', 'cuentas-movimientos'])
    closeAccountMovementModal()
  } catch (err: unknown) {
    const errObj = err as { name?: string, message?: string, statusMessage?: string, data?: { statusMessage?: string } }
    if (!navigator.onLine || errObj?.name === 'FetchError' || errObj?.message?.includes('fetch')) {
      enqueueAction({
        tipo: 'movimiento_cuenta_create',
        url: '/api/cuentas/movimientos',
        method: 'POST',
        body: payload,
        descripcion: `${form.value.tipo === 'entrada' ? 'Entrada' : 'Salida'}: ${etiquetaDesc} ($${montoNum.toFixed(2)})`
      })
      toast.add({
        title: 'Guardado en modo offline',
        description: 'No se pudo conectar al servidor. Se guardó localmente para sincronizar.',
        color: 'warning',
        icon: icons.appIcons.cloudOff
      })
      closeAccountMovementModal()
    } else {
      toast.add({
        title: 'Error al registrar movimiento',
        description: errObj?.data?.statusMessage || errObj?.statusMessage || errObj?.message || 'No se pudo guardar el movimiento.',
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
    v-model:open="accountMovementModalOpen"
    title="Movimiento en Cuenta"
  >
    <template #body>
      <form
        class="min-w-0 space-y-4"
        @submit.prevent="submitMovimiento"
      >
        <!-- Selector Entrada / Salida -->
        <div
          class="grid grid-cols-2 gap-2"
          role="group"
          aria-label="Tipo de movimiento"
        >
          <button
            type="button"
            class="flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all"
            :class="form.tipo === 'entrada' ? 'border-success bg-success/10 text-success ring-2 ring-success/25' : 'border-default bg-muted text-muted'"
            :aria-pressed="form.tipo === 'entrada'"
            @click="form.tipo = 'entrada'"
          >
            <UIcon
              :name="icons.ui.icons.plus"
              class="size-4"
            />
            Entrada (+)
          </button>
          <button
            type="button"
            class="flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all"
            :class="form.tipo === 'salida' ? 'border-error bg-error/10 text-error ring-2 ring-error/25' : 'border-default bg-muted text-muted'"
            :aria-pressed="form.tipo === 'salida'"
            @click="form.tipo = 'salida'"
          >
            <UIcon
              :name="icons.ui.icons.minus"
              class="size-4"
            />
            Salida (-)
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField
            :label="form.tipo === 'entrada' ? 'Cuenta que recibe' : 'Cuenta origen'"
            required
          >
            <USelect
              v-model="form.cuenta_id"
              :items="cuentasSelectItems"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Concepto / Tipo"
            required
          >
            <USelect
              v-model="form.categoria"
              :items="categoriasActuales"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Traspaso entre cuentas propias -->
        <div
          v-if="puedeTraspasar"
          class="rounded-lg border border-default bg-muted/60 p-3.5 space-y-3"
        >
          <USwitch
            v-model="form.es_traspaso_propio"
            label="Traspaso a otra de mis cuentas"
            description="Resta el saldo de la cuenta origen y lo suma automáticamente en la cuenta destino."
          />

          <UFormField
            v-if="form.es_traspaso_propio"
            label="Cuenta destino"
            required
          >
            <USelect
              v-model="form.cuenta_destino_id"
              :items="cuentasDestinoItems"
              class="w-full"
            />
          </UFormField>
        </div>

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

          <UFormField
            label="Fecha"
            required
          >
            <UInput
              v-model="form.fecha"
              type="date"
              :icon="icons.appIcons.calendar"
              class="w-full"
              required
            />
          </UFormField>
        </div>

        <UFormField
          label="Descripción"
          hint="Opcional"
        >
          <UInput
            v-model="form.descripcion"
            placeholder="Ej. Bono trimestral, Pago de tarjeta, Retiro cajero..."
            :icon="icons.appIcons.fileText"
            class="w-full"
          />
        </UFormField>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-default">
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancelar"
            @click="closeAccountMovementModal"
          />
          <UButton
            type="submit"
            :color="form.tipo === 'entrada' ? 'primary' : 'neutral'"
            :loading="loading"
            :icon="icons.appIcons.save"
            :label="form.es_traspaso_propio ? 'Registrar Traspaso' : (form.tipo === 'entrada' ? 'Registrar Entrada' : 'Registrar Salida')"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
