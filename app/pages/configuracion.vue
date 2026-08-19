<script setup lang="ts">
const { triggerRefresh } = useFinanzas()
const toast = useToast()

const { data: configData, pending, refresh } = useCachedFetch('/api/configuracion', {
  key: 'global-config'
})

// Formulario de Reglas Globales (Nómina y Límite)
const formGlobal = ref({
  dia_objetivo_nomina: 26,
  limite_gasto_periodo: 15000
})

watch(configData, (val) => {
  if (val?.configuracion) {
    formGlobal.value.dia_objetivo_nomina = val.configuracion.dia_objetivo_nomina
    formGlobal.value.limite_gasto_periodo = val.configuracion.limite_gasto_periodo
  }
}, { immediate: true })

const savingGlobal = ref(false)
const guardarReglasGlobales = async () => {
  savingGlobal.value = true
  try {
    await $fetch('/api/configuracion', {
      method: 'PUT',
      body: {
        dia_objetivo_nomina: Number(formGlobal.value.dia_objetivo_nomina),
        limite_gasto_periodo: Number(formGlobal.value.limite_gasto_periodo)
      }
    })

    toast.add({
      title: 'Configuración guardada',
      description: 'Los parámetros de nómina y presupuesto se han actualizado.',
      color: 'success',
      icon: 'i-lucide-check'
    })

    triggerRefresh()
    refresh()
  } catch (err: any) {
    toast.add({
      title: 'Error al guardar',
      description: err?.message || 'No se pudo guardar la configuración',
      color: 'error'
    })
  } finally {
    savingGlobal.value = false
  }
}

// Colores disponibles para tarjetas
const colorOptions = [
  { value: 'emerald', label: 'Esmeralda', bgClass: 'bg-emerald-500', textClass: 'text-emerald-400', borderClass: 'border-emerald-500/30' },
  { value: 'indigo', label: 'Índigo', bgClass: 'bg-indigo-500', textClass: 'text-indigo-400', borderClass: 'border-indigo-500/30' },
  { value: 'amber', label: 'Ámbar / Dorado', bgClass: 'bg-amber-500', textClass: 'text-amber-400', borderClass: 'border-amber-500/30' },
  { value: 'violet', label: 'Violeta / Púrpura', bgClass: 'bg-violet-500', textClass: 'text-violet-400', borderClass: 'border-violet-500/30' },
  { value: 'rose', label: 'Rosa / Carmín', bgClass: 'bg-rose-500', textClass: 'text-rose-400', borderClass: 'border-rose-500/30' },
  { value: 'sky', label: 'Azul Cielo', bgClass: 'bg-sky-500', textClass: 'text-sky-400', borderClass: 'border-sky-500/30' }
]

const getCardBorderClass = (color?: string | null) => {
  switch (color) {
    case 'indigo': return 'border-indigo-500/25 bg-indigo-500/5'
    case 'amber': return 'border-amber-500/25 bg-amber-500/5'
    case 'violet':
    case 'purple': return 'border-violet-500/25 bg-violet-500/5'
    case 'rose':
    case 'red': return 'border-rose-500/25 bg-rose-500/5'
    case 'sky':
    case 'cyan':
    case 'blue': return 'border-sky-500/25 bg-sky-500/5'
    default: return 'border-emerald-500/25 bg-emerald-500/5'
  }
}

const getCardDotClass = (color?: string | null) => {
  switch (color) {
    case 'indigo': return 'bg-indigo-500'
    case 'amber': return 'bg-amber-500'
    case 'violet':
    case 'purple': return 'bg-violet-500'
    case 'rose':
    case 'red': return 'bg-rose-500'
    case 'sky':
    case 'cyan':
    case 'blue': return 'bg-sky-500'
    default: return 'bg-emerald-500'
  }
}

// Modal Agregar Tarjeta
const addCardModalOpen = ref(false)
const addingCard = ref(false)
const newCardForm = ref<{
  nombre: string
  dia_corte: number
  dia_vencimiento_pago: number | undefined
  dia_pago_propio_tipo: string
  es_principal: boolean
  color: string
}>({
  nombre: '',
  dia_corte: 5,
  dia_vencimiento_pago: undefined,
  dia_pago_propio_tipo: 'dia_siguiente_corte',
  es_principal: false,
  color: 'emerald'
})

