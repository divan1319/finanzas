<script setup lang="ts">
import { formatDateISO } from '#shared/utils/cicloFinanciero'

const icons = useAppConfig()

const props = defineProps<{
  fechaSugerida?: string
}>()

const { incomeModalOpen, incomeModalData, closeIncomeModal, triggerRefresh } = useFinanzas()
const { isOnline, enqueueAction } = useOfflineSync()
const toast = useToast()

const form = ref({
  id: null as number | null,
  fecha: props.fechaSugerida || formatDateISO(new Date()),
  monto: '',
  descripcion: 'Nómina Quincenal / Mensual'
})

const loading = ref(false)
const errorMessage = ref('')
const isEditing = computed(() => form.value.id !== null)

watch(incomeModalOpen, (open) => {
  if (open) {
    errorMessage.value = ''
    form.value = {
      id: incomeModalData.value?.id ?? null,
      fecha: incomeModalData.value?.fecha || props.fechaSugerida || formatDateISO(new Date()),
      monto: incomeModalData.value ? String(incomeModalData.value.monto) : '',
      descripcion: incomeModalData.value?.descripcion ?? 'Nómina'
    }
  }
})

const submitIngreso = async () => {
  if (loading.value) return
  errorMessage.value = ''
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
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
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
  const editing = isEditing.value
  const action = {
    tipo: editing ? 'ingreso_update' as const : 'ingreso_create' as const,
    url: editing ? `/api/ingresos/${form.value.id}` : '/api/ingresos',
    method: editing ? 'PUT' as const : 'POST' as const,
    body: payload,
    descripcion: `${editing ? 'Actualizar nómina' : 'Ingreso'}: ${payload.descripcion || 'Nómina'} ($${montoNum.toFixed(2)})`
  }

  // Si estamos sin conexión, guardar directamente en la cola local
  if (!isOnline.value) {
    enqueueAction(action)

    toast.add({
      title: editing ? 'Cambios guardados sin conexión' : 'Guardado sin conexión',
      description: 'El ingreso se guardó localmente. Se sincronizará automáticamente al conectarte.',
      color: 'warning',
      icon: icons.appIcons.cloudOff
    })

    closeIncomeModal()
    return
  }

  loading.value = true
  try {
    await $fetch(action.url, {
      method: action.method,
      body: payload
    })

    toast.add({
      title: editing ? 'Nómina actualizada' : 'Ingreso registrado',
      description: `${editing ? 'Se actualizó' : 'Se registró'} el ingreso de nómina por $${montoNum.toFixed(2)}.`,
      color: 'success',
      icon: icons.ui.icons.success
    })

    await triggerRefresh(['dashboard', 'ingresos', 'historial'])
    closeIncomeModal()
  } catch (err: unknown) {
    const error = err as {
      statusCode?: number
      status?: number
      name?: string
      message?: string
      statusMessage?: string
      response?: { status?: number }
      data?: { statusMessage?: string, message?: string }
    }
    const status = error?.statusCode || error?.status || error?.response?.status
    // HTTP validation/not-found errors must remain visible, never enter the offline queue.
    if (!status && (!navigator.onLine || error?.name === 'FetchError' || error?.message?.includes('fetch'))) {
      enqueueAction(action)
      toast.add({
        title: 'Guardado en modo offline',
        description: 'No se pudo conectar con el servidor. Se guardó localmente para sincronizar.',
        color: 'warning',
        icon: icons.appIcons.cloudOff
      })
      closeIncomeModal()
    } else {
      errorMessage.value = error?.data?.statusMessage || error?.data?.message || error?.statusMessage || error?.message || 'No se pudo guardar la nómina.'
      toast.add({
        title: editing ? 'Error al actualizar nómina' : 'Error al registrar ingreso',
        description: errorMessage.value,
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
    :title="isEditing ? 'Editar nómina' : 'Registrar Ingreso de Nómina'"
  >
    <template #body>
      <form
        class="min-w-0 space-y-4"
        @submit.prevent="submitIngreso"
      >
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          :icon="icons.ui.icons.error"
          :title="errorMessage"
          role="alert"
        />
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
            :icon="isEditing ? icons.appIcons.save : icons.ui.icons.plus"
            :label="isEditing ? 'Guardar cambios' : 'Guardar Ingreso'"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
