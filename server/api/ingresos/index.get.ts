import { db, initDatabase } from '../../db'
import { ingresos } from '../../db/schema'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  await initDatabase()
  const listaIngresos = await db.select()
    .from(ingresos)
    .orderBy(desc(ingresos.fecha), desc(ingresos.id))

  const total = listaIngresos.reduce((sum, item) => sum + item.monto, 0)

  return {
    ingresos: listaIngresos,
    total,
    cantidad: listaIngresos.length
  }
})
