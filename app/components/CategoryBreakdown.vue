<script setup lang="ts">
const props = defineProps<{
  categorias: Array<{ categoria: string; total: number; porcentaje: number }>
}>()

const { formatCurrency } = useFinanzas()

const categoriaIconos: Record<string, string> = {
  Alimentos: 'i-lucide-utensils',
  Transporte: 'i-lucide-car',
  Servicios: 'i-lucide-zap',
  'Ocio & Salidas': 'i-lucide-party-popper',
  'Salud & Farmacia': 'i-lucide-heart-pulse',
  Compras: 'i-lucide-shopping-cart',
  Hogar: 'i-lucide-home',
  Educación: 'i-lucide-graduation-cap',
  Suscripciones: 'i-lucide-tv',
  Otros: 'i-lucide-tag'
}
</script>

<template>
  <div class="rounded-2xl border border-muted/20 bg-card p-6 shadow-xs space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <UIcon name="i-lucide-pie-chart" class="w-5 h-5" />
        </div>
        <h3 class="font-bold text-foreground">Gastos por Categoría</h3>
      </div>
      <span class="text-xs text-muted">{{ props.categorias.length }} categorías</span>
    </div>

    <div v-if="props.categorias.length === 0" class="py-6 text-center text-xs text-muted">
      No hay gastos registrados en este período.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="cat in props.categorias"
        :key="cat.categoria"
        class="space-y-1.5"
      >
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <UIcon
              :name="categoriaIconos[cat.categoria] || 'i-lucide-tag'"
              class="w-4 h-4 text-muted shrink-0"
            />
            <span class="font-medium text-foreground">{{ cat.categoria }}</span>
          </div>
          <div class="flex items-center gap-2 font-medium">
            <span class="text-muted">{{ cat.porcentaje }}%</span>
            <span class="font-semibold text-foreground">{{ formatCurrency(cat.total) }}</span>
          </div>
        </div>

        <div class="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
          <div
            class="bg-primary h-full rounded-full transition-all duration-300"
            :style="{ width: `${cat.porcentaje}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
