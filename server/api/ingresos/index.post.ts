import { db, initDatabase } from '../../db'
import { ingresos } from '../../db/schema'
import { validarDatosIngreso } from '../../utils/ingresos'

export default defineEventHandler(async (event) => {
  const datos = validarDatosIngreso(await readBody(event))
  await initDatabase()
  const nuevoIngreso = await db.insert(ingresos).values({
    ...datos,
    fecha_registro: new Date().toISOString()
  }).returning()

  return {
    success: true,
    ingreso: nuevoIngreso[0]
  }
})
