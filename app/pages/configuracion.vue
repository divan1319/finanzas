<script setup lang="ts">
const icons = useAppConfig()

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
      icon: icons.ui.icons.check
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
  { value: 'emerald', label: 'Esmeralda', bgClass: cardColorClass('emerald') },
  { value: 'indigo', label: 'Índigo', bgClass: cardColorClass('indigo') },
  { value: 'amber', label: 'Ámbar / Dorado', bgClass: cardColorClass('amber') },
  { value: 'violet', label: 'Violeta / Púrpura', bgClass: cardColorClass('violet') },
  { value: 'rose', label: 'Rosa / Carmín', bgClass: cardColorClass('rose') },
  { value: 'sky', label: 'Azul Cielo', bgClass: cardColorClass('sky') }
]

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
        dia_vencimiento_pago: newCardForm.value.dia_vencimiento_pago ? Number(newCardForm.value.dia_vencimiento_pago) : undefined,
        dia_pago_propio_tipo: newCardForm.value.dia_pago_propio_tipo,
        es_principal: newCardForm.value.es_principal,
        color: newCardForm.value.color
      }
    })

    toast.add({
      title: 'Tarjeta Agregada',
      description: `Se creó "${newCardForm.value.nombre}" exitosamente.`,
      color: 'success',
      icon: icons.ui.icons.success
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
      icon: icons.ui.icons.success
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
      icon: icons.ui.icons.star
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
      icon: icons.ui.icons.trash
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

// Notificaciones Push (gastos registrados automáticamente desde el correo)
const {
  soportado: pushSoportado,
  configurado: pushConfigurado,
  permiso: pushPermiso,
  suscrito: pushSuscrito,
  cargando: pushCargando,
  actualizarEstado: actualizarEstadoPush,
  activar: activarPush,
  desactivar: desactivarPush,
  enviarPrueba: enviarPruebaPush
} = usePushNotifications()

const pushVerificado = ref(false)
onMounted(async () => {
  try {
    await actualizarEstadoPush()
  } catch (err) {
    console.error('Error verificando notificaciones push', err)
  } finally {
    pushVerificado.value = true
  }
})

const onActivarPush = async () => {
  try {
    await activarPush()
    toast.add({
      title: 'Notificaciones activadas',
      description: 'Te avisaremos en este dispositivo cuando se registre un gasto desde tu correo.',
      color: 'success',
      icon: icons.appIcons.bellRing
    })
  } catch (err: any) {
    toast.add({
      title: 'No se pudieron activar',
      description: err?.data?.message || err?.message || 'Ocurrió un problema al activar las notificaciones.',
      color: 'error'
    })
  }
}

const onDesactivarPush = async () => {
  try {
    await desactivarPush()
    toast.add({
      title: 'Notificaciones desactivadas',
      description: 'Este dispositivo ya no recibirá avisos de nuevos gastos.',
      color: 'info',
      icon: icons.appIcons.bellOff
    })
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.message || 'No se pudieron desactivar las notificaciones.',
      color: 'error'
    })
  }
}

