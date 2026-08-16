<script setup lang="ts">
const { refreshKey } = useFinanzas()

useHead({
  title: 'Control por Tarjeta Activa | Finanzas Personales',
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
    { name: 'description', content: 'Control inteligente de tarjetas de crédito y presupuesto por período de nómina.' },
    { name: 'theme-color', content: '#0f172a' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'mobile-web-app-title', content: 'Finanzas' }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
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

    <!-- Inyección automática del Manifiesto PWA -->
    <VitePwaManifest />
  </UApp>
</template>
