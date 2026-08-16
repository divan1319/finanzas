import { db, initDatabase } from '../../db'
import { configuracion, tarjetas } from '../../db/schema'

export default defineEventHandler(async () => {
  await initDatabase()
  const configs = await db.select().from(configuracion)
  const config = configs[0] || {
    id: 1,
    dia_objetivo_nomina: 26,
    limite_gasto_periodo: 15000
  }

  const listaTarjetas = await db.select().from(tarjetas)

  return {
    configuracion: config,
    tarjetas: listaTarjetas
  }
})
