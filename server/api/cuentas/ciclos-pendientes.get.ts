import { initDatabase } from '../../db'
import { obtenerCiclosPendientesTarjetas } from '../../utils/cuentas'
import { fechaElSalvador } from '#shared/utils/fechaElSalvador'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const query = getQuery(event)
  const fecha = (query.fecha as string) || fechaElSalvador()
  const ciclos = await obtenerCiclosPendientesTarjetas(fecha)

  return {
    fecha,
    ciclos
  }
})
