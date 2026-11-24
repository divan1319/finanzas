import { db, initDatabase } from '../../db'
import { gastos, movimientosCuenta } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { obtenerCuentaPrincipal, roundMoney, verificarCuentaExiste } from '../../utils/cuentas'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })
  }

  const existentes = await db.select().from(gastos).where(eq(gastos.id, id))
  const actual = existentes[0]
  if (!actual) {
    throw createError({ statusCode: 404, statusMessage: 'Gasto no encontrado' })
  }

  const body = await readBody(event)

  const nextTarjetaId = body.tarjeta_id ? Number(body.tarjeta_id) : actual.tarjeta_id
  const nextFecha = body.fecha || actual.fecha
  let nextMonto = actual.monto
  if (body.monto !== undefined) {
    const m = Number(body.monto)
    if (!Number.isFinite(m) || m <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Monto inválido' })
    }
    nextMonto = roundMoney(m)
  }
  const nextDescripcion = body.descripcion ? String(body.descripcion).trim() : actual.descripcion
  const nextCategoria = body.categoria !== undefined ? String(body.categoria).trim() : actual.categoria

  const nextAportaCuenta = body.aporta_cuenta !== undefined
    ? Boolean(body.aporta_cuenta)
    : Boolean(actual.aporta_cuenta)

  let nextCuentaDestinoId: number | null = null
  let nextMontoCuenta: number | null = null

  if (nextAportaCuenta) {
    if (body.cuenta_destino_id !== undefined) {
      if (body.cuenta_destino_id === null || body.cuenta_destino_id === '') {
        nextCuentaDestinoId = (await obtenerCuentaPrincipal())?.id ?? null
      } else {
        const parsedId = Number(body.cuenta_destino_id)
        if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
          throw createError({ statusCode: 400, statusMessage: 'La cuenta destino no es válida' })
        }
        nextCuentaDestinoId = parsedId
      }
    } else {
      nextCuentaDestinoId = actual.cuenta_destino_id ?? (await obtenerCuentaPrincipal())?.id ?? null
    }

    if (!nextCuentaDestinoId) {
      throw createError({ statusCode: 400, statusMessage: 'No hay una cuenta disponible para abonar el saldo' })
    }

    const existe = await verificarCuentaExiste(nextCuentaDestinoId)
    if (!existe) {
      throw createError({ statusCode: 400, statusMessage: 'La cuenta destino seleccionada no existe' })
    }

    const rawMontoCuenta = body.monto_cuenta !== undefined
      ? (body.monto_cuenta !== null && body.monto_cuenta !== '' ? Number(body.monto_cuenta) : nextMonto)
      : (actual.monto_cuenta ?? nextMonto)

    if (!Number.isFinite(rawMontoCuenta) || rawMontoCuenta <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'El monto que entra a la cuenta debe ser mayor a 0' })
    }
    nextMontoCuenta = roundMoney(rawMontoCuenta)
  }

  const updated = await db.update(gastos)
    .set({
      tarjeta_id: nextTarjetaId,
      fecha: nextFecha,
      monto: nextMonto,
      descripcion: nextDescripcion,
      categoria: nextCategoria,
      aporta_cuenta: nextAportaCuenta,
      cuenta_destino_id: nextCuentaDestinoId,
      monto_cuenta: nextMontoCuenta
    })
    .where(eq(gastos.id, id))
    .returning()

  const movExistentes = await db.select().from(movimientosCuenta).where(eq(movimientosCuenta.gasto_id, id))

  if (nextAportaCuenta && nextCuentaDestinoId && nextMontoCuenta !== null) {
    if (movExistentes.length > 0) {
      await db.update(movimientosCuenta).set({
        cuenta_id: nextCuentaDestinoId,
        monto: nextMontoCuenta,
        fecha: nextFecha,
        descripcion: `${nextDescripcion} (desde tarjeta)`,
        tarjeta_id: nextTarjetaId
      }).where(eq(movimientosCuenta.gasto_id, id))
    } else {
      await db.insert(movimientosCuenta).values({
        cuenta_id: nextCuentaDestinoId,
        tipo: 'entrada',
        categoria: 'retiro_tarjeta',
        monto: nextMontoCuenta,
        fecha: nextFecha,
        descripcion: `${nextDescripcion} (desde tarjeta)`,
        gasto_id: id,
        tarjeta_id: nextTarjetaId,
        created_at: new Date().toISOString()
      })
    }
  } else if (movExistentes.length > 0) {
    await db.delete(movimientosCuenta).where(eq(movimientosCuenta.gasto_id, id))
  }

  return {
    success: true,
    gasto: updated[0]
  }
})
