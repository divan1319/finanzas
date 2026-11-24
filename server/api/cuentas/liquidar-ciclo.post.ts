import { and, eq } from 'drizzle-orm'
import { db, initDatabase } from '../../db'
import { liquidacionesTarjeta, movimientosCuenta, tarjetas } from '../../db/schema'
import {
  obtenerCuentaPrincipal,
  roundMoney,
  validarFechaISO,
  verificarCuentaExiste
} from '../../utils/cuentas'
import { fechaElSalvador } from '#shared/utils/fechaElSalvador'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const body = await readBody(event)

  const tarjetaId = Number(body?.tarjeta_id)
  const cicloInicio = body?.ciclo_inicio
  const cicloFin = body?.ciclo_fin
  const accion = body?.accion

  if (!Number.isSafeInteger(tarjetaId) || tarjetaId <= 0 || !cicloInicio || !cicloFin) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Faltan datos obligatorios del ciclo de tarjeta'
    })
  }

  validarFechaISO(cicloInicio, 'fecha de inicio del ciclo')
  validarFechaISO(cicloFin, 'fecha de cierre del ciclo')

  if (accion !== 'pagar' && accion !== 'omitir') {
    throw createError({
      statusCode: 400,
      statusMessage: 'La acción debe ser pagar u omitir'
    })
  }

  const tarjetaRows = await db.select().from(tarjetas).where(eq(tarjetas.id, tarjetaId))
  const tarjeta = tarjetaRows[0]
  if (!tarjeta) {
    throw createError({ statusCode: 404, statusMessage: 'Tarjeta no encontrada' })
  }

  const yaLiquidado = await db.select().from(liquidacionesTarjeta).where(
    and(
      eq(liquidacionesTarjeta.tarjeta_id, tarjetaId),
      eq(liquidacionesTarjeta.ciclo_inicio, cicloInicio),
      eq(liquidacionesTarjeta.ciclo_fin, cicloFin)
    )
  )

  if (yaLiquidado.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Este ciclo ya fue registrado o marcado como pagado'
    })
  }

  const fechaPago = body.fecha_pago ? validarFechaISO(body.fecha_pago, 'fecha de pago') : fechaElSalvador()
  const now = new Date().toISOString()

  if (accion === 'omitir') {
    const insertedLiq = await db.insert(liquidacionesTarjeta).values({
      tarjeta_id: tarjetaId,
      ciclo_inicio: cicloInicio,
      ciclo_fin: cicloFin,
      estado: 'omitido',
      monto_pagado: 0,
      cuenta_id: null,
      movimiento_id: null,
      fecha_pago: fechaPago,
      created_at: now
    }).returning()

    return {
      success: true,
      estado: 'omitido',
      liquidacion: insertedLiq[0]
    }
  }

  const monto = Number(body.monto)
  if (!Number.isFinite(monto) || monto <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El monto a pagar debe ser mayor a 0'
    })
  }

  let cuentaId = body.cuenta_id ? Number(body.cuenta_id) : undefined
  if (!cuentaId) {
    const principal = await obtenerCuentaPrincipal()
    cuentaId = principal?.id
  }

  if (!cuentaId || !Number.isSafeInteger(cuentaId)) {
    throw createError({ statusCode: 400, statusMessage: 'Selecciona una cuenta válida para el pago' })
  }

  const cuenta = await verificarCuentaExiste(cuentaId)
  if (!cuenta) {
    throw createError({ statusCode: 400, statusMessage: 'La cuenta seleccionada no existe' })
  }

  const montoRedondeado = roundMoney(monto)
  const descripcion = typeof body.notas === 'string' && body.notas.trim()
    ? body.notas.trim()
    : `Pago ${tarjeta.nombre} (${cicloInicio} al ${cicloFin})`

  const movRows = await db.insert(movimientosCuenta).values({
    cuenta_id: cuentaId,
    tipo: 'salida',
    categoria: 'pago_tarjeta',
    monto: montoRedondeado,
    fecha: fechaPago,
    descripcion,
    tarjeta_id: tarjetaId,
    created_at: now
  }).returning()

  const mov = movRows[0]!
  const liqRows = await db.insert(liquidacionesTarjeta).values({
    tarjeta_id: tarjetaId,
    ciclo_inicio: cicloInicio,
    ciclo_fin: cicloFin,
    estado: 'pagado',
    monto_pagado: montoRedondeado,
    cuenta_id: cuentaId,
    movimiento_id: mov.id,
    fecha_pago: fechaPago,
    created_at: now
  }).returning()

  return {
    success: true,
    estado: 'pagado',
    movimiento: mov,
    liquidacion: liqRows[0]
  }
})
