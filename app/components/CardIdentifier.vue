<script setup lang="ts">
defineProps<{ name: string, color?: string | null }>()
</script>

<template>
  <span class="inline-flex min-w-0 items-center gap-2 text-highlighted">
    <span
      class="size-2 shrink-0 rounded-full"
      :class="cardColorClass(color)"
      aria-hidden="true"
    />
    <span class="truncate">{{ name }}</span>
  </span>
</template>
