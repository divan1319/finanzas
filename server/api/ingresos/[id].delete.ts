import { db, initDatabase } from '../../db'
import { ingresos, movimientosCuenta } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })
  }

  await db.delete(movimientosCuenta).where(eq(movimientosCuenta.ingreso_id, id))
  const deleted = await db.delete(ingresos).where(eq(ingresos.id, id)).returning()

  if (deleted.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Ingreso no encontrado' })
  }

  return {
    success: true,
    deleted: deleted[0]
  }
})
