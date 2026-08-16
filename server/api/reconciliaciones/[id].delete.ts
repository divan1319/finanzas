import { db } from '../../db'
import { reconciliaciones } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })
  }

  const deleted = await db.delete(reconciliaciones).where(eq(reconciliaciones.id, id)).returning()

  if (deleted.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Reconciliación no encontrada' })
  }

  return {
    success: true,
    deleted: deleted[0]
  }
})
