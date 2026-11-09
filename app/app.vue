<script setup lang="ts">
const colorMode = useColorMode()
const appConfig = useAppConfig()
const browserThemeColor = ref('')

// Derive the browser chrome color from the same surface used by the app.
const updateBrowserThemeColor = async () => {
  if (import.meta.server) return
  await nextTick()
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return
  context.fillStyle = getComputedStyle(document.body).backgroundColor
  context.fillRect(0, 0, 1, 1)
  const rgb = context.getImageData(0, 0, 1, 1).data
  browserThemeColor.value = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}
onMounted(updateBrowserThemeColor)
watch([() => colorMode.value, () => appConfig.ui.colors.neutral], updateBrowserThemeColor)

useHead(() => ({
  title: 'Control por Tarjeta Activa | Finanzas Personales',
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
    { name: 'description', content: 'Control inteligente de tarjetas de crédito y presupuesto por período de nómina.' },
    { name: 'theme-color', content: browserThemeColor.value },
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
}))

const { initOfflineListeners, cacheConfigData, getCachedConfigData } = useOfflineSync()

// Cargar configuración global y tarjetas para los modales con key semántica y persistencia
const { data: configData } = useCachedFetch('/api/configuracion', {
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
  // Precargar en segundo plano las otras vistas para que estén disponibles 100% offline
  prefetchAppRoutesData()
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
    <EditBudgetModal />

    <!-- Inyección automática del Manifiesto PWA -->
    <VitePwaManifest />
  </UApp>
</template>
