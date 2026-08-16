<script setup lang="ts">
const { refreshKey } = useFinanzas()

useHead({
  title: 'Control por Tarjeta Activa | Finanzas Personales',
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'description', content: 'Control inteligente de tarjetas de crédito y presupuesto por período de nómina.' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'es'
  }
})

// Cargar configuración global y tarjetas para los modales
const { data: configData } = await useFetch('/api/configuracion', {
  key: 'global-config',
  watch: [refreshKey]
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- Modales Globales -->
    <ExpenseModal
      :tarjetas="configData?.tarjetas"
      :dia-objetivo-nomina="configData?.configuracion?.dia_objetivo_nomina"
    />
    <IncomeModal />
  </UApp>
</template>
