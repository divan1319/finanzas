import { db, initDatabase } from '../../db'
import { tarjetas } from '../../db/schema'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const body = await readBody(event)

  if (!body.nombre || body.dia_corte === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El nombre y el día de corte son obligatorios'
    })
  }

  const diaCorte = Number(body.dia_corte)
  if (isNaN(diaCorte) || diaCorte < 1 || diaCorte > 31) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El día de corte debe ser un número entre 1 y 31'
    })
  }

  const diaVencimiento = body.dia_vencimiento_pago !== undefined && body.dia_vencimiento_pago !== ''
    ? Number(body.dia_vencimiento_pago)
    : null

  if (diaVencimiento !== null && (isNaN(diaVencimiento) || diaVencimiento < 1 || diaVencimiento > 31)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El día de vencimiento debe ser un número entre 1 y 31'
    })
  }

  // Generar código único para la tarjeta
  const todas = await db.select().from(tarjetas)
  const codigosExistentes = new Set(todas.map(t => t.codigo))
  
  let codigo = (body.codigo || body.nombre.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '')) || 'TAR'
  let counter = 1
  let candidatoCodigo = codigo
  while (codigosExistentes.has(candidatoCodigo)) {
    candidatoCodigo = `${codigo}_${counter}`
    counter++
  }

  const esPrincipal = Boolean(body.es_principal) || todas.length === 0

  if (esPrincipal) {
    // Si se marca como principal, desmarcar las demás
    await db.update(tarjetas).set({ es_principal: false })
  }

  const nuevaTarjeta = {
    codigo: candidatoCodigo,
    nombre: String(body.nombre).trim(),
    dia_corte: diaCorte,
    dia_pago_propio_tipo: body.dia_pago_propio_tipo || (esPrincipal ? 'dia_siguiente_corte' : 'dia_nomina'),
    dia_vencimiento_pago: diaVencimiento,
    es_principal: esPrincipal,
    color: body.color || 'emerald'
  }

  const insertResult = await db.insert(tarjetas).values(nuevaTarjeta).returning()
  const tarjetaCreada = insertResult[0] || nuevaTarjeta

  return {
    success: true,
    tarjeta: tarjetaCreada
  }
})