const openAddCardModal = () => {
  newCardForm.value = {
    nombre: '',
    dia_corte: 5,
    dia_vencimiento_pago: undefined,
    dia_pago_propio_tipo: 'dia_siguiente_corte',
    es_principal: false,
    color: 'emerald'
  }
  addCardModalOpen.value = true
}

const submitAddCard = async () => {
  if (!newCardForm.value.nombre.trim()) {
    toast.add({ title: 'Nombre requerido', description: 'Por favor ingresa un nombre para la tarjeta.', color: 'warning' })
    return
  }
  addingCard.value = true
  try {
    await $fetch('/api/tarjetas', {
      method: 'POST',
      body: {
        nombre: newCardForm.value.nombre.trim(),
        dia_corte: Number(newCardForm.value.dia_corte),
        dia_vencimiento_pago: newCardForm.value.dia_vencimiento_pago ? Number(newCardForm.value.dia_vencimiento_pago) : null,
        dia_pago_propio_tipo: newCardForm.value.dia_pago_propio_tipo,
        es_principal: newCardForm.value.es_principal,
        color: newCardForm.value.color
      }
    })

    toast.add({
      title: 'Tarjeta Agregada',
      description: `Se creó "${newCardForm.value.nombre}" exitosamente.`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })

    addCardModalOpen.value = false
    triggerRefresh()
    refresh()
  } catch (err: any) {
    toast.add({
      title: 'Error al crear tarjeta',
      description: err?.statusMessage || err?.message || 'No se pudo agregar la tarjeta.',
      color: 'error'
    })
  } finally {
    addingCard.value = false
  }
}

// Modal Editar Tarjeta
const editCardModalOpen = ref(false)
const editingCard = ref(false)
const editCardForm = ref<{
  id: number
  nombre: string
  dia_corte: number
  dia_vencimiento_pago: number | undefined
  dia_pago_propio_tipo: string
  es_principal: boolean
  color: string
}>({
  id: 0,
  nombre: '',
  dia_corte: 5,
  dia_vencimiento_pago: undefined,
  dia_pago_propio_tipo: 'dia_siguiente_corte',
  es_principal: false,
  color: 'emerald'
})

const openEditCardModal = (card: any) => {
  editCardForm.value = {
    id: card.id,
    nombre: card.nombre,
    dia_corte: card.dia_corte,
    dia_vencimiento_pago: card.dia_vencimiento_pago || undefined,
    dia_pago_propio_tipo: card.dia_pago_propio_tipo || (card.es_principal ? 'dia_siguiente_corte' : 'dia_nomina'),
    es_principal: Boolean(card.es_principal),
    color: card.color || 'emerald'
  }
  editCardModalOpen.value = true
}

const submitEditCard = async () => {
  if (!editCardForm.value.nombre.trim()) {
    toast.add({ title: 'Nombre requerido', description: 'Por favor ingresa un nombre para la tarjeta.', color: 'warning' })
    return
  }
  editingCard.value = true
  try {
    await $fetch(`/api/tarjetas/${editCardForm.value.id}`, {
      method: 'PUT',
      body: {
        nombre: editCardForm.value.nombre.trim(),
        dia_corte: Number(editCardForm.value.dia_corte),
        dia_vencimiento_pago: editCardForm.value.dia_vencimiento_pago ? Number(editCardForm.value.dia_vencimiento_pago) : null,
        dia_pago_propio_tipo: editCardForm.value.dia_pago_propio_tipo,
        es_principal: editCardForm.value.es_principal,
        color: editCardForm.value.color
      }
    })

    toast.add({
      title: 'Tarjeta Actualizada',
      description: `Los cambios para "${editCardForm.value.nombre}" fueron guardados.`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })

    editCardModalOpen.value = false
    triggerRefresh()
    refresh()
  } catch (err: any) {
    toast.add({
      title: 'Error al actualizar',
      description: err?.statusMessage || err?.message || 'No se pudo actualizar la tarjeta.',
      color: 'error'
    })
  } finally {
    editingCard.value = false
  }
}

