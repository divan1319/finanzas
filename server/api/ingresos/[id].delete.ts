import { db } from '../../db'
import { ingresos } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })
  }

  const deleted = await db.delete(ingresos).where(eq(ingresos.id, id)).returning()

  if (deleted.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Ingreso no encontrado' })
  }

  return {
    success: true,
    deleted: deleted[0]
  }
})
