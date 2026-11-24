<script setup lang="ts">
import type { CicloPendientePago } from '#shared/types/cuenta'
import { fechaElSalvador } from '#shared/utils/fechaElSalvador'

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

const { verifyCyclesModalOpen, closeVerifyCyclesModal, formatCurrency, formatDate, triggerRefresh } = useFinanzas()
const toast = useToast()

const loading = ref(false)
const ciclos = ref<CicloPendientePago[]>([])
const montos = ref<Record<string, string>>({})
const cuentasCargo = ref<Record<string, number | undefined>>({})
const procesandoKey = ref<string | null>(null)

const cuentaPrincipalId = computed(() => {
  return props.cuentas?.find(c => c.es_principal)?.id ?? props.cuentas?.[0]?.id
})

const cuentasSelectItems = computed(() => {
  return (props.cuentas || []).map(c => ({
    label: c.es_principal ? `${c.nombre} (Principal)` : c.nombre,
    value: c.id
  }))
})

const cycleKey = (c: CicloPendientePago) => `${c.tarjeta.id}:${c.ciclo_inicio}:${c.ciclo_fin}`

const cargarCiclosPendientes = async () => {
  loading.value = true
  try {
    const res = await $fetch<{ ciclos: CicloPendientePago[] }>('/api/cuentas/ciclos-pendientes')
    ciclos.value = res.ciclos || []
    const nextMontos: Record<string, string> = {}
    const nextCuentas: Record<string, number | undefined> = {}
    for (const c of ciclos.value) {
      const k = cycleKey(c)
      nextMontos[k] = String(c.monto_sugerido)
      nextCuentas[k] = cuentaPrincipalId.value
    }
    montos.value = nextMontos
    cuentasCargo.value = nextCuentas
  } catch (err: unknown) {
    const errObj = err as { message?: string, data?: { statusMessage?: string } }
    toast.add({
      title: 'No se pudieron verificar los cortes',
      description: errObj?.data?.statusMessage || errObj?.message || 'Verifica tu conexión e intenta nuevamente.',
      color: 'error',
      icon: icons.ui.icons.error
    })
  } finally {
    loading.value = false
  }
}

watch(verifyCyclesModalOpen, (open) => {
  if (open) {
    cargarCiclosPendientes()
  }
})

const liquidar = async (ciclo: CicloPendientePago, accion: 'pagar' | 'omitir') => {
  const k = cycleKey(ciclo)
  if (procesandoKey.value) return

  const montoNum = Number(montos.value[k])
  const cuentaId = cuentasCargo.value[k] || cuentaPrincipalId.value

  if (accion === 'pagar') {
    if (!cuentaId) {
      toast.add({
        title: 'Cuenta requerida',
        description: 'Selecciona la cuenta desde donde se pagará la tarjeta.',
        color: 'warning',
        icon: icons.ui.icons.warning
      })
      return
    }
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      toast.add({
        title: 'Monto inválido',
        description: 'Ingresa un monto válido mayor a 0.',
        color: 'warning',
        icon: icons.ui.icons.warning
      })
      return
    }
  }

  procesandoKey.value = k
  try {
    await $fetch('/api/cuentas/liquidar-ciclo', {
      method: 'POST',
      body: {
        tarjeta_id: ciclo.tarjeta.id,
        ciclo_inicio: ciclo.ciclo_inicio,
        ciclo_fin: ciclo.ciclo_fin,
        accion,
        cuenta_id: accion === 'pagar' ? cuentaId : undefined,
        monto: accion === 'pagar' ? montoNum : undefined,
        fecha_pago: fechaElSalvador()
      }
    })

    ciclos.value = ciclos.value.filter(item => cycleKey(item) !== k)
    toast.add({
      title: accion === 'pagar' ? 'Pago descontado de la cuenta' : 'Ciclo marcado como omitido',
      description: accion === 'pagar'
        ? `Se registró la salida de ${formatCurrency(montoNum)} para ${ciclo.tarjeta.nombre}.`
        : `El ciclo de ${ciclo.tarjeta.nombre} no afectará el saldo actual.`,
      color: accion === 'pagar' ? 'success' : 'info',
      icon: icons.ui.icons.success
    })

    await triggerRefresh(['dashboard', 'cuentas', 'cuentas-movimientos'])
  } catch (err: unknown) {
    const errObj = err as { message?: string, statusMessage?: string, data?: { statusMessage?: string } }
    toast.add({
      title: 'Error al procesar ciclo',
      description: errObj?.data?.statusMessage || errObj?.statusMessage || errObj?.message || 'No se pudo completar la operación.',
      color: 'error',
      icon: icons.ui.icons.error
    })
  } finally {
    procesandoKey.value = null
  }
}
</script>

