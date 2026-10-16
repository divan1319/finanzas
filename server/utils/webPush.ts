import webpush from 'web-push'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { pushSubscriptions } from '../db/schema'
import { suscripcionExpirada, type PushPayload } from '#shared/utils/pushNotificaciones'

export interface ResultadoEnvioPush {
  total: number
  enviadas: number
  fallidas: number
  eliminadas: number
}

function obtenerVapid() {
  const config = useRuntimeConfig()
  const publicKey = config.public.vapidPublicKey
  const privateKey = config.vapidPrivateKey
  const subject = config.vapidSubject

  if (!publicKey || !privateKey || !subject) return null
  return { publicKey, privateKey, subject }
}

export function pushConfigurado(): boolean {
  return obtenerVapid() !== null
}

/**
 * Envía la notificación a todos los dispositivos suscritos (o solo a `opciones.endpoint`).
 * Un fallo en un dispositivo no detiene el envío a los demás; los errores se registran en consola.
 */
export async function enviarPush(payload: PushPayload, opciones: { endpoint?: string } = {}): Promise<ResultadoEnvioPush> {
  const resultado: ResultadoEnvioPush = { total: 0, enviadas: 0, fallidas: 0, eliminadas: 0 }

  const vapidDetails = obtenerVapid()
  if (!vapidDetails) {
    console.warn('[web-push] Faltan VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY o VAPID_SUBJECT; no se enviaron notificaciones')
    return resultado
  }

  const suscripciones = opciones.endpoint
    ? await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, opciones.endpoint))
    : await db.select().from(pushSubscriptions)
  resultado.total = suscripciones.length
  const cuerpo = JSON.stringify(payload)

  await Promise.all(suscripciones.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        cuerpo,
        // timeout: evita que un servicio push lento retenga al webhook (y provoque reintentos)
        { vapidDetails, TTL: 60 * 60 * 24, urgency: 'high', timeout: 5000 }
      )
      resultado.enviadas++
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (suscripcionExpirada(statusCode)) {
        // El navegador ya no acepta mensajes en este endpoint: limpiar la suscripción
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id))
        resultado.eliminadas++
      } else {
        resultado.fallidas++
        console.error('[web-push] error enviando notificación', { statusCode, endpoint: s.endpoint, err })
      }
    }
  }))

  return resultado
}
