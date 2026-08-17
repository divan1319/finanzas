<script setup lang="ts">
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

const { initOfflineListeners, cacheConfigData, getCachedConfigData } = useOfflineSync()

// Cargar configuración global y tarjetas para los modales con key semántica
const { data: configData } = await useFetch('/api/configuracion', {
  key: 'global-config'
})

// Respaldar o recuperar catálogo de tarjetas en caché local
watch(configData, (val) => {
  if (val) {
    cacheConfigData(val)
  }
}, { immediate: true })

const effectiveConfig = computed(() => {
  return configData.value || getCachedConfigData()
})

onMounted(() => {
  initOfflineListeners()
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- Modales Globales -->
    <ExpenseModal
      :tarjetas="effectiveConfig?.tarjetas"
      :dia-objetivo-nomina="effectiveConfig?.configuracion?.dia_objetivo_nomina"
    />
    <IncomeModal />

    <!-- Inyección automática del Manifiesto PWA -->
    <VitePwaManifest />
  </UApp>
</template>
