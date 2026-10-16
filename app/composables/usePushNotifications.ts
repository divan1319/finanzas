import { base64UrlAUint8Array } from '#shared/utils/pushNotificaciones'

// Espera máxima a que el service worker quede listo antes de suscribirse
const SW_READY_TIMEOUT_MS = 10000
// pushManager.subscribe() puede quedarse colgado si el navegador no alcanza su servicio push
const SUBSCRIBE_TIMEOUT_MS = 30000

function conLimiteDeTiempo<T>(promesa: Promise<T>, ms: number, mensaje: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const limite = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(mensaje)), ms)
  })
  return Promise.race([promesa, limite]).finally(() => clearTimeout(timer))
}

function mismaLlave(actual: ArrayBuffer | null, esperada: Uint8Array): boolean {
  if (!actual || actual.byteLength !== esperada.byteLength) return false
  const bytes = new Uint8Array(actual)
  return bytes.every((b, i) => b === esperada[i])
}

export const usePushNotifications = () => {
  const vapidPublicKey = useRuntimeConfig().public.vapidPublicKey

  const soportado = ref(false)
  const configurado = computed(() => Boolean(vapidPublicKey))
  const permiso = ref<NotificationPermission>('default')
  const suscrito = ref(false)
  const endpointActual = ref<string | null>(null)
  const cargando = ref(false)

  const obtenerRegistro = async (): Promise<ServiceWorkerRegistration> => {
    const actual = await navigator.serviceWorker.getRegistration()
    if (actual?.active) return actual

    // Recién instalado: esperar a que se active, sin bloquear para siempre (ej. en desarrollo no hay SW)
    return conLimiteDeTiempo(
      navigator.serviceWorker.ready,
      SW_READY_TIMEOUT_MS,
      'El service worker no está activo. Las notificaciones solo funcionan con la app compilada (producción).'
    )
  }

  const actualizarEstado = async () => {
    soportado.value = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!soportado.value) return

    permiso.value = Notification.permission
    const registro = await navigator.serviceWorker.getRegistration()

    const suscripcion = await registro?.pushManager.getSubscription()
    suscrito.value = Boolean(suscripcion) && permiso.value === 'granted'
    endpointActual.value = suscripcion?.endpoint ?? null
  }

  const activar = async () => {
    if (!configurado.value) {
      throw new Error('El servidor no tiene configurada la llave pública VAPID.')
    }

    cargando.value = true
    try {
      permiso.value = await Notification.requestPermission()
      if (permiso.value !== 'granted') {
        throw new Error('No se otorgó permiso para mostrar notificaciones en este dispositivo.')
      }

      const registro = await obtenerRegistro()

      const llave = base64UrlAUint8Array(vapidPublicKey)
      let suscripcion = await registro.pushManager.getSubscription()

      // Si las llaves VAPID cambiaron, la suscripción anterior ya no sirve
      if (suscripcion && !mismaLlave(suscripcion.options.applicationServerKey, llave)) {
        await suscripcion.unsubscribe()
        suscripcion = null
      }

      suscripcion ??= await conLimiteDeTiempo(
        registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: llave
        }),
        SUBSCRIBE_TIMEOUT_MS,
        'El navegador no respondió al registrarse en su servicio de notificaciones. Revisa tu conexión e inténtalo de nuevo.'
      )

      await $fetch('/api/push/subscribe', {
        method: 'POST',
        body: suscripcion.toJSON()
      })

      suscrito.value = true
      endpointActual.value = suscripcion.endpoint
    } finally {
      cargando.value = false
    }
  }

  const desactivar = async () => {
    cargando.value = true
    try {
      const registro = await navigator.serviceWorker.getRegistration()
      const suscripcion = await registro?.pushManager.getSubscription()

      if (suscripcion) {
        const endpoint = suscripcion.endpoint
        await suscripcion.unsubscribe()
        // Si falla (ej. sin conexión), el servidor la eliminará al recibir 404/410 del servicio push
        await $fetch('/api/push/unsubscribe', {
          method: 'POST',
          body: { endpoint }
        }).catch(() => {})
      }

      suscrito.value = false
      endpointActual.value = null
    } finally {
      cargando.value = false
    }
  }

  const enviarPrueba = async () => {
    if (!endpointActual.value) {
      throw new Error('Este dispositivo no tiene notificaciones activas.')
    }
    await $fetch('/api/push/test', {
      method: 'POST',
      body: { endpoint: endpointActual.value }
    })
  }

  return {
    soportado,
    configurado,
    permiso,
    suscrito,
    cargando,
    actualizarEstado,
    activar,
    desactivar,
    enviarPrueba
  }
}