// Marcar rápidamente como Tarjeta Principal
const settingPrincipalId = ref<number | null>(null)
const marcarComoPrincipal = async (card: any) => {
  if (card.es_principal) return
  settingPrincipalId.value = card.id
  try {
    await $fetch(`/api/tarjetas/${card.id}`, {
      method: 'PUT',
      body: {
        es_principal: true,
        dia_pago_propio_tipo: 'dia_siguiente_corte'
      }
    })
    toast.add({
      title: 'Tarjeta Principal Actualizada',
      description: `"${card.nombre}" ahora es tu tarjeta principal de uso mensual.`,
      color: 'success',
      icon: 'i-lucide-star'
    })
    triggerRefresh()
    refresh()
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.message || 'No se pudo cambiar la tarjeta principal.',
      color: 'error'
    })
  } finally {
    settingPrincipalId.value = null
  }
}

// Modal y Manejo de Eliminación con Validación
const deleteModalOpen = ref(false)
const cardToDelete = ref<any>(null)
const deletingCard = ref(false)
const deleteErrorMessage = ref<string | null>(null)

const openDeleteCardModal = (card: any) => {
  cardToDelete.value = card
  deleteErrorMessage.value = null
  deleteModalOpen.value = true
}

const confirmDeleteCard = async () => {
  if (!cardToDelete.value) return
  deletingCard.value = true
  deleteErrorMessage.value = null

  try {
    await $fetch(`/api/tarjetas/${cardToDelete.value.id}`, {
      method: 'DELETE'
    })

    toast.add({
      title: 'Tarjeta Eliminada',
      description: `La tarjeta "${cardToDelete.value.nombre}" ha sido eliminada.`,
      color: 'success',
      icon: 'i-lucide-trash'
    })

    deleteModalOpen.value = false
    cardToDelete.value = null
    triggerRefresh()
    refresh()
  } catch (err: any) {
    deleteErrorMessage.value = err?.statusMessage || err?.message || 'No se puede eliminar la tarjeta.'
    toast.add({
      title: 'No se puede eliminar',
      description: deleteErrorMessage.value || undefined,
      color: 'error'
    })
  } finally {
    deletingCard.value = false
  }
}

