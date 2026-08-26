<script setup lang="ts">
const { budgetModalOpen, budgetModalData, closeBudgetModal, formatCurrency, triggerRefresh } = useFinanzas()
const toast = useToast()

const limiteInput = ref<string>('')
const loading = ref(false)

watch(budgetModalOpen, (open) => {
  if (open && budgetModalData.value) {
    limiteInput.value = budgetModalData.value.limite !== undefined && budgetModalData.value.limite !== null
      ? String(budgetModalData.value.limite)
      : ''
  }
})

const submitBudget = async () => {
  const num = Number(limiteInput.value)
  if (isNaN(num) || num < 0) {
    toast.add({
      title: 'Monto inválido',
      description: 'Ingresa un valor numérico válido mayor o igual a 0.',
      color: 'warning'
    })
    return
  }

  if (!budgetModalData.value?.inicio) {
    toast.add({
      title: 'Error',
      description: 'Falta la información del período.',
      color: 'error'
    })
    return
  }

  loading.value = true
  try {
    await $fetch('/api/presupuestos', {
      method: 'PUT',
      body: {
        periodo_inicio: budgetModalData.value.inicio,
        periodo_fin: budgetModalData.value.fin,
        limite: num
      }
    })

    toast.add({
      title: 'Presupuesto actualizado',
      description: `Se asignó un límite de ${formatCurrency(num)} para el período ${budgetModalData.value.etiqueta || ''}.`,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })

    await triggerRefresh(['dashboard', 'historial', 'gastos'])
    closeBudgetModal()
  } catch (err: any) {
    toast.add({
      title: 'Error al guardar presupuesto',
      description: err?.statusMessage || err?.message || 'No se pudo guardar el presupuesto.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="budgetModalOpen" title="Presupuesto del Período">
    <template #body>
      <form class="space-y-4" @submit.prevent="submitBudget">
        <!-- Banner informativo del período -->
        <div class="rounded-xl border border-primary/25 bg-primary/5 p-4 flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <UIcon name="i-lucide-calendar-range" class="w-4 h-4" />
          </div>
          <div class="text-xs space-y-1 min-w-0">
            <span class="font-bold text-foreground block text-sm">
              {{ budgetModalData?.etiqueta || 'Período seleccionado' }}
            </span>
            <p class="text-muted font-mono text-[11px]">
              {{ budgetModalData?.inicio }} al {{ budgetModalData?.fin }}
            </p>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-muted mb-1.5">
            Límite de Gasto para este Período ($ USD)
          </label>
          <UInput
            v-model="limiteInput"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            icon="i-lucide-dollar-sign"
            class="w-full"
            required
            autofocus
          />
          <span class="text-[11px] text-muted mt-1.5 block leading-relaxed">
            Este presupuesto es exclusivo para este ciclo. No afectará a los otros meses del historial ni al límite global predeterminado.
          </span>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-muted/20">
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancelar"
            @click="closeBudgetModal"
          />
          <UButton
            type="submit"
            color="primary"
            icon="i-lucide-save"
            label="Guardar Presupuesto"
            :loading="loading"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
