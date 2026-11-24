import { db, initDatabase } from '../../db'
import { cuentas, ingresos } from '../../db/schema'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  await initDatabase()
  const listaIngresos = await db.select()
    .from(ingresos)
    .orderBy(desc(ingresos.fecha), desc(ingresos.id))

  const listaCuentas = await db.select().from(cuentas)
  const mapCuentas = new Map(listaCuentas.map(c => [c.id, c]))

  const ingresosEnriquecidos = listaIngresos.map((ing) => {
    const cta = ing.cuenta_id ? mapCuentas.get(ing.cuenta_id) : null
    return {
      ...ing,
      cuenta_nombre: cta?.nombre ?? null,
      cuenta_color: cta?.color ?? null
    }
  })

  const total = listaIngresos.reduce((sum, item) => sum + item.monto, 0)

  return {
    ingresos: ingresosEnriquecidos,
    total,
    cantidad: listaIngresos.length
  }
})
