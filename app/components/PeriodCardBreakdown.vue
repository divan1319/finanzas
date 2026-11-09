<script setup lang="ts">
defineProps<{ totalGastado: number, tarjetas?: Array<{ id: number, nombre: string, color?: string | null, total: number, porcentaje: number }> }>()
const { formatCurrency } = useFinanzas()
</script>

<template>
  <details class="text-xs">
    <summary class="w-fit cursor-pointer rounded text-muted">
      Desglose por tarjeta
    </summary>
    <div class="mt-3 space-y-3 rounded-md bg-muted p-3">
      <div
        v-if="totalGastado > 0"
        class="flex h-2 overflow-hidden rounded-full bg-accented"
        role="img"
        aria-label="Distribución por tarjeta"
      >
        <span
          v-for="t in tarjetas"
          :key="t.id"
          :class="cardColorClass(t.color)"
          :style="{ width: `${t.porcentaje}%` }"
          :title="`${t.nombre}: ${t.porcentaje}%`"
        />
      </div>
      <div
        v-for="t in tarjetas"
        :key="t.id"
        class="flex justify-between gap-3"
      >
        <CardIdentifier
          :name="t.nombre"
          :color="t.color"
        /><span class="tabular-nums">{{ formatCurrency(t.total) }} · {{ t.porcentaje }}%</span>
      </div>
      <p
        v-if="!tarjetas?.length"
        class="text-muted"
      >
        Sin desglose de tarjetas.
      </p>
    </div>
  </details>
</template>
