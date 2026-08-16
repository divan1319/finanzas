import { db } from '../../db'
import { gastos } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.tarjeta_id || !body.fecha || !body.monto || !body.descripcion) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Faltan campos obligatorios: tarjeta_id, fecha, monto, descripcion'
    })
  }

  const monto = Number(body.monto)
  if (isNaN(monto) || monto <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El monto debe ser un número mayor a 0'
    })
  }

  const nuevoGasto = await db.insert(gastos).values({
    tarjeta_id: Number(body.tarjeta_id),
    fecha: body.fecha,
    monto,
    descripcion: body.descripcion.trim(),
    categoria: body.categoria?.trim() || 'General',
    created_at: new Date().toISOString()
  }).returning()

  return {
    success: true,
    gasto: nuevoGasto[0]
  }
})