const probandoPush = ref(false)
const onProbarPush = async () => {
  probandoPush.value = true
  try {
    await enviarPruebaPush()
    toast.add({
      title: 'Notificación enviada',
      description: 'Deberías verla en unos segundos.',
      color: 'success',
      icon: icons.appIcons.send
    })
  } catch (err: any) {
    toast.add({
      title: 'No se pudo enviar la prueba',
      description: err?.data?.message || err?.message || 'Revisa la configuración del servidor.',
      color: 'error'
    })
  } finally {
    probandoPush.value = false
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
      icon: icons.ui.icons.success
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
      icon: icons.appIcons.sparkles
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
  <div class="space-y-4 min-w-0">
    <!-- Encabezado -->
    <div class="page-header">
      <div>
        <h1 class="text-xl sm:text-2xl font-semibold tracking-tight">
          Configuración del Sistema
        </h1>
        <p class="text-sm text-muted">
          Ajusta tu presupuesto, tarjetas y preferencias.
        </p>
      </div>
    </div>

    <UTabs
      :items="[{ label: 'Presupuesto y nómina', slot: 'budget' }, { label: 'Tarjetas', slot: 'cards' }, { label: 'Notificaciones', slot: 'notifications' }, { label: 'Datos', slot: 'data' }]"
      :unmount-on-hide="false"
      variant="link"
      :ui="{ list: 'overflow-x-auto overflow-y-hidden flex-nowrap', trigger: 'shrink-0', content: 'pt-4' }"
    >
      <template #budget>
        <!-- 1. Sección Presupuesto y Nómina -->
        <UCard :ui="{ body: 'p-4 sm:p-5 space-y-4' }">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <UIcon
                  :name="icons.appIcons.sliders"
                  class="w-5 h-5"
                />
              </div>
              <div>
                <h3 class="font-bold text-highlighted">
                  Reglas de nómina y presupuesto
                </h3>
                <p class="text-xs text-muted">
                  Afecta el cálculo de períodos y el límite de gasto mensual combinado
                </p>
              </div>
            </div>
          </div>

          <form
            class="space-y-4 pt-2"
            @submit.prevent="guardarReglasGlobales"
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField
                label="Día Objetivo de Nómina (Default 26)"
                required
              >
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
              </UFormField>

              <UFormField
                label="Presupuesto Base por Defecto ($ USD)"
                required
              >
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
                  Presupuesto predeterminado para nuevos períodos. Puedes ajustar el presupuesto de cada período específico desde Historial o Inicio.
                </span>
              </UFormField>
            </div>

            <div class="flex justify-end pt-2">
              <UButton
                type="submit"
                size="md"
                color="primary"
                :icon="icons.appIcons.save"
                label="Guardar Reglas de Presupuesto"
                :loading="savingGlobal"
                class="font-semibold shadow-xs"
              />
            </div>
          </form>
        </UCard>
      </template>
      <template #cards>
        <!-- 2. Sección Tarjetas de Crédito Dinámicas -->
        <UCard :ui="{ body: 'p-4 sm:p-5 space-y-4' }">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <UIcon
                  :name="icons.appIcons.creditCard"
                  class="w-5 h-5"
                />
              </div>
              <div>
                <h3 class="font-bold text-highlighted">
                  Tarjetas de Crédito
                </h3>
                <p class="text-xs text-muted">
                  Personaliza nombres, días de corte, reglas de pago o agrega nuevas tarjetas
                </p>
              </div>
            </div>

            <UButton
              size="sm"
              color="primary"
              :icon="icons.ui.icons.plus"
              label="Agregar Tarjeta"
              class="font-semibold shadow-xs shrink-0 self-start sm:self-auto"
              @click="openAddCardModal"
            />
          </div>

          <!-- Estado de carga o sin tarjetas -->
          <div
            v-if="pending"
            class="py-10 text-center text-muted text-xs"
          >
            <UIcon
              :name="icons.ui.icons.loading"
              class="w-6 h-6 animate-spin mx-auto mb-2 text-primary"
            />
            <span>Cargando tarjetas...</span>
          </div>

          <div
            v-else-if="!configData?.tarjetas || configData.tarjetas.length === 0"
            class="py-10 text-center text-muted space-y-3"
          >
            <UIcon
              :name="icons.appIcons.creditCard"
              class="w-10 h-10 mx-auto opacity-30"
            />
            <p class="text-xs">
              No tienes tarjetas registradas aún.
            </p>
            <UButton
              size="sm"
              color="primary"
              :icon="icons.ui.icons.plus"
              label="Agregar Tarjeta"
              @click="openAddCardModal"
            />
          </div>

          <!-- Grid de Tarjetas -->
          <div
            v-else
            class="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div
              v-for="t in configData.tarjetas"
              :key="t.id"
              class="rounded-md border p-4.5 space-y-3 relative transition-all"
              :class="[
                'border-default bg-default',
                t.es_principal ? 'ring-2 ring-primary/40' : ''
              ]"
            >
              <!-- Encabezado de la Tarjeta -->
              <div class="flex items-start justify-between gap-2">
                <div class="space-y-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span
                      class="w-3 h-3 rounded-full shrink-0"
                      :class="cardColorClass(t.color)"
                    />
                    <span class="font-bold text-base text-highlighted truncate">{{ t.nombre }}</span>
                  </div>
                  <div
                    v-if="t.es_principal"
                    class="pt-0.5"
                  >
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shadow-xs">
                      <UIcon
                        :name="icons.ui.icons.star"
                        class="w-3 h-3 fill-current"
                      />
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
                    :icon="icons.ui.icons.star"
                    label="Hacer Principal"
                    :loading="settingPrincipalId === t.id"
                    title="Establecer como tarjeta principal de uso mensual"
                    @click="marcarComoPrincipal(t)"
                  />
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :icon="icons.ui.icons.edit"
                    title="Editar tarjeta"
                    @click="openEditCardModal(t)"
                  />
                  <UButton
                    size="xs"
                    color="error"
                    variant="ghost"
                    :icon="icons.ui.icons.trash"
                    title="Eliminar tarjeta"
                    @click="openDeleteCardModal(t)"
                  />
                </div>
              </div>

              <!-- Atributos -->
              <div class="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-default">
                <div>
                  <span class="text-muted block text-[11px]">Día de Corte</span>
                  <strong class="text-highlighted">Día {{ t.dia_corte }} de cada mes</strong>
                </div>

                <div>
                  <span class="text-muted block text-[11px]">Vencimiento / Límite</span>
                  <strong class="text-highlighted">
                    {{ t.dia_vencimiento_pago ? `Día ${t.dia_vencimiento_pago}` : 'No definido' }}
                  </strong>
                </div>

                <div class="col-span-2 pt-1">
                  <span class="text-muted block text-[11px]">Regla de Pago</span>
                  <span class="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                    <UIcon
                      :name="icons.appIcons.calendarCheck"
                      class="w-3 h-3"
                    />
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
        </UCard>
      </template>
      <template #notifications>
        <!-- 3. Notificaciones Push -->
        <UCard :ui="{ body: 'p-4 sm:p-5 space-y-4' }">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <UIcon
                :name="icons.appIcons.bell"
                class="w-5 h-5"
              />
            </div>
            <div>
              <h3 class="font-bold text-highlighted">
                Notificaciones Push
              </h3>
              <p class="text-xs text-muted">
                Recibe un aviso en este dispositivo cuando se registre un gasto automáticamente desde tu correo
              </p>
            </div>
          </div>

          <div
            v-if="!pushVerificado"
            class="py-4 text-center text-muted text-xs"
          >
            <UIcon
              :name="icons.ui.icons.loading"
              class="w-5 h-5 animate-spin mx-auto mb-2 text-primary"
            />
            <span>Verificando compatibilidad...</span>
          </div>

          <div
            v-else-if="!pushSoportado"
            class="p-3.5 rounded-md border border-default bg-muted text-xs text-muted leading-relaxed"
          >
            Este navegador no soporta notificaciones push.
            En iPhone/iPad primero agrega la app a la pantalla de inicio (Compartir → Agregar a inicio) y ábrela desde ahí.
          </div>

          <div
            v-else-if="!pushConfigurado"
            class="p-3.5 rounded-md border border-warning/20 bg-warning/10 text-xs leading-relaxed"
          >
            <strong class="text-warning">Falta configuración en el servidor.</strong>
            Define las variables <code>VAPID_PUBLIC_KEY</code>, <code>VAPID_PRIVATE_KEY</code> y <code>VAPID_SUBJECT</code> y vuelve a desplegar.
          </div>

          <div
            v-else-if="pushPermiso === 'denied'"
            class="p-3.5 rounded-md border border-error/30 bg-error/10 text-xs leading-relaxed"
          >
            <strong class="text-error">Notificaciones bloqueadas.</strong>
            Permite las notificaciones para este sitio desde los ajustes del navegador o del sistema y recarga la página.
          </div>

          <div
            v-else
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2"
          >
            <span
              class="inline-flex items-center gap-1.5 text-xs font-medium"
              :class="pushSuscrito ? 'text-success' : 'text-muted'"
            >
              <UIcon
                :name="pushSuscrito ? icons.appIcons.bellRing : icons.appIcons.bellOff"
                class="w-4 h-4"
              />
              {{ pushSuscrito ? 'Activas en este dispositivo' : 'Desactivadas en este dispositivo' }}
            </span>

            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <template v-if="pushSuscrito">
                <UButton
                  size="sm"
                  color="neutral"
                  variant="outline"
                  :icon="icons.appIcons.send"
                  label="Enviar prueba"
                  :loading="probandoPush"
                  @click="onProbarPush"
                />
                <UButton
                  size="sm"
                  color="error"
                  variant="subtle"
                  :icon="icons.appIcons.bellOff"
                  label="Desactivar"
                  :loading="pushCargando"
                  @click="onDesactivarPush"
                />
              </template>
              <UButton
                v-else
                size="sm"
                color="primary"
                :icon="icons.appIcons.bellRing"
                label="Activar notificaciones"
                :loading="pushCargando"
                class="font-semibold shadow-xs"
                @click="onActivarPush"
              />
            </div>
          </div>
        </UCard>
      </template>
      <template #data>
        <!-- 4. Mantenimiento de Datos y Demo -->
        <UCard :ui="{ body: 'p-4 sm:p-5 space-y-4' }">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-muted text-highlighted flex items-center justify-center">
              <UIcon
                :name="icons.appIcons.database"
                class="w-5 h-5"
              />
            </div>
            <div>
              <h3 class="font-bold text-highlighted">
                Gestión de datos
              </h3>
              <p class="text-xs text-muted">
                Carga movimientos de demostración o limpia la base de datos para comenzar desde cero
              </p>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <UButton
              size="sm"
              color="neutral"
              variant="outline"
              :icon="icons.appIcons.sparkles"
              label="Cargar Datos Demo"
              :loading="seeding"
              @click="seedDemo"
            />

            <UButton
              size="sm"
              color="error"
              variant="subtle"
              :icon="icons.ui.icons.trash"
              label="Borrar todos los movimientos (Comenzar de cero)"
              @click="confirmResetModalOpen = true"
            />
          </div>
        </UCard>
      </template>
    </UTabs>

    <!-- Modal para Agregar Tarjeta -->
    <UModal
      v-model:open="addCardModalOpen"
      title="Agregar Nueva Tarjeta"
    >
      <template #body>
        <form
          class="min-w-0 space-y-4"
          @submit.prevent="submitAddCard"
        >
          <UFormField
            label="Nombre Descriptivo de la Tarjeta"
            required
          >
            <UInput
              v-model="newCardForm.nombre"
              placeholder="Ej. Mastercard - 1706, BBVA Oro, Nu..."
              class="w-full"
              required
            />
          </UFormField>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField
              label="Día de Corte (1-31)"
              required
            >
              <UInput
                v-model="newCardForm.dia_corte"
                type="number"
                min="1"
                max="31"
                class="w-full"
                required
              />
            </UFormField>

            <UFormField label="Día Vencimiento (opcional)">
              <UInput
                v-model="newCardForm.dia_vencimiento_pago"
                type="number"
                min="1"
                max="31"
                placeholder="Ej. 20"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="p-3 rounded-md border border-default bg-muted space-y-2">
            <div class="flex items-center gap-2">
              <USwitch
                v-model="newCardForm.es_principal"
                aria-label="Marcar como tarjeta principal"
                @update:model-value="value => { if (value) newCardForm.dia_pago_propio_tipo = 'dia_siguiente_corte' }"
              />
              <span class="text-xs font-bold text-highlighted">Marcar como Tarjeta Principal (Uso Mensual)</span>
            </div>
            <p class="text-[11px] text-muted leading-relaxed">
              Define el ciclo mensual estándar. Se pagará al día siguiente de su fecha de corte con el presupuesto reservado.
            </p>
          </div>

          <UFormField label="Regla de Pago">
            <USelect
              v-model="newCardForm.dia_pago_propio_tipo"
              :items="[{ label: 'Día siguiente al corte', value: 'dia_siguiente_corte' }, { label: 'Día de nómina', value: 'dia_nomina' }, { label: 'Fecha de vencimiento', value: 'dia_vencimiento' }]"
              class="w-full"
            />
          </UFormField>

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
                  newCardForm.color === opt.value
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30 font-bold'
                    : 'border-default hover:border-default bg-muted'
                ]"
                :aria-pressed="newCardForm.color === opt.value"
                @click="newCardForm.color = opt.value"
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
              @click="addCardModalOpen = false"
            />
            <UButton
              type="submit"
              color="primary"
              :icon="icons.ui.icons.plus"
              label="Crear Tarjeta"
              :loading="addingCard"
            />
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal para Editar Tarjeta -->
    <UModal
      v-model:open="editCardModalOpen"
      title="Editar Tarjeta"
    >
      <template #body>
        <form
          class="space-y-4"
          @submit.prevent="submitEditCard"
        >
          <UFormField
            label="Nombre Descriptivo"
            required
          >
            <UInput
              v-model="editCardForm.nombre"
              placeholder="Ej. Mastercard - 1706"
              class="w-full"
              required
            />
          </UFormField>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField
              label="Día de Corte (1-31)"
              required
            >
              <UInput
                v-model="editCardForm.dia_corte"
                type="number"
                min="1"
                max="31"
                class="w-full"
                required
              />
            </UFormField>

            <UFormField label="Día Vencimiento (opcional)">
              <UInput
                v-model="editCardForm.dia_vencimiento_pago"
                type="number"
                min="1"
                max="31"
                placeholder="Ej. 20"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="p-3 rounded-md border border-default bg-muted space-y-2">
            <div class="flex items-center gap-2">
              <USwitch
                v-model="editCardForm.es_principal"
                aria-label="Marcar como tarjeta principal"
                @update:model-value="value => { if (value) editCardForm.dia_pago_propio_tipo = 'dia_siguiente_corte' }"
              />
              <span class="text-xs font-bold text-highlighted">Marcar como Tarjeta Principal (Uso Mensual)</span>
            </div>
            <p class="text-[11px] text-muted leading-relaxed">
              Define el ciclo mensual estándar. Se pagará al día siguiente de su fecha de corte con el presupuesto reservado.
            </p>
          </div>

          <UFormField label="Regla de Pago">
            <USelect
              v-model="editCardForm.dia_pago_propio_tipo"
              :items="[{ label: 'Día siguiente al corte', value: 'dia_siguiente_corte' }, { label: 'Día de nómina', value: 'dia_nomina' }, { label: 'Fecha de vencimiento', value: 'dia_vencimiento' }]"
              class="w-full"
            />
          </UFormField>

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
                  editCardForm.color === opt.value
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30 font-bold'
                    : 'border-default hover:border-default bg-muted'
                ]"
                :aria-pressed="editCardForm.color === opt.value"
                @click="editCardForm.color = opt.value"
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
              @click="editCardModalOpen = false"
            />
            <UButton
              type="submit"
              color="primary"
              :icon="icons.appIcons.save"
              label="Guardar Cambios"
              :loading="editingCard"
            />
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal de Confirmación y Advertencia de Eliminación de Tarjeta -->
    <UModal
      v-model:open="deleteModalOpen"
      title="Eliminar Tarjeta"
    >
      <template #body>
        <div class="space-y-4">
          <div
            v-if="deleteErrorMessage"
            class="p-3.5 rounded-md border border-error/30 bg-error/10 text-error space-y-1"
          >
            <div class="flex items-center gap-2 font-bold text-sm">
              <UIcon
                :name="icons.ui.icons.warning"
                class="w-4 h-4"
              />
              <span>Acción no permitida</span>
            </div>
            <p class="text-xs leading-relaxed text-highlighted">
              {{ deleteErrorMessage }}
            </p>
          </div>

          <p
            v-else
            class="text-sm text-muted"
          >
            ¿Estás seguro de que deseas eliminar la tarjeta <strong>"{{ cardToDelete?.nombre }}"</strong>?
            Esta acción solo se completará si la tarjeta no posee gastos históricos ni reconciliaciones registradas.
          </p>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-default">
            <UButton
              color="neutral"
              variant="ghost"
              :label="deleteErrorMessage ? 'Cerrar' : 'Cancelar'"
              @click="deleteModalOpen = false"
            />
            <UButton
              v-if="!deleteErrorMessage"
              color="error"
              :icon="icons.ui.icons.trash"
              label="Sí, eliminar tarjeta"
              :loading="deletingCard"
              @click="confirmDeleteCard"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Modal de Confirmación para Limpiar Datos -->
    <UModal
      v-model:open="confirmResetModalOpen"
      title="¿Borrar todos los movimientos?"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            Esta acción eliminará todos los <strong>gastos</strong>, <strong>ingresos de nómina</strong> y <strong>reconciliaciones</strong> registradas.
            Tus tarjetas y límites se mantendrán intactos.
          </p>
          <p class="text-xs text-muted">
            Úsalo si deseas limpiar los datos de demostración y empezar a registrar tu información personal real.
          </p>
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-default">
            <UButton
              color="neutral"
              variant="ghost"
              label="Cancelar"
              @click="confirmResetModalOpen = false"
            />
            <UButton
              color="error"
              :icon="icons.ui.icons.trash"
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
