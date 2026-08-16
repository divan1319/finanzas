<script setup lang="ts">
import { tarjetaActivaEn, formatDateISO } from '#shared/utils/cicloFinanciero'

const props = defineProps<{
  tarjetas?: Array<{ id: number; codigo: string; nombre: string; color?: string | null }>
  diaObjetivoNomina?: number
}>()

const { expenseModalOpen, expenseModalData, closeExpenseModal, triggerRefresh } = useFinanzas()
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
  categoria: 'Alimentos'
})

const loading = ref(false)
const manualCardOverride = ref(false)

const isEditing = computed(() => !!form.value.id)

// Tarjeta sugerida automáticamente según la fecha
const tarjetaSugeridaCodigo = computed(() => {
  if (!form.value.fecha) return 'A'
  return tarjetaActivaEn(form.value.fecha, props.diaObjetivoNomina || 26)
})

const tarjetaSugeridaId = computed(() => {
  const t = props.tarjetas?.find(c => c.codigo === tarjetaSugeridaCodigo.value)
  return t?.id
})

// Auto-seleccionar tarjeta al cambiar la fecha si el usuario no ha forzado un override manual
watch(() => form.value.fecha, (newFecha) => {
  if (!isEditing.value && !manualCardOverride.value && newFecha) {
    if (tarjetaSugeridaId.value) {
      form.value.tarjeta_id = tarjetaSugeridaId.value
    }
  }
})

// Inicializar cuando se abre el modal
watch(expenseModalOpen, (open) => {
  if (open) {
    manualCardOverride.value = false
    if (expenseModalData.value) {
      form.value = {
        id: expenseModalData.value.id || null,
        tarjeta_id: expenseModalData.value.tarjeta_id || tarjetaSugeridaId.value,
        fecha: expenseModalData.value.fecha || formatDateISO(new Date()),
        monto: expenseModalData.value.monto != null ? String(expenseModalData.value.monto) : '',
        descripcion: expenseModalData.value.descripcion || '',
        categoria: expenseModalData.value.categoria || 'Alimentos'
      }
    } else {
      form.value = {
        id: null,
        tarjeta_id: tarjetaSugeridaId.value,
        fecha: formatDateISO(new Date()),
        monto: '',
        descripcion: '',
        categoria: 'Alimentos'
      }
    }
  }
})

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
      icon: 'i-lucide-alert-triangle'
    })
    return
  }

  const montoNum = Number(form.value.monto)
  if (isNaN(montoNum) || montoNum <= 0) {
    toast.add({
      title: 'Monto inválido',
      description: 'El monto debe ser un valor numérico positivo.',
      color: 'error',
      icon: 'i-lucide-x-circle'
    })
    return
  }

  loading.value = true
  try {
    if (isEditing.value) {
      await $fetch(`/api/gastos/${form.value.id}`, {
        method: 'PUT',
        body: {
          tarjeta_id: form.value.tarjeta_id,
          fecha: form.value.fecha,
          monto: montoNum,
          descripcion: form.value.descripcion,
          categoria: form.value.categoria
        }
      })
      toast.add({
        title: 'Gasto actualizado',
        description: 'Se guardaron los cambios correctamente.',
        color: 'success',
        icon: 'i-lucide-check'
      })
    } else {
      await $fetch('/api/gastos', {
        method: 'POST',
        body: {
          tarjeta_id: form.value.tarjeta_id,
          fecha: form.value.fecha,
          monto: montoNum,
          descripcion: form.value.descripcion,
          categoria: form.value.categoria
        }
      })
      toast.add({
        title: 'Gasto registrado',
        description: `Se registró el gasto de $${montoNum.toFixed(2)} exitosamente.`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    }

    triggerRefresh()
    closeExpenseModal()
  } catch (err: any) {
    toast.add({
      title: 'Error al guardar',
      description: err?.statusMessage || err?.message || 'Ocurrió un problema al guardar el gasto.',
      color: 'error',
      icon: 'i-lucide-x-circle'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="expenseModalOpen" :title="isEditing ? 'Editar Gasto' : 'Registrar Nuevo Gasto'">
    <template #body>
      <form class="space-y-4" @submit.prevent="submitGasto">
        <!-- Fecha del gasto -->
        <div>
          <label class="block text-sm font-medium text-muted mb-1">Fecha del Gasto</label>
          <UInput
            v-model="form.fecha"
            type="date"
            class="w-full"
            icon="i-lucide-calendar"
          />
        </div>

        <!-- Tarjeta sugerida y selector -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-sm font-medium text-muted">Tarjeta de Pago</label>
            <div v-if="tarjetaSugeridaId" class="flex items-center gap-1.5 text-xs">
              <span class="text-muted">Sugerida:</span>
              <UBadge
                color="primary"
                variant="subtle"
                size="sm"
                class="cursor-pointer"
                @click="aplicarSugerida"
              >
                {{ props.tarjetas?.find(c => c.id === tarjetaSugeridaId)?.nombre || 'Activa' }}
              </UBadge>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              v-for="t in props.tarjetas"
              :key="t.id"
              type="button"
              class="p-3 rounded-lg border text-left transition-all relative flex flex-col justify-between"
              :class="[
                form.tarjeta_id === t.id
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm'
                  : 'border-muted/30 hover:border-muted/60 bg-muted/5'
              ]"
              @click="onTarjetaSelectChange(t.id)"
            >
              <div class="flex items-center justify-between w-full">
                <span class="font-semibold text-sm truncate text-foreground">{{ t.nombre }}</span>
                <UIcon
                  v-if="form.tarjeta_id === t.id"
                  name="i-lucide-check-circle-2"
                  class="w-4 h-4 text-primary shrink-0 ml-1"
                />
              </div>
              <div class="flex items-center justify-between mt-1 text-xs text-muted">
                <span>Corte día {{ t.dia_corte }}</span>
                <span
                  v-if="t.id === tarjetaSugeridaId"
                  class="text-[10px] font-medium text-primary flex items-center gap-1"
                >
                  <UIcon name="i-lucide-sparkles" class="w-3 h-3" /> Recomendada
                </span>
              </div>
            </button>
          </div>
        </div>

        <!-- Monto y Categoría -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-muted mb-1">Monto ($ USD)</label>
            <UInput
              v-model="form.monto"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              icon="i-lucide-dollar-sign"
              class="w-full"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-muted mb-1">Categoría</label>
            <select
              v-model="form.categoria"
              class="w-full rounded-md border border-muted/30 bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option v-for="cat in categorias" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>
        </div>

        <!-- Descripción -->
        <div>
          <label class="block text-sm font-medium text-muted mb-1">Descripción / Comercio</label>
          <UInput
            v-model="form.descripcion"
            placeholder="Ej. Supermercado Chedraui, Gasolina, Netflix..."
            icon="i-lucide-shopping-bag"
            class="w-full"
            required
          />
        </div>

        <!-- Botones de Acción -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-muted/20">
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
            :icon="isEditing ? 'i-lucide-save' : 'i-lucide-plus'"
            :label="isEditing ? 'Guardar Cambios' : 'Registrar Gasto'"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
