<script setup lang="ts">
import { formatDateISO } from '#shared/utils/cicloFinanciero'

const { refreshKey, formatCurrency, formatDate } = useFinanzas()
const toast = useToast()

const tarjetaCodigo = ref<'A' | 'B'>('A')
const fechaReferencia = ref(formatDateISO(new Date()))
const totalBancoInput = ref<string | number>('')
const notasInput = ref('')
const saving = ref(false)

const { data: reconciliacionData, pending, refresh } = await useFetch('/api/reconciliaciones', {
  query: computed(() => ({
    tarjeta_codigo: tarjetaCodigo.value,
    fecha: fechaReferencia.value
  })),
  watch: [refreshKey]
})

const ciclo = computed(() => reconciliacionData.value?.cicloCalculado)
const totalApp = computed(() => ciclo.value?.totalApp || 0)

const diferenciaEnVivo = computed(() => {
  const banco = Number(totalBancoInput.value)
  if (isNaN(banco) || totalBancoInput.value === '') return null
  return Number((banco - totalApp.value).toFixed(2))
})

const guardarReconciliacion = async () => {
  if (!ciclo.value) return

  const totalBanco = Number(totalBancoInput.value)
  if (isNaN(totalBanco) || totalBanco < 0) {
    toast.add({
      title: 'Monto bancario inválido',
      description: 'Ingresa el total que reporta el estado de cuenta.',
      color: 'warning'
    })
    return
  }

  saving.value = true
  try {
    await $fetch('/api/reconciliaciones', {
      method: 'POST',
      body: {
        tarjeta_id: ciclo.value.tarjeta.id,
        ciclo_inicio: ciclo.value.inicio,
        ciclo_fin: ciclo.value.fin,
        total_banco: totalBanco,
        total_app_calculado: totalApp.value,
        notas: notasInput.value
      }
    })

    toast.add({
      title: 'Reconciliación Guardada',
      description: `Ciclo reconciliado con éxito.`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })

    totalBancoInput.value = ''
    notasInput.value = ''
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

const deletingId = ref<number | null>(null)
const deleteReconciliacion = async (id: number) => {
  if (!confirm('¿Deseas eliminar este registro de reconciliación?')) return
  deletingId.value = id
  try {
    await $fetch(`/api/reconciliaciones/${id}`, { method: 'DELETE' })
    toast.add({
      title: 'Registro eliminado',
      color: 'success',
      icon: 'i-lucide-trash'
    })
    refresh()
  } catch (err: any) {
    toast.add({
      title: 'Error al eliminar',
      description: err?.message,
      color: 'error'
    })
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado -->
    <div>
      <div class="flex items-center gap-2 mb-1">
        <UBadge color="primary" variant="subtle" size="sm">Fase 2</UBadge>
        <span class="text-xs text-muted">Auditoría Bancaria</span>
      </div>
      <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Reconciliación de Ciclo Bancario</h1>
      <p class="text-sm text-muted">Compara los gastos registrados en la app contra el total que reporta el estado de cuenta de tu banco</p>
    </div>

    <!-- Selector de Tarjeta y Ciclo -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Columna Izquierda: Panel de Auditoría -->
      <div class="lg:col-span-2 space-y-6">
        <div class="rounded-2xl border border-muted/20 bg-card p-6 shadow-xs space-y-5">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-foreground">1. Seleccionar Tarjeta y Fecha del Ciclo</h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Selector de Tarjeta -->
            <div>
              <label class="block text-xs font-medium text-muted mb-1.5">Tarjeta a Auditar</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="p-3 rounded-xl border text-center transition-all"
                  :class="[
                    tarjetaCodigo === 'A'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold ring-2 ring-emerald-500/20'
                      : 'border-muted/30 hover:border-muted/60 text-muted'
                  ]"
                  @click="tarjetaCodigo = 'A'"
                >
                  <span class="block text-sm">Tarjeta A</span>
                  <span class="text-[10px] text-muted block">Corte 5 / Ciclo 6–5</span>
                </button>

                <button
                  type="button"
                  class="p-3 rounded-xl border text-center transition-all"
                  :class="[
                    tarjetaCodigo === 'B'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold ring-2 ring-indigo-500/20'
                      : 'border-muted/30 hover:border-muted/60 text-muted'
                  ]"
                  @click="tarjetaCodigo = 'B'"
                >
                  <span class="block text-sm">Tarjeta B</span>
                  <span class="text-[10px] text-muted block">Corte 9 / Ciclo 10–9</span>
                </button>
              </div>
            </div>

            <!-- Selector de Fecha de Referencia -->
            <div>
              <label class="block text-xs font-medium text-muted mb-1.5">Fecha dentro del Ciclo</label>
              <UInput
                v-model="fechaReferencia"
                type="date"
                class="w-full"
                icon="i-lucide-calendar"
              />
              <span class="text-[11px] text-muted mt-1 block">
                Selecciona cualquier fecha dentro del ciclo a auditar.
              </span>
            </div>
          </div>

          <!-- Información del Ciclo Calculado -->
          <div v-if="ciclo" class="rounded-xl border border-muted/20 bg-muted/5 p-4 space-y-3">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span class="text-xs text-muted font-medium block">Rango de Facturación</span>
                <strong class="text-foreground text-sm">{{ ciclo.etiqueta }}</strong>
              </div>
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ ciclo.cantidadGastos }} movimientos en app
              </UBadge>
            </div>

            <div class="pt-2 border-t border-muted/15 flex items-baseline justify-between">
              <span class="text-xs text-muted">Total Calculado en App:</span>
              <span class="text-xl font-extrabold text-foreground">{{ formatCurrency(ciclo.totalApp) }}</span>
            </div>
          </div>

          <!-- Formulario de Comparativa con Banco -->
          <div class="space-y-4 pt-2 border-t border-muted/20">
            <h3 class="font-bold text-foreground">2. Ingresar Total Reportado por el Banco</h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted mb-1">Total Estado de Cuenta ($ USD)</label>
                <UInput
                  v-model="totalBancoInput"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  icon="i-lucide-landmark"
                  class="w-full"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-muted mb-1">Notas / Observaciones (opcional)</label>
                <UInput
                  v-model="notasInput"
                  placeholder="Ej. Coincide exacto, pendiente cashback..."
                  class="w-full"
                />
              </div>
            </div>

            <!-- Resultado de la Diferencia en Tiempo Real -->
            <div
              v-if="diferenciaEnVivo !== null"
              class="p-4 rounded-xl border transition-all space-y-2"
              :class="[
                diferenciaEnVivo === 0
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : diferenciaEnVivo > 0
                    ? 'border-amber-500/30 bg-amber-500/10'
                    : 'border-blue-500/30 bg-blue-500/10'
              ]"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider">
                  {{ diferenciaEnVivo === 0 ? '✓ Reconciliación Perfecta' : 'Diferencia Detectada' }}
                </span>
                <span
                  class="text-lg font-black"
                  :class="[
                    diferenciaEnVivo === 0
                      ? 'text-emerald-400'
                      : diferenciaEnVivo > 0
                        ? 'text-amber-400'
                        : 'text-blue-400'
                  ]"
                >
                  {{ formatCurrency(diferenciaEnVivo) }}
                </span>
              </div>

              <p class="text-xs text-muted leading-relaxed">
                <template v-if="diferenciaEnVivo === 0">
                  ¡Excelente! Los movimientos registrados en la app cuadran exactamente al centavo con el banco.
                </template>
                <template v-else-if="diferenciaEnVivo > 0">
                  El banco reporta <strong>{{ formatCurrency(diferenciaEnVivo) }}</strong> más que la app. Revisa si olvidaste registrar algún gasto o si se cobraron comisiones/intereses.
                </template>
                <template v-else>
                  La app tiene registrados <strong>{{ formatCurrency(Math.abs(diferenciaEnVivo)) }}</strong> más que el estado del banco. Es posible que alguna compra esté en tránsito.
                </template>
              </p>
            </div>

            <div class="flex justify-end pt-2">
              <UButton
                color="primary"
                icon="i-lucide-save"
                label="Guardar Reconciliación"
                :loading="saving"
                :disabled="diferenciaEnVivo === null"
                @click="guardarReconciliacion"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Columna Derecha: Movimientos del Ciclo -->
      <div class="space-y-4">
        <div class="rounded-2xl border border-muted/20 bg-card p-5 shadow-xs space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-sm text-foreground">Gastos en este Ciclo</h4>
            <span class="text-xs text-muted">{{ ciclo?.gastos?.length || 0 }} items</span>
          </div>

          <div v-if="!ciclo?.gastos || ciclo.gastos.length === 0" class="py-8 text-center text-xs text-muted">
            No hay gastos registrados para este ciclo de facturación.
          </div>

          <div v-else class="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            <div
              v-for="g in ciclo.gastos"
              :key="g.id"
              class="p-2.5 rounded-lg border border-muted/15 bg-muted/5 flex items-center justify-between text-xs"
            >
              <div>
                <span class="font-medium text-foreground block truncate max-w-[150px]">{{ g.descripcion }}</span>
                <span class="text-[10px] text-muted">{{ formatDate(g.fecha) }} • {{ g.categoria }}</span>
              </div>
              <span class="font-bold text-foreground">{{ formatCurrency(g.monto) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Historial de Reconciliaciones Guardadas -->
    <div class="rounded-2xl border border-muted/20 bg-card overflow-hidden shadow-xs space-y-3">
      <div class="p-5 border-b border-muted/20 flex items-center justify-between">
        <h3 class="font-bold text-foreground">Auditorías Guardadas</h3>
        <span class="text-xs text-muted">{{ reconciliacionData?.historial?.length || 0 }} registros</span>
      </div>

      <div v-if="!reconciliacionData?.historial || reconciliacionData.historial.length === 0" class="py-12 text-center text-muted text-xs">
        Aún no has guardado reconciliaciones bancarias.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="text-xs text-muted uppercase bg-muted/5 border-b border-muted/20">
            <tr>
              <th class="py-3 px-4 font-semibold">Tarjeta</th>
              <th class="py-3 px-4 font-semibold">Ciclo Facturación</th>
              <th class="py-3 px-4 font-semibold text-right">Total Banco</th>
              <th class="py-3 px-4 font-semibold text-right">Total App</th>
              <th class="py-3 px-4 font-semibold text-right">Diferencia</th>
              <th class="py-3 px-4 font-semibold">Notas</th>
              <th class="py-3 px-4 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-muted/15 text-xs">
            <tr
              v-for="rec in reconciliacionData.historial"
              :key="rec.id"
              class="hover:bg-muted/5 transition-colors"
            >
              <td class="py-3.5 px-4 font-bold whitespace-nowrap">
                <UBadge
                  :color="rec.tarjeta_codigo === 'A' ? 'success' : 'info'"
                  variant="subtle"
                  size="sm"
                >
                  Tarjeta {{ rec.tarjeta_codigo }}
                </UBadge>
              </td>
              <td class="py-3.5 px-4 font-medium text-foreground whitespace-nowrap">
                {{ formatDate(rec.ciclo_inicio) }} al {{ formatDate(rec.ciclo_fin) }}
              </td>
              <td class="py-3.5 px-4 text-right font-bold text-foreground whitespace-nowrap">
                {{ formatCurrency(rec.total_banco) }}
              </td>
              <td class="py-3.5 px-4 text-right font-bold text-muted whitespace-nowrap">
                {{ formatCurrency(rec.total_app_calculado) }}
              </td>
              <td class="py-3.5 px-4 text-right font-extrabold whitespace-nowrap">
                <span
                  class="px-2 py-0.5 rounded"
                  :class="rec.diferencia === 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'"
                >
                  {{ formatCurrency(rec.diferencia) }}
                </span>
              </td>
              <td class="py-3.5 px-4 text-muted max-w-[200px] truncate">
                {{ rec.notas || '—' }}
              </td>
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash"
                  :loading="deletingId === rec.id"
                  @click="deleteReconciliacion(rec.id)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
