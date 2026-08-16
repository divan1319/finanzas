<script setup lang="ts">
const { refreshKey, triggerRefresh } = useFinanzas()
const toast = useToast()

const { data: configData, pending, refresh } = await useFetch('/api/configuracion', {
  watch: [refreshKey]
})

const form = ref({
  dia_objetivo_nomina: 26,
  limite_gasto_periodo: 15000,
  tarjetaA: {
    id: 1,
    nombre: 'Tarjeta A (Corte 5 / Paga 6)',
    dia_corte: 5,
    dia_vencimiento_pago: 30
  },
  tarjetaB: {
    id: 2,
    nombre: 'Tarjeta B (Corte 9 / Paga Nómina)',
    dia_corte: 9,
    dia_vencimiento_pago: 3
  }
})

watch(configData, (val) => {
  if (val) {
    form.value.dia_objetivo_nomina = val.configuracion.dia_objetivo_nomina
    form.value.limite_gasto_periodo = val.configuracion.limite_gasto_periodo

    const tA = val.tarjetas.find(t => t.codigo === 'A')
    if (tA) {
      form.value.tarjetaA = {
        id: tA.id,
        nombre: tA.nombre,
        dia_corte: tA.dia_corte,
        dia_vencimiento_pago: tA.dia_vencimiento_pago || 30
      }
    }

    const tB = val.tarjetas.find(t => t.codigo === 'B')
    if (tB) {
      form.value.tarjetaB = {
        id: tB.id,
        nombre: tB.nombre,
        dia_corte: tB.dia_corte,
        dia_vencimiento_pago: tB.dia_vencimiento_pago || 3
      }
    }
  }
}, { immediate: true })

const saving = ref(false)
const guardarConfiguracion = async () => {
  saving.value = true
  try {
    await $fetch('/api/configuracion', {
      method: 'PUT',
      body: {
        dia_objetivo_nomina: Number(form.value.dia_objetivo_nomina),
        limite_gasto_periodo: Number(form.value.limite_gasto_periodo),
        tarjetas: [
          {
            id: form.value.tarjetaA.id,
            nombre: form.value.tarjetaA.nombre,
            dia_corte: Number(form.value.tarjetaA.dia_corte),
            dia_vencimiento_pago: Number(form.value.tarjetaA.dia_vencimiento_pago)
          },
          {
            id: form.value.tarjetaB.id,
            nombre: form.value.tarjetaB.nombre,
            dia_corte: Number(form.value.tarjetaB.dia_corte),
            dia_vencimiento_pago: Number(form.value.tarjetaB.dia_vencimiento_pago)
          }
        ]
      }
    })

    toast.add({
      title: 'Configuración guardada',
      description: 'Los parámetros han sido actualizados.',
      color: 'success',
      icon: 'i-lucide-check'
    })

    triggerRefresh()
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
      <p class="text-sm text-muted">Ajusta los parámetros de nómina, presupuesto mensual y tarjetas de crédito</p>
    </div>

    <form class="space-y-6" @submit.prevent="guardarConfiguracion">
      <!-- Sección Presupuesto y Nómina -->
      <div class="rounded-2xl border border-muted/20 bg-card p-6 shadow-xs space-y-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <UIcon name="i-lucide-sliders" class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-bold text-foreground">Reglas de Nómina y Presupuesto</h3>
            <p class="text-xs text-muted">Afecta el cálculo de períodos y el límite de gasto combinado</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label class="block text-xs font-medium text-muted mb-1">Día Objetivo de Nómina (Default 26)</label>
            <UInput
              v-model="form.dia_objetivo_nomina"
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
              v-model="form.limite_gasto_periodo"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              class="w-full"
              required
            />
            <span class="text-[11px] text-muted mt-1 block">
              Límite combinado (suma de Tarjeta A + Tarjeta B) por período de nómina.
            </span>
          </div>
        </div>
      </div>

      <!-- Sección Tarjetas -->
      <div class="rounded-2xl border border-muted/20 bg-card p-6 shadow-xs space-y-6">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <UIcon name="i-lucide-credit-card" class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-bold text-foreground">Parámetros de Tarjetas de Crédito</h3>
            <p class="text-xs text-muted">Días de corte y reglas fijas de ciclo</p>
          </div>
        </div>

        <!-- Tarjeta A -->
        <div class="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-sm text-emerald-400">Tarjeta A</span>
            <UBadge color="success" variant="subtle" size="xs">Se paga el día 6 (día sig. al corte)</UBadge>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="sm:col-span-2">
              <label class="block text-xs text-muted mb-1">Nombre Descriptivo</label>
              <UInput v-model="form.tarjetaA.nombre" class="w-full" />
            </div>
            <div>
              <label class="block text-xs text-muted mb-1">Día de Corte</label>
              <UInput v-model="form.tarjetaA.dia_corte" type="number" min="1" max="31" class="w-full" />
            </div>
          </div>
        </div>

        <!-- Tarjeta B -->
        <div class="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-sm text-indigo-400">Tarjeta B</span>
            <UBadge color="info" variant="subtle" size="xs">Se paga en el Día de Nómina</UBadge>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="sm:col-span-2">
              <label class="block text-xs text-muted mb-1">Nombre Descriptivo</label>
              <UInput v-model="form.tarjetaB.nombre" class="w-full" />
            </div>
            <div>
              <label class="block text-xs text-muted mb-1">Día de Corte</label>
              <UInput v-model="form.tarjetaB.dia_corte" type="number" min="1" max="31" class="w-full" />
            </div>
          </div>
        </div>
      </div>

      <!-- Botón de Guardar -->
      <div class="flex justify-end">
        <UButton
          type="submit"
          size="lg"
          color="primary"
          icon="i-lucide-save"
          label="Guardar Configuración"
          :loading="saving"
          class="font-semibold shadow-sm"
        />
      </div>
    </form>

    <!-- Mantenimiento de Datos y Demo -->
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

    <!-- Modal de Confirmación para Limpiar Datos -->
    <UModal v-model:open="confirmResetModalOpen" title="¿Borrar todos los movimientos?">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            Esta acción eliminará todos los <strong>gastos</strong>, <strong>ingresos de nómina</strong> y <strong>reconciliaciones</strong> registradas.
            Tu configuración y parámetros de tarjetas se mantendrán intactos.
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
