import { db, initDatabase } from '../../db'
import { presupuestosPeriodo } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const body = await readBody(event)

  if (!body || !body.periodo_inicio || typeof body.limite !== 'number') {
    throw createError({
      statusCode: 400,
      message: 'periodo_inicio y limite (numérico) son requeridos'
    })
  }

  const limite = Number(body.limite)
  if (isNaN(limite) || limite < 0) {
    throw createError({
      statusCode: 400,
      message: 'El límite debe ser un número mayor o igual a 0'
    })
  }

  const periodoInicio = String(body.periodo_inicio).trim()
  const periodoFin = String(body.periodo_fin || '').trim()
  const now = new Date().toISOString()

  // Buscar si ya existe presupuesto para este período
  const existing = await db.select()
    .from(presupuestosPeriodo)
    .where(eq(presupuestosPeriodo.periodo_inicio, periodoInicio))

  let result
  if (existing.length > 0) {
    await db.update(presupuestosPeriodo)
      .set({
        limite,
        periodo_fin: periodoFin || existing[0]!.periodo_fin,
        updated_at: now
      })
      .where(eq(presupuestosPeriodo.periodo_inicio, periodoInicio))

    result = {
      ...existing[0],
      limite,
      updated_at: now
    }
  } else {
    const inserted = await db.insert(presupuestosPeriodo)
      .values({
        periodo_inicio: periodoInicio,
        periodo_fin: periodoFin,
        limite,
        updated_at: now
      })
      .returning()

    result = inserted[0]
  }

  return {
    success: true,
    presupuesto: result
  }
})
