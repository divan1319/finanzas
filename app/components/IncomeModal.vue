<script setup lang="ts">
import { formatDateISO } from '#shared/utils/cicloFinanciero'

const props = defineProps<{
  fechaSugerida?: string
}>()

const { incomeModalOpen, closeIncomeModal, triggerRefresh } = useFinanzas()
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
      icon: 'i-lucide-alert-triangle'
    })
    return
  }

  const montoNum = Number(form.value.monto)
  if (isNaN(montoNum) || montoNum <= 0) {
    toast.add({
      title: 'Monto inválido',
      description: 'El monto debe ser un número positivo.',
      color: 'error',
      icon: 'i-lucide-x-circle'
    })
    return
  }

  loading.value = true
  try {
    await $fetch('/api/ingresos', {
      method: 'POST',
      body: {
        fecha: form.value.fecha,
        monto: montoNum,
        descripcion: form.value.descripcion
      }
    })

    toast.add({
      title: 'Ingreso registrado',
      description: `Se registró el ingreso de nómina por $${montoNum.toFixed(2)}.`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })

    triggerRefresh()
    closeIncomeModal()
  } catch (err: any) {
    toast.add({
      title: 'Error al registrar ingreso',
      description: err?.statusMessage || err?.message || 'Ocurrió un problema.',
      color: 'error',
      icon: 'i-lucide-x-circle'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="incomeModalOpen" title="Registrar Ingreso de Nómina">
    <template #body>
      <form class="space-y-4" @submit.prevent="submitIngreso">
        <div>
          <label class="block text-sm font-medium text-muted mb-1">Fecha del Depósito / Nómina</label>
          <UInput
            v-model="form.fecha"
            type="date"
            class="w-full"
            icon="i-lucide-calendar"
            required
          />
          <p class="text-xs text-muted mt-1">
            Se asociará al período de nómina correspondiente a esta fecha.
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-muted mb-1">Monto Percibido ($ USD)</label>
          <UInput
            v-model="form.monto"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Ej. 2500.00"
            icon="i-lucide-banknote"
            class="w-full"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-muted mb-1">Descripción / Concepto</label>
          <UInput
            v-model="form.descripcion"
            placeholder="Ej. Nómina Agosto, Quincena..."
            icon="i-lucide-file-text"
            class="w-full"
          />
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-muted/20">
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
            icon="i-lucide-plus-circle"
            label="Guardar Ingreso"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
