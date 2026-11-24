import { eq } from 'drizzle-orm'
import { db, initDatabase } from '../../../db'
import { movimientosCuenta } from '../../../db/schema'
import {
  obtenerCuentaPrincipal,
  roundMoney,
  validarFechaISO,
  verificarCuentaExiste
} from '../../../utils/cuentas'

const ETIQUETAS_CATEGORIA: Record<string, string> = {
  nomina: 'Nómina',
  transferencia: 'Transferencia',
  aguinaldo: 'Aguinaldo',
  bono: 'Bono / Extra',
  retiro_tarjeta: 'Retiro desde tarjeta',
  pago_tarjeta: 'Pago de tarjeta',
  retiro_efectivo: 'Retiro de efectivo',
  traspaso: 'Traspaso entre cuentas',
  otro: 'Otro movimiento'
}

export default defineEventHandler(async (event) => {
  await initDatabase()
  const body = await readBody(event)

  const tipo = body?.tipo
  if (tipo !== 'entrada' && tipo !== 'salida') {
    throw createError({ statusCode: 400, statusMessage: 'El tipo debe ser entrada o salida' })
  }

  const monto = Number(body.monto)
  if (!Number.isFinite(monto) || monto <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'El monto debe ser un número mayor a 0' })
  }

  const fecha = validarFechaISO(body.fecha)

  let cuentaId = body.cuenta_id ? Number(body.cuenta_id) : undefined
  if (!cuentaId) {
    const principal = await obtenerCuentaPrincipal()
    cuentaId = principal?.id
  }

  if (!cuentaId || !Number.isSafeInteger(cuentaId)) {
    throw createError({ statusCode: 400, statusMessage: 'No hay una cuenta válida seleccionada' })
  }

  const cuentaOrigen = await verificarCuentaExiste(cuentaId)
  if (!cuentaOrigen) {
    throw createError({ statusCode: 400, statusMessage: 'La cuenta seleccionada no existe' })
  }

  const categoriaRaw = typeof body.categoria === 'string' && body.categoria.trim()
    ? body.categoria.trim()
    : (tipo === 'entrada' ? 'transferencia' : 'retiro_efectivo')

  const esTraspasoPropio = tipo === 'salida' && Boolean(body.es_traspaso_propio)
  const montoRedondeado = roundMoney(monto)
  const now = new Date().toISOString()

  if (esTraspasoPropio) {
    const cuentaDestinoId = Number(body.cuenta_destino_id)
    if (!cuentaDestinoId || !Number.isSafeInteger(cuentaDestinoId)) {
      throw createError({ statusCode: 400, statusMessage: 'Selecciona una cuenta destino válida para el traspaso' })
    }
    if (cuentaDestinoId === cuentaId) {
      throw createError({ statusCode: 400, statusMessage: 'La cuenta destino debe ser distinta a la cuenta origen' })
    }
    const cuentaDestino = await verificarCuentaExiste(cuentaDestinoId)
    if (!cuentaDestino) {
      throw createError({ statusCode: 400, statusMessage: 'La cuenta destino no existe' })
    }

    const descBase = typeof body.descripcion === 'string' ? body.descripcion.trim() : ''
    const salidaRows = await db.insert(movimientosCuenta).values({
      cuenta_id: cuentaId,
      tipo: 'salida',
      categoria: 'traspaso',
      monto: montoRedondeado,
      fecha,
      descripcion: descBase || `Traspaso a ${cuentaDestino.nombre}`,
      created_at: now
    }).returning()

    const salida = salidaRows[0]!
    const entradaRows = await db.insert(movimientosCuenta).values({
      cuenta_id: cuentaDestinoId,
      tipo: 'entrada',
      categoria: 'traspaso',
      monto: montoRedondeado,
      fecha,
      descripcion: descBase || `Traspaso desde ${cuentaOrigen.nombre}`,
      transferencia_par_id: salida.id,
      created_at: now
    }).returning()

    const entrada = entradaRows[0]!
    await db.update(movimientosCuenta)
      .set({ transferencia_par_id: entrada.id })
      .where(eq(movimientosCuenta.id, salida.id))

    return {
      success: true,
      movimiento: { ...salida, transferencia_par_id: entrada.id },
      movimientoDestino: entrada
    }
  }

  const descripcion = typeof body.descripcion === 'string' && body.descripcion.trim()
    ? body.descripcion.trim()
    : (ETIQUETAS_CATEGORIA[categoriaRaw] || 'Movimiento en cuenta')

  const inserted = await db.insert(movimientosCuenta).values({
    cuenta_id: cuentaId,
    tipo,
    categoria: categoriaRaw,
    monto: montoRedondeado,
    fecha,
    descripcion,
    tarjeta_id: body.tarjeta_id ? Number(body.tarjeta_id) : null,
    created_at: now
  }).returning()

  return {
    success: true,
    movimiento: inserted[0]
  }
})
