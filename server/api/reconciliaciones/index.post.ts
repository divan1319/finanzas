import { db } from '../../db'
import { reconciliaciones } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (
    !body.tarjeta_id ||
    !body.ciclo_inicio ||
    !body.ciclo_fin ||
    body.total_banco === undefined ||
    body.total_app_calculado === undefined
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Faltan campos obligatorios para guardar la reconciliación'
    })
  }

  const totalBanco = Number(body.total_banco)
  const totalApp = Number(body.total_app_calculado)
  const diferencia = Number((totalBanco - totalApp).toFixed(2))

  const saved = await db.insert(reconciliaciones).values({
    tarjeta_id: Number(body.tarjeta_id),
    ciclo_inicio: body.ciclo_inicio,
    ciclo_fin: body.ciclo_fin,
    total_banco: totalBanco,
    total_app_calculado: totalApp,
    diferencia,
    notas: body.notas?.trim() || null,
    fecha_registro: new Date().toISOString()
  }).returning()

  return {
    success: true,
    reconciliacion: saved[0]
  }
})
