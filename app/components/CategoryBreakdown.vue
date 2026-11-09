<script setup lang="ts">
const icons = useAppConfig()

const props = defineProps<{
  categorias: Array<{ categoria: string, total: number, porcentaje: number }>
}>()

const { formatCurrency } = useFinanzas()

const categoriaIconos: Record<string, string> = {
  'Alimentos': icons.appIcons.utensils,
  'Transporte': icons.appIcons.car,
  'Servicios': icons.appIcons.zap,
  'Ocio & Salidas': icons.appIcons.partyPopper,
  'Salud & Farmacia': icons.appIcons.heartPulse,
  'Compras': icons.appIcons.shoppingCart,
  'Hogar': icons.appIcons.home,
  'Educación': icons.appIcons.graduationCap,
  'Suscripciones': icons.appIcons.tv,
  'Otros': icons.appIcons.tag
}
</script>

<template>
  <UCard
    :ui="{ body: 'p-4 sm:p-5 space-y-4' }"
    class="h-full"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <UIcon
            :name="icons.appIcons.pieChart"
            class="w-5 h-5"
          />
        </div>
        <h3 class="text-sm font-semibold text-highlighted">
          Gastos por Categoría
        </h3>
      </div>
      <span class="text-xs text-muted">{{ props.categorias.length }} categorías</span>
    </div>

    <div
      v-if="props.categorias.length === 0"
      class="py-6 text-center text-xs text-muted"
    >
      No hay gastos registrados en este período.
    </div>

    <div
      v-else
      class="space-y-3"
    >
      <div
        v-for="cat in props.categorias"
        :key="cat.categoria"
        class="space-y-1.5"
      >
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <UIcon
              :name="categoriaIconos[cat.categoria] || icons.appIcons.tag"
              class="w-4 h-4 text-muted shrink-0"
            />
            <span class="font-medium text-highlighted">{{ cat.categoria }}</span>
          </div>
          <div class="flex items-center gap-2 font-medium">
            <span class="text-muted">{{ cat.porcentaje }}%</span>
            <span class="font-semibold text-highlighted">{{ formatCurrency(cat.total) }}</span>
          </div>
        </div>

        <div class="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            class="bg-primary h-full rounded-full transition-all duration-300"
            :style="{ width: `${cat.porcentaje}%` }"
          />
        </div>
      </div>
    </div>
  </UCard>
</template>
