import { initDatabase } from '../../db'
import { obtenerCuentasConSaldo } from '../../utils/cuentas'

export default defineEventHandler(async () => {
  await initDatabase()
  return await obtenerCuentasConSaldo()
})
