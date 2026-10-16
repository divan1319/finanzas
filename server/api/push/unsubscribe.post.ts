import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { pushSubscriptions } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ endpoint?: string }>(event)

  if (!body?.endpoint) {
    throw createError({
      statusCode: 400,
      message: 'Falta el endpoint de la suscripción'
    })
  }

  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, body.endpoint))

  return { success: true }
})
