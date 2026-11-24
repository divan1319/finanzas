import { db, initDatabase } from '../db'
import { gastos, ingresos, liquidacionesTarjeta, movimientosCuenta, reconciliaciones } from '../db/schema'

export default defineEventHandler(async () => {
  await initDatabase()

  // Eliminar todos los registros de movimientos de cuenta, liquidaciones, gastos, ingresos y reconciliaciones
  await db.delete(liquidacionesTarjeta)
  await db.delete(movimientosCuenta)
  await db.delete(gastos)
  await db.delete(ingresos)
  await db.delete(reconciliaciones)

  return {
    success: true,
    message: 'Se han eliminado todos los movimientos (gastos, ingresos, reconciliaciones y movimientos de cuentas). Listo para registrar tus datos reales.'
  }
})
