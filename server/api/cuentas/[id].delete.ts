import { eq } from 'drizzle-orm'
import { db, initDatabase } from '../../db'
import { cuentas, gastos, ingresos, liquidacionesTarjeta, movimientosCuenta } from '../../db/schema'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID de cuenta inválido' })
  }

  const existentes = await db.select().from(cuentas).where(eq(cuentas.id, id))
  const cuenta = existentes[0]
  if (!cuenta) {
    throw createError({ statusCode: 404, statusMessage: 'Cuenta no encontrada' })
  }

  const todas = await db.select().from(cuentas)
  if (todas.length <= 1) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Debes mantener al menos una cuenta activa.'
    })
  }

  const movimientosAsociados = await db.select({ id: movimientosCuenta.id })
    .from(movimientosCuenta)
    .where(eq(movimientosCuenta.cuenta_id, id))

  if (movimientosAsociados.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `No se puede eliminar la cuenta "${cuenta.nombre}" porque tiene ${movimientosAsociados.length} movimiento(s) registrado(s).`
    })
  }

  await db.update(ingresos).set({ cuenta_id: null }).where(eq(ingresos.cuenta_id, id))
  await db.update(gastos).set({ cuenta_destino_id: null }).where(eq(gastos.cuenta_destino_id, id))
  await db.update(liquidacionesTarjeta).set({ cuenta_id: null }).where(eq(liquidacionesTarjeta.cuenta_id, id))

  await db.delete(cuentas).where(eq(cuentas.id, id))

  if (cuenta.es_principal) {
    const restantes = await db.select().from(cuentas)
    if (restantes[0]) {
      await db.update(cuentas).set({ es_principal: true }).where(eq(cuentas.id, restantes[0].id))
    }
  }

  return {
    success: true,
    message: `Cuenta "${cuenta.nombre}" eliminada correctamente.`
  }
})
