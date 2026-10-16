// Manejadores Web Push. El service worker que genera Workbox carga este archivo
// mediante importScripts (ver pwa.workbox.importScripts en nuxt.config.ts).

self.addEventListener('push', (event) => {
  let data = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data = { body: event.data.text() }
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Finanzas', {
      body: data.body || '',
      icon: '/pwa-192x192.png',
      tag: data.tag,
      data: { url: data.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destino = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

    // Reutilizar la app si ya está abierta
    for (const ventana of ventanas) {
      if (new URL(ventana.url).origin === self.location.origin) {
        await ventana.focus()
        await ventana.navigate(destino).catch(() => {})
        return
      }
    }

    await self.clients.openWindow(destino)
  })())
})
