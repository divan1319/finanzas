import { db, initDatabase } from '../../db'
import { configuracion, tarjetas } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const body = await readBody(event)

  // 1. Actualizar configuración general
  if (body.dia_objetivo_nomina !== undefined || body.limite_gasto_periodo !== undefined) {
    const dia = body.dia_objetivo_nomina !== undefined ? Number(body.dia_objetivo_nomina) : undefined
    const limite = body.limite_gasto_periodo !== undefined ? Number(body.limite_gasto_periodo) : undefined

    const configs = await db.select().from(configuracion)
    const firstConfig = configs[0]
    if (firstConfig) {
      await db.update(configuracion)
        .set({
          ...(dia !== undefined ? { dia_objetivo_nomina: dia } : {}),
          ...(limite !== undefined ? { limite_gasto_periodo: limite } : {})
        })
        .where(eq(configuracion.id, firstConfig.id))
    } else {
      await db.insert(configuracion).values({
        dia_objetivo_nomina: dia || 26,
        limite_gasto_periodo: limite || 15000
      })
    }
  }

  // 2. Actualizar tarjetas si vienen en el body
  if (Array.isArray(body.tarjetas)) {
    for (const t of body.tarjetas) {
      if (t.id) {
        await db.update(tarjetas)
          .set({
            ...(t.nombre ? { nombre: t.nombre } : {}),
            ...(t.dia_corte !== undefined ? { dia_corte: Number(t.dia_corte) } : {}),
            ...(t.dia_vencimiento_pago !== undefined ? { dia_vencimiento_pago: Number(t.dia_vencimiento_pago) } : {}),
            ...(t.color ? { color: t.color } : {})
          })
          .where(eq(tarjetas.id, t.id))
      }
    }
  }

  const updatedConfig = await db.select().from(configuracion)
  const updatedTarjetas = await db.select().from(tarjetas)

  return {
    success: true,
    configuracion: updatedConfig[0],
    tarjetas: updatedTarjetas
  }
})
