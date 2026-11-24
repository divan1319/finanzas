import { eq } from 'drizzle-orm'
import { db, initDatabase } from '../../db'
import { ingresos, movimientosCuenta } from '../../db/schema'
import { validarDatosIngreso } from '../../utils/ingresos'
import { roundMoney, verificarCuentaExiste } from '../../utils/cuentas'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID de nómina inválido' })
  }

  const datos = validarDatosIngreso(await readBody(event))
  await initDatabase()

  const existentes = await db.select().from(ingresos).where(eq(ingresos.id, id))
  const actual = existentes[0]
  if (!actual) {
    throw createError({ statusCode: 404, statusMessage: 'Ingreso no encontrado' })
  }

  const nextCuentaId = datos.cuenta_id === undefined ? actual.cuenta_id : datos.cuenta_id
  if (typeof nextCuentaId === 'number') {
    const existe = await verificarCuentaExiste(nextCuentaId)
    if (!existe) {
      throw createError({ statusCode: 400, statusMessage: 'La cuenta de depósito seleccionada no existe' })
    }
  }

  const montoRedondeado = roundMoney(datos.monto)
  const updated = await db.update(ingresos).set({
    fecha: datos.fecha,
    monto: montoRedondeado,
    descripcion: datos.descripcion,
    cuenta_id: nextCuentaId
  }).where(eq(ingresos.id, id)).returning()

  const movExistentes = await db.select().from(movimientosCuenta).where(eq(movimientosCuenta.ingreso_id, id))

  if (nextCuentaId !== null && nextCuentaId !== undefined) {
    if (movExistentes.length > 0) {
      await db.update(movimientosCuenta).set({
        cuenta_id: nextCuentaId,
        monto: montoRedondeado,
        fecha: datos.fecha,
        descripcion: datos.descripcion
      }).where(eq(movimientosCuenta.ingreso_id, id))
    } else {
      await db.insert(movimientosCuenta).values({
        cuenta_id: nextCuentaId,
        tipo: 'entrada',
        categoria: 'nomina',
        monto: montoRedondeado,
        fecha: datos.fecha,
        descripcion: datos.descripcion,
        ingreso_id: id,
        created_at: new Date().toISOString()
      })
    }
  } else if (movExistentes.length > 0) {
    await db.delete(movimientosCuenta).where(eq(movimientosCuenta.ingreso_id, id))
  }

  return { success: true, ingreso: updated[0]! }
})
