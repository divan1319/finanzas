import { db, initDatabase } from '../../db'
import { ingresos, movimientosCuenta } from '../../db/schema'
import { validarDatosIngreso } from '../../utils/ingresos'
import { obtenerCuentaPrincipal, roundMoney, verificarCuentaExiste } from '../../utils/cuentas'

export default defineEventHandler(async (event) => {
  const datos = validarDatosIngreso(await readBody(event))
  await initDatabase()

  let cuentaId: number | null
  if (datos.cuenta_id !== undefined) {
    if (datos.cuenta_id !== null) {
      const existe = await verificarCuentaExiste(datos.cuenta_id)
      if (!existe) {
        throw createError({ statusCode: 400, statusMessage: 'La cuenta de depósito seleccionada no existe' })
      }
    }
    cuentaId = datos.cuenta_id
  } else {
    const principal = await obtenerCuentaPrincipal()
    cuentaId = principal?.id ?? null
  }

  const now = new Date().toISOString()
  const nuevoIngreso = await db.insert(ingresos).values({
    fecha: datos.fecha,
    monto: roundMoney(datos.monto),
    descripcion: datos.descripcion,
    cuenta_id: cuentaId,
    fecha_registro: now
  }).returning()

  const ingreso = nuevoIngreso[0]!

  if (cuentaId !== null) {
    await db.insert(movimientosCuenta).values({
      cuenta_id: cuentaId,
      tipo: 'entrada',
      categoria: 'nomina',
      monto: roundMoney(datos.monto),
      fecha: datos.fecha,
      descripcion: datos.descripcion,
      ingreso_id: ingreso.id,
      created_at: now
    })
  }

  return {
    success: true,
    ingreso
  }
})