// Mantenimiento de Datos y Demo
const confirmResetModalOpen = ref(false)
const resetting = ref(false)
const resetData = async () => {
  resetting.value = true
  try {
    await $fetch('/api/reset-data', { method: 'POST' })
    toast.add({
      title: 'Datos Eliminados',
      description: 'Todos los gastos, nóminas y reconciliaciones han sido borrados.',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    confirmResetModalOpen.value = false
    triggerRefresh()
  } catch (err: any) {
    toast.add({
      title: 'Error al limpiar',
      description: err?.message,
      color: 'error'
    })
  } finally {
    resetting.value = false
  }
}

const seeding = ref(false)
const seedDemo = async () => {
  seeding.value = true
  try {
    await $fetch('/api/seed-demo', { method: 'POST' })
    toast.add({
      title: 'Datos Demo Cargados',
      description: 'Se han generado movimientos de prueba.',
      color: 'success',
      icon: 'i-lucide-sparkles'
    })
    triggerRefresh()
    refresh()
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.message,
      color: 'error'
    })
  } finally {
    seeding.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <!-- Encabezado -->
    <div>
      <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Configuración del Sistema</h1>
      <p class="text-sm text-muted">Ajusta los parámetros de nómina, presupuesto mensual y gestiona tus tarjetas de crédito</p>
    </div>

    <!-- 1. Sección Presupuesto y Nómina -->
    <div class="rounded-2xl border border-muted/20 bg-card p-6 shadow-xs space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <UIcon name="i-lucide-sliders" class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-bold text-foreground">Reglas de Nómina y Presupuesto</h3>
            <p class="text-xs text-muted">Afecta el cálculo de períodos y el límite de gasto mensual combinado</p>
          </div>
        </div>
      </div>

      <form class="space-y-4 pt-2" @submit.prevent="guardarReglasGlobales">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-muted mb-1">Día Objetivo de Nómina (Default 26)</label>
            <UInput
              v-model="formGlobal.dia_objetivo_nomina"
              type="number"
              min="1"
              max="31"
              class="w-full"
              required
            />
            <span class="text-[11px] text-muted mt-1 block">
              Si cae sábado se recorre al viernes 25; si cae domingo, al viernes 24.
            </span>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-1">Límite de Gasto por Período ($ USD)</label>
            <UInput
              v-model="formGlobal.limite_gasto_periodo"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              class="w-full"
              required
            />
            <span class="text-[11px] text-muted mt-1 block">
              Límite combinado para la suma de todas las tarjetas por período de nómina.
            </span>
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <UButton
            type="submit"
            size="md"
            color="primary"
            icon="i-lucide-save"
            label="Guardar Reglas de Presupuesto"
            :loading="savingGlobal"
            class="font-semibold shadow-xs"
          />
        </div>
      </form>
    </div>

    <!-- 2. Sección Tarjetas de Crédito Dinámicas -->
    <div class="rounded-2xl border border-muted/20 bg-card p-6 shadow-xs space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <UIcon name="i-lucide-credit-card" class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-bold text-foreground">Tarjetas de Crédito</h3>
            <p class="text-xs text-muted">Personaliza nombres, días de corte, reglas de pago o agrega nuevas tarjetas</p>
          </div>
        </div>

        <UButton
          size="sm"
          color="primary"
          icon="i-lucide-plus"
          label="Agregar Tarjeta"
          class="font-semibold shadow-xs shrink-0 self-start sm:self-auto"
          @click="openAddCardModal"
        />
      </div>

      <!-- Estado de carga o sin tarjetas -->
      <div v-if="pending" class="py-10 text-center text-muted text-xs">
        <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
        <span>Cargando tarjetas...</span>
      </div>

      <div v-else-if="!configData?.tarjetas || configData.tarjetas.length === 0" class="py-10 text-center text-muted space-y-3">
        <UIcon name="i-lucide-credit-card" class="w-10 h-10 mx-auto opacity-30" />
        <p class="text-xs">No tienes tarjetas registradas aún.</p>
        <UButton size="sm" color="primary" icon="i-lucide-plus" label="Agregar Tarjeta" @click="openAddCardModal" />
      </div>

      <!-- Grid de Tarjetas -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="t in configData.tarjetas"
          :key="t.id"
          class="rounded-xl border p-4.5 space-y-3 relative transition-all"
          :class="[
            getCardBorderClass(t.color),
            t.es_principal ? 'ring-2 ring-primary/40' : ''
          ]"
        >
          <!-- Encabezado de la Tarjeta -->
          <div class="flex items-start justify-between gap-2">
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full shrink-0" :class="getCardDotClass(t.color)" />
                <span class="font-bold text-base text-foreground truncate">{{ t.nombre }}</span>
              </div>
              <div v-if="t.es_principal" class="pt-0.5">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 shadow-xs">
                  <UIcon name="i-lucide-star" class="w-3 h-3 fill-amber-500" />
                  Tarjeta Principal (Uso Mensual)
                </span>
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <UButton
                v-if="!t.es_principal"
                size="xs"
                color="primary"
                variant="subtle"
                icon="i-lucide-star"
                label="Hacer Principal"
                :loading="settingPrincipalId === t.id"
                title="Establecer como tarjeta principal de uso mensual"
                @click="marcarComoPrincipal(t)"
              />
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-pencil"
                title="Editar tarjeta"
                @click="openEditCardModal(t)"
              />
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                title="Eliminar tarjeta"
                @click="openDeleteCardModal(t)"
              />
            </div>
          </div>

          <!-- Atributos -->
          <div class="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-muted/15">
            <div>
              <span class="text-muted block text-[11px]">Día de Corte</span>
              <strong class="text-foreground">Día {{ t.dia_corte }} de cada mes</strong>
            </div>

            <div>
              <span class="text-muted block text-[11px]">Vencimiento / Límite</span>
              <strong class="text-foreground">
                {{ t.dia_vencimiento_pago ? `Día ${t.dia_vencimiento_pago}` : 'No definido' }}
              </strong>
            </div>

            <div class="col-span-2 pt-1">
              <span class="text-muted block text-[11px]">Regla de Pago</span>
              <span class="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                <UIcon name="i-lucide-calendar-check" class="w-3 h-3" />
                <template v-if="t.es_principal || t.dia_pago_propio_tipo === 'dia_siguiente_corte'">
                  Se paga al día siguiente del corte (día {{ t.dia_corte + 1 }})
                </template>
                <template v-else-if="t.dia_pago_propio_tipo === 'dia_nomina'">
                  Se paga en el Día de Nómina (26)
                </template>
                <template v-else>
                  Personalizado / Fecha de vencimiento
                </template>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Mantenimiento de Datos y Demo -->
    <div class="rounded-2xl border border-muted/20 bg-card p-6 shadow-xs space-y-4">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-muted/20 text-foreground flex items-center justify-center">
          <UIcon name="i-lucide-database" class="w-5 h-5" />
        </div>
        <div>
          <h3 class="font-bold text-foreground">Gestión de Datos y Base de Datos</h3>
          <p class="text-xs text-muted">Carga movimientos de demostración o limpia la base de datos para comenzar desde cero</p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          icon="i-lucide-sparkles"
          label="Cargar Datos Demo"
          :loading="seeding"
          @click="seedDemo"
        />

        <UButton
          size="sm"
          color="error"
          variant="subtle"
          icon="i-lucide-trash-2"
          label="Borrar todos los movimientos (Comenzar de cero)"
          @click="confirmResetModalOpen = true"
        />
      </div>
    </div>

    <!-- Modal para Agregar Tarjeta -->
    <UModal v-model:open="addCardModalOpen" title="Agregar Nueva Tarjeta">
      <template #body>
        <form class="space-y-4" @submit.prevent="submitAddCard">
          <div>
            <label class="block text-xs font-medium text-muted mb-1">Nombre Descriptivo de la Tarjeta</label>
            <UInput
              v-model="newCardForm.nombre"
              placeholder="Ej. Mastercard - 1706, BBVA Oro, Nu..."
              class="w-full"
              required
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-muted mb-1">Día de Corte (1-31)</label>
              <UInput
                v-model="newCardForm.dia_corte"
                type="number"
                min="1"
                max="31"
                class="w-full"
                required
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-muted mb-1">Día Vencimiento (opcional)</label>
              <UInput
                v-model="newCardForm.dia_vencimiento_pago"
                type="number"
                min="1"
                max="31"
                placeholder="Ej. 20"
                class="w-full"
              />
            </div>
          </div>

          <div class="p-3 rounded-xl border border-muted/20 bg-muted/5 space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="newCardForm.es_principal"
                type="checkbox"
                class="rounded border-muted/30 text-primary focus:ring-primary w-4 h-4"
                @change="newCardForm.es_principal ? newCardForm.dia_pago_propio_tipo = 'dia_siguiente_corte' : null"
              />
              <span class="text-xs font-bold text-foreground">Marcar como Tarjeta Principal (Uso Mensual)</span>
            </label>
            <p class="text-[11px] text-muted leading-relaxed">
              Define el ciclo mensual estándar. Se pagará al día siguiente de su fecha de corte con el presupuesto reservado.
            </p>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-1">Regla de Pago</label>
            <select
              v-model="newCardForm.dia_pago_propio_tipo"
              class="w-full rounded-md border border-muted/30 bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="dia_siguiente_corte">Pagar el día siguiente al corte (Día corte + 1)</option>
              <option value="dia_nomina">Pagar en el Día de Nómina (26)</option>
              <option value="dia_vencimiento">Pagar en fecha de vencimiento</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-2">Color Distintivo</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="opt in colorOptions"
                :key="opt.value"
                type="button"
                class="p-2 rounded-lg border text-xs flex items-center gap-2 transition-all"
                :class="[
                  newCardForm.color === opt.value
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30 font-bold'
                    : 'border-muted/30 hover:border-muted/60 bg-muted/5'
                ]"
                @click="newCardForm.color = opt.value"
              >
                <span class="w-3 h-3 rounded-full shrink-0" :class="opt.bgClass" />
                <span class="truncate">{{ opt.label }}</span>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-muted/20">
            <UButton color="neutral" variant="ghost" label="Cancelar" @click="addCardModalOpen = false" />
            <UButton type="submit" color="primary" icon="i-lucide-plus" label="Crear Tarjeta" :loading="addingCard" />
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal para Editar Tarjeta -->
    <UModal v-model:open="editCardModalOpen" title="Editar Tarjeta">
      <template #body>
        <form class="space-y-4" @submit.prevent="submitEditCard">
          <div>
            <label class="block text-xs font-medium text-muted mb-1">Nombre Descriptivo</label>
            <UInput
              v-model="editCardForm.nombre"
              placeholder="Ej. Mastercard - 1706"
              class="w-full"
              required
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-muted mb-1">Día de Corte (1-31)</label>
              <UInput
                v-model="editCardForm.dia_corte"
                type="number"
                min="1"
                max="31"
                class="w-full"
                required
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-muted mb-1">Día Vencimiento (opcional)</label>
              <UInput
                v-model="editCardForm.dia_vencimiento_pago"
                type="number"
                min="1"
                max="31"
                placeholder="Ej. 20"
                class="w-full"
              />
            </div>
          </div>

          <div class="p-3 rounded-xl border border-muted/20 bg-muted/5 space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="editCardForm.es_principal"
                type="checkbox"
                class="rounded border-muted/30 text-primary focus:ring-primary w-4 h-4"
                @change="editCardForm.es_principal ? editCardForm.dia_pago_propio_tipo = 'dia_siguiente_corte' : null"
              />
              <span class="text-xs font-bold text-foreground">Marcar como Tarjeta Principal (Uso Mensual)</span>
            </label>
            <p class="text-[11px] text-muted leading-relaxed">
              Define el ciclo mensual estándar. Se pagará al día siguiente de su fecha de corte con el presupuesto reservado.
            </p>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-1">Regla de Pago</label>
            <select
              v-model="editCardForm.dia_pago_propio_tipo"
              class="w-full rounded-md border border-muted/30 bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="dia_siguiente_corte">Pagar el día siguiente al corte (Día corte + 1)</option>
              <option value="dia_nomina">Pagar en el Día de Nómina (26)</option>
              <option value="dia_vencimiento">Pagar en fecha de vencimiento</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-muted mb-2">Color Distintivo</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="opt in colorOptions"
                :key="opt.value"
                type="button"
                class="p-2 rounded-lg border text-xs flex items-center gap-2 transition-all"
                :class="[
                  editCardForm.color === opt.value
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30 font-bold'
                    : 'border-muted/30 hover:border-muted/60 bg-muted/5'
                ]"
                @click="editCardForm.color = opt.value"
              >
                <span class="w-3 h-3 rounded-full shrink-0" :class="opt.bgClass" />
                <span class="truncate">{{ opt.label }}</span>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-muted/20">
            <UButton color="neutral" variant="ghost" label="Cancelar" @click="editCardModalOpen = false" />
            <UButton type="submit" color="primary" icon="i-lucide-save" label="Guardar Cambios" :loading="editingCard" />
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal de Confirmación y Advertencia de Eliminación de Tarjeta -->
    <UModal v-model:open="deleteModalOpen" title="Eliminar Tarjeta">
      <template #body>
        <div class="space-y-4">
          <div v-if="deleteErrorMessage" class="p-3.5 rounded-xl border border-error/30 bg-error/10 text-error space-y-1">
            <div class="flex items-center gap-2 font-bold text-sm">
              <UIcon name="i-lucide-alert-triangle" class="w-4 h-4" />
              <span>Acción no permitida</span>
            </div>
            <p class="text-xs leading-relaxed text-foreground">
              {{ deleteErrorMessage }}
            </p>
          </div>

          <p v-else class="text-sm text-muted">
            ¿Estás seguro de que deseas eliminar la tarjeta <strong>"{{ cardToDelete?.nombre }}"</strong>?
            Esta acción solo se completará si la tarjeta no posee gastos históricos ni reconciliaciones registradas.
          </p>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-muted/20">
            <UButton
              color="neutral"
              variant="ghost"
              :label="deleteErrorMessage ? 'Cerrar' : 'Cancelar'"
              @click="deleteModalOpen = false"
            />
            <UButton
              v-if="!deleteErrorMessage"
              color="error"
              icon="i-lucide-trash"
              label="Sí, eliminar tarjeta"
              :loading="deletingCard"
              @click="confirmDeleteCard"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Modal de Confirmación para Limpiar Datos -->
    <UModal v-model:open="confirmResetModalOpen" title="¿Borrar todos los movimientos?">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            Esta acción eliminará todos los <strong>gastos</strong>, <strong>ingresos de nómina</strong> y <strong>reconciliaciones</strong> registradas.
            Tus tarjetas y límites se mantendrán intactos.
          </p>
          <p class="text-xs text-muted">
            Úsalo si deseas limpiar los datos de demostración y empezar a registrar tu información personal real.
          </p>
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-muted/20">
            <UButton
              color="neutral"
              variant="ghost"
              label="Cancelar"
              @click="confirmResetModalOpen = false"
            />
            <UButton
              color="error"
              icon="i-lucide-trash-2"
              label="Sí, borrar todo"
              :loading="resetting"
              @click="resetData"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
