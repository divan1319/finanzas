import { eq } from 'drizzle-orm'
import { db, initDatabase } from '../../db'
import { ingresos } from '../../db/schema'
import { validarDatosIngreso } from '../../utils/ingresos'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID de nómina inválido' })
  }
  const datos = validarDatosIngreso(await readBody(event))
  await initDatabase()
  const updated = await db.update(ingresos).set(datos).where(eq(ingresos.id, id)).returning()
  if (!updated.length) {
    throw createError({ statusCode: 404, statusMessage: 'Ingreso no encontrado' })
  }
  return { success: true, ingreso: updated[0]! }
})
