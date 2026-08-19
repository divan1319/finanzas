export default defineNuxtPlugin(() => {
  if (import.meta.client && 'serviceWorker' in navigator) {
    if (import.meta.dev) {
      // En desarrollo: desregistrar siempre para evitar interferencias con Vite HMR
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {})
        }
      }).catch(() => {})

      if ('caches' in window) {
        caches.keys().then((cacheNames) => {
          for (const name of cacheNames) {
            caches.delete(name).catch(() => {})
          }
        }).catch(() => {})
      }
    } else {
      // En producción: solo desregistrar si quedó algún 'dev-sw.js' residual de desarrollo
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          const scriptUrl = registration.active?.scriptURL || registration.installing?.scriptURL || ''
          if (scriptUrl.includes('dev-sw.js')) {
            registration.unregister().catch(() => {})
          }
        }
      }).catch(() => {})

      // Eliminar únicamente el viejo pages-cache si existía de versiones previas
      if ('caches' in window) {
        caches.delete('pages-cache').catch(() => {})
      }
    }
  }
})
