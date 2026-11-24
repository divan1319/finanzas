import { db, initDatabase } from '../../db'
import { gastos, movimientosCuenta } from '../../db/schema'
import { obtenerCuentaPrincipal, roundMoney, verificarCuentaExiste } from '../../utils/cuentas'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const body = await readBody(event)

  if (!body.tarjeta_id || !body.fecha || !body.monto || !body.descripcion) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Faltan campos obligatorios: tarjeta_id, fecha, monto, descripcion'
    })
  }

  const monto = Number(body.monto)
  if (!Number.isFinite(monto) || monto <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El monto debe ser un número mayor a 0'
    })
  }

  const aportaCuenta = Boolean(body.aporta_cuenta)
  let cuentaDestinoId: number | null = null
  let montoCuenta: number | null = null

  if (aportaCuenta) {
    if (body.cuenta_destino_id !== undefined && body.cuenta_destino_id !== null && body.cuenta_destino_id !== '') {
      const parsedId = Number(body.cuenta_destino_id)
      if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
        throw createError({ statusCode: 400, statusMessage: 'La cuenta destino no es válida' })
      }
      cuentaDestinoId = parsedId
    } else {
      const principal = await obtenerCuentaPrincipal()
      cuentaDestinoId = principal?.id ?? null
    }

    if (!cuentaDestinoId) {
      throw createError({ statusCode: 400, statusMessage: 'No hay una cuenta disponible para abonar el saldo' })
    }

    const existe = await verificarCuentaExiste(cuentaDestinoId)
    if (!existe) {
      throw createError({ statusCode: 400, statusMessage: 'La cuenta destino seleccionada no existe' })
    }

    const rawMontoCuenta = body.monto_cuenta !== undefined && body.monto_cuenta !== null && body.monto_cuenta !== ''
      ? Number(body.monto_cuenta)
      : monto

    if (!Number.isFinite(rawMontoCuenta) || rawMontoCuenta <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'El monto que entra a la cuenta debe ser mayor a 0' })
    }
    montoCuenta = roundMoney(rawMontoCuenta)
  }

  const now = new Date().toISOString()
  const descripcion = String(body.descripcion).trim()
  const tarjetaId = Number(body.tarjeta_id)

  const nuevoGasto = await db.insert(gastos).values({
    tarjeta_id: tarjetaId,
    fecha: body.fecha,
    monto: roundMoney(monto),
    descripcion,
    categoria: body.categoria?.trim() || 'General',
    aporta_cuenta: aportaCuenta,
    cuenta_destino_id: cuentaDestinoId,
    monto_cuenta: montoCuenta,
    created_at: now
  }).returning()

  const gasto = nuevoGasto[0]!

  if (aportaCuenta && cuentaDestinoId && montoCuenta !== null) {
    await db.insert(movimientosCuenta).values({
      cuenta_id: cuentaDestinoId,
      tipo: 'entrada',
      categoria: 'retiro_tarjeta',
      monto: montoCuenta,
      fecha: body.fecha,
      descripcion: `${descripcion} (desde tarjeta)`,
      gasto_id: gasto.id,
      tarjeta_id: tarjetaId,
      created_at: now
    })
  }

  return {
    success: true,
    gasto
  }
})
