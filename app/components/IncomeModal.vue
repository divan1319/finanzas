<script setup lang="ts">
import { formatDateISO } from '#shared/utils/cicloFinanciero'

const icons = useAppConfig()

const props = defineProps<{
  fechaSugerida?: string
}>()

const { incomeModalOpen, closeIncomeModal, triggerRefresh } = useFinanzas()
const { isOnline, enqueueAction } = useOfflineSync()
const toast = useToast()

const form = ref({
  fecha: props.fechaSugerida || formatDateISO(new Date()),
  monto: '',
  descripcion: 'Nómina Quincenal / Mensual'
})

const loading = ref(false)

watch(incomeModalOpen, (open) => {
  if (open) {
    form.value = {
      fecha: props.fechaSugerida || formatDateISO(new Date()),
      monto: '',
      descripcion: 'Nómina'
    }
  }
})

const submitIngreso = async () => {
  if (!form.value.fecha || !form.value.monto) {
    toast.add({
      title: 'Campos incompletos',
      description: 'Por favor indica la fecha y el monto de nómina.',
      color: 'warning',
      icon: icons.ui.icons.warning
    })
    return
  }

  const montoNum = Number(form.value.monto)
  if (isNaN(montoNum) || montoNum <= 0) {
    toast.add({
      title: 'Monto inválido',
      description: 'El monto debe ser un número positivo.',
      color: 'error',
      icon: icons.ui.icons.error
    })
    return
  }

  const payload = {
    fecha: form.value.fecha,
    monto: montoNum,
    descripcion: form.value.descripcion
  }

  // Si estamos sin conexión, guardar directamente en la cola local
  if (!isOnline.value) {
    enqueueAction({
      tipo: 'ingreso_create',
      url: '/api/ingresos',
      method: 'POST',
      body: payload,
      descripcion: `Ingreso: ${form.value.descripcion || 'Nómina'} ($${montoNum.toFixed(2)})`
    })

    toast.add({
      title: 'Guardado sin conexión',
      description: 'El ingreso se guardó localmente. Se sincronizará automáticamente al conectarte.',
      color: 'warning',
      icon: icons.appIcons.cloudOff
    })

    closeIncomeModal()
    return
  }

  loading.value = true
  try {
    await $fetch('/api/ingresos', {
      method: 'POST',
      body: payload
    })

    toast.add({
      title: 'Ingreso registrado',
      description: `Se registró el ingreso de nómina por $${montoNum.toFixed(2)}.`,
      color: 'success',
      icon: icons.ui.icons.success
    })

    await triggerRefresh(['dashboard', 'ingresos', 'historial'])
    closeIncomeModal()
  } catch (err: any) {
    // Si falló por pérdida de conexión
    if (!navigator.onLine || err?.name === 'FetchError' || err?.message?.includes('fetch')) {
      enqueueAction({
        tipo: 'ingreso_create',
        url: '/api/ingresos',
        method: 'POST',
        body: payload,
        descripcion: `Ingreso: ${form.value.descripcion || 'Nómina'} ($${montoNum.toFixed(2)})`
      })
      toast.add({
        title: 'Guardado en modo offline',
        description: 'No se pudo conectar con el servidor. Se guardó localmente para sincronizar.',
        color: 'warning',
        icon: icons.appIcons.cloudOff
      })
      closeIncomeModal()
    } else {
      toast.add({
        title: 'Error al registrar ingreso',
        description: err?.statusMessage || err?.message || 'Ocurrió un problema.',
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
    v-model:open="incomeModalOpen"
    title="Registrar Ingreso de Nómina"
  >
    <template #body>
      <form
        class="min-w-0 space-y-4"
        @submit.prevent="submitIngreso"
      >
        <UFormField
          label="Fecha del Depósito / Nómina"
          required
        >
          <UInput
            v-model="form.fecha"
            type="date"
            class="w-full"
            :icon="icons.appIcons.calendar"
            required
          />
          <p class="text-xs text-muted mt-1">
            Se asociará al período de nómina correspondiente a esta fecha.
          </p>
        </UFormField>

        <UFormField
          label="Monto Percibido ($ USD)"
          required
        >
          <UInput
            v-model="form.monto"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Ej. 2500.00"
            :icon="icons.appIcons.banknote"
            class="w-full"
            required
          />
        </UFormField>

        <UFormField label="Descripción / Concepto">
          <UInput
            v-model="form.descripcion"
            placeholder="Ej. Nómina Agosto, Quincena..."
            :icon="icons.appIcons.fileText"
            class="w-full"
          />
        </UFormField>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-default">
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancelar"
            @click="closeIncomeModal"
          />
          <UButton
            type="submit"
            color="primary"
            :loading="loading"
            :icon="icons.ui.icons.plus"
            label="Guardar Ingreso"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