<template>
  <UModal
    v-model:open="verifyCyclesModalOpen"
    title="Verificar Cortes de Tarjetas"
    description="Revisa los ciclos de facturación ya cerrados y descuenta su pago de tu cuenta."
  >
    <template #body>
      <div class="space-y-4">
        <div
          v-if="loading"
          class="py-10 flex flex-col items-center justify-center gap-2 text-muted text-sm"
        >
          <UIcon
            :name="icons.ui.icons.loading"
            class="size-6 text-primary animate-spin"
          />
          <span>Revisando cortes cerrados...</span>
        </div>

        <div
          v-else-if="ciclos.length === 0"
          class="py-8 text-center space-y-3"
        >
          <UIcon
            :name="icons.appIcons.calendarCheck"
            class="size-10 mx-auto text-success opacity-80"
          />
          <p class="text-sm font-medium text-highlighted">
            No hay cortes cerrados pendientes por registrar.
          </p>
          <p class="text-xs text-muted">
            Todas las tarjetas con gastos en períodos anteriores ya están liquidadas u omitidas.
          </p>
        </div>

        <div
          v-else
          class="space-y-3 max-h-[60vh] overflow-y-auto pr-1"
        >
          <div
            v-for="ciclo in ciclos"
            :key="cycleKey(ciclo)"
            class="rounded-lg border border-default bg-muted/40 p-3.5 space-y-3"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="space-y-1 min-w-0">
                <CardIdentifier
                  :name="ciclo.tarjeta.nombre"
                  :color="ciclo.tarjeta.color"
                  class="text-sm font-semibold"
                />
                <p class="text-xs text-muted">
                  Ciclo: {{ formatDate(ciclo.ciclo_inicio) }} al {{ formatDate(ciclo.ciclo_fin) }}
                </p>
                <p class="text-[11px] text-muted">
                  Pago estimado: {{ formatDate(ciclo.fecha_pago_estimada) }}
                </p>
              </div>

              <div class="flex flex-col items-end gap-1">
                <UBadge
                  :color="ciclo.reconciliado ? 'success' : 'neutral'"
                  variant="subtle"
                  size="sm"
                >
                  {{ ciclo.reconciliado ? 'Reconciliado (banco)' : `App · ${ciclo.cantidad_gastos} gastos` }}
                </UBadge>
                <UBadge
                  v-if="ciclo.pago_vencido_o_hoy"
                  color="warning"
                  variant="subtle"
                  size="sm"
                >
                  Fecha de pago alcanzada
                </UBadge>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UFormField label="Cuenta de cargo">
                <USelect
                  v-model="cuentasCargo[cycleKey(ciclo)]"
                  :items="cuentasSelectItems"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Monto a descontar ($ USD)"
                :hint="ciclo.reconciliado && ciclo.total_banco !== ciclo.total_app ? `App: ${formatCurrency(ciclo.total_app)}` : undefined"
              >
                <UInput
                  v-model="montos[cycleKey(ciclo)]"
                  type="number"
                  step="0.01"
                  min="0.01"
                  :icon="icons.appIcons.dollarSign"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-default">
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                label="Ya pagado antes / Omitir"
                :loading="procesandoKey === cycleKey(ciclo)"
                @click="liquidar(ciclo, 'omitir')"
              />
              <UButton
                color="primary"
                size="xs"
                :icon="icons.ui.icons.check"
                label="Registrar salida"
                :loading="procesandoKey === cycleKey(ciclo)"
                @click="liquidar(ciclo, 'pagar')"
              />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 pt-3 border-t border-default">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            :icon="icons.ui.icons.reload"
            label="Volver a verificar"
            :loading="loading"
            @click="cargarCiclosPendientes"
          />
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            label="Cerrar"
            @click="closeVerifyCyclesModal"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
