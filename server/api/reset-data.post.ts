import { db, initDatabase } from '../db'
import { gastos, ingresos, reconciliaciones } from '../db/schema'

export default defineEventHandler(async () => {
  await initDatabase()

  // Eliminar todos los registros de gastos, ingresos y reconciliaciones
  await db.delete(gastos)
  await db.delete(ingresos)
  await db.delete(reconciliaciones)

  return {
    success: true,
    message: 'Se han eliminado todos los movimientos (gastos, ingresos y reconciliaciones). Listo para registrar tus datos reales.'
  }
})
