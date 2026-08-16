import { db } from '../../db'
import { ingresos } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.fecha || !body.monto) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Faltan campos obligatorios: fecha, monto'
    })
  }

  const monto = Number(body.monto)
  if (isNaN(monto) || monto <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El monto debe ser un número positivo mayor a 0'
    })
  }

  const nuevoIngreso = await db.insert(ingresos).values({
    fecha: body.fecha,
    monto,
    descripcion: body.descripcion?.trim() || 'Nómina',
    fecha_registro: new Date().toISOString()
  }).returning()

  return {
    success: true,
    ingreso: nuevoIngreso[0]
  }
})
