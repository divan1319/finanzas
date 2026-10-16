import { db } from '../../db'
import { pushSubscriptions } from '../../db/schema'

interface SubscribeBody {
  endpoint?: string
  keys?: {
    p256dh?: string
    auth?: string
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SubscribeBody>(event)
  const endpoint = body?.endpoint
  const p256dh = body?.keys?.p256dh
  const auth = body?.keys?.auth

  if (!endpoint || !p256dh || !auth) {
    throw createError({
      statusCode: 400,
      message: 'Suscripción inválida: faltan endpoint, p256dh o auth'
    })
  }

  // Los servicios push de los navegadores siempre exponen endpoints https
  if (!URL.canParse(endpoint) || new URL(endpoint).protocol !== 'https:') {
    throw createError({
      statusCode: 400,
      message: 'El endpoint de la suscripción debe ser una URL https'
    })
  }

  const userAgent = getHeader(event, 'user-agent') || null

  // Si el dispositivo ya estaba suscrito, solo se actualizan sus llaves
  await db.insert(pushSubscriptions).values({
    endpoint,
    p256dh,
    auth,
    user_agent: userAgent,
    created_at: new Date().toISOString()
  }).onConflictDoUpdate({
    target: pushSubscriptions.endpoint,
    set: { p256dh, auth, user_agent: userAgent }
  })

  return { success: true }
})
