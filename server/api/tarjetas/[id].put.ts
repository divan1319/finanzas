import { db, initDatabase } from '../../db'
import { tarjetas } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID de tarjeta inválido'
    })
  }

  const body = await readBody(event)
  const updateData: Partial<{
    nombre: string
    dia_corte: number
    dia_pago_propio_tipo: string
    dia_vencimiento_pago: number | null
    color: string
  }> = {}

  if (body.nombre !== undefined) {
    if (!String(body.nombre).trim()) {
      throw createError({ statusCode: 400, statusMessage: 'El nombre no puede estar vacío' })
    }
    updateData.nombre = String(body.nombre).trim()
  }

  if (body.dia_corte !== undefined) {
    const corte = Number(body.dia_corte)
    if (isNaN(corte) || corte < 1 || corte > 31) {
      throw createError({ statusCode: 400, statusMessage: 'El día de corte debe estar entre 1 y 31' })
    }
    updateData.dia_corte = corte
  }

  if (body.dia_pago_propio_tipo !== undefined) {
    updateData.dia_pago_propio_tipo = body.dia_pago_propio_tipo
  }

  if (body.dia_vencimiento_pago !== undefined) {
    if (body.dia_vencimiento_pago === null || body.dia_vencimiento_pago === '') {
      updateData.dia_vencimiento_pago = null
    } else {
      const venc = Number(body.dia_vencimiento_pago)
      if (isNaN(venc) || venc < 1 || venc > 31) {
        throw createError({ statusCode: 400, statusMessage: 'El día de vencimiento debe estar entre 1 y 31' })
      }
      updateData.dia_vencimiento_pago = venc
    }
  }

  if (body.color !== undefined) {
    updateData.color = body.color
  }

  await db.update(tarjetas).set(updateData).where(eq(tarjetas.id, id))
  const updated = await db.select().from(tarjetas).where(eq(tarjetas.id, id))

  if (!updated.length) {
    throw createError({ statusCode: 404, statusMessage: 'Tarjeta no encontrada' })
  }

  return {
    success: true,
    tarjeta: updated[0]
  }
})
