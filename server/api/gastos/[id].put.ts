import { db } from '../../db'
import { gastos } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })
  }

  const body = await readBody(event)
  const updateData: Record<string, any> = {}

  if (body.tarjeta_id) updateData.tarjeta_id = Number(body.tarjeta_id)
  if (body.fecha) updateData.fecha = body.fecha
  if (body.monto !== undefined) {
    const m = Number(body.monto)
    if (isNaN(m) || m <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Monto inválido' })
    }
    updateData.monto = m
  }
  if (body.descripcion) updateData.descripcion = body.descripcion.trim()
  if (body.categoria !== undefined) updateData.categoria = body.categoria.trim()

  const updated = await db.update(gastos)
    .set(updateData)
    .where(eq(gastos.id, id))
    .returning()

  if (updated.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Gasto no encontrado' })
  }

  return {
    success: true,
    gasto: updated[0]
  }
})
