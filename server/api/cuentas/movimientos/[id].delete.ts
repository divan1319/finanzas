import { eq } from 'drizzle-orm'
import { db, initDatabase } from '../../../db'
import { gastos, ingresos, liquidacionesTarjeta, movimientosCuenta } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })
  }

  const existentes = await db.select().from(movimientosCuenta).where(eq(movimientosCuenta.id, id))
  const mov = existentes[0]
  if (!mov) {
    throw createError({ statusCode: 404, statusMessage: 'Movimiento no encontrado' })
  }

  if (mov.transferencia_par_id) {
    await db.delete(movimientosCuenta).where(eq(movimientosCuenta.id, mov.transferencia_par_id))
  }

  await db.delete(liquidacionesTarjeta).where(eq(liquidacionesTarjeta.movimiento_id, id))

  if (mov.ingreso_id) {
    await db.update(ingresos)
      .set({ cuenta_id: null })
      .where(eq(ingresos.id, mov.ingreso_id))
  }

  if (mov.gasto_id) {
    await db.update(gastos)
      .set({
        aporta_cuenta: false,
        cuenta_destino_id: null,
        monto_cuenta: null
      })
      .where(eq(gastos.id, mov.gasto_id))
  }

  await db.delete(movimientosCuenta).where(eq(movimientosCuenta.id, id))

  return {
    success: true,
    deleted: mov
  }
})
