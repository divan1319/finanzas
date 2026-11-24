import { db, initDatabase } from '../../db'
import { cuentas } from '../../db/schema'
import { roundMoney } from '../../utils/cuentas'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const body = await readBody(event)

  if (!body?.nombre || typeof body.nombre !== 'string' || !body.nombre.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El nombre de la cuenta es obligatorio'
    })
  }

  const saldoInicialRaw = body.saldo_inicial !== undefined && body.saldo_inicial !== null && body.saldo_inicial !== ''
    ? Number(body.saldo_inicial)
    : 0

  if (!Number.isFinite(saldoInicialRaw)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El saldo inicial debe ser un número válido'
    })
  }

  const todas = await db.select().from(cuentas)
  const esPrincipal = Boolean(body.es_principal) || todas.length === 0

  if (esPrincipal && todas.length > 0) {
    await db.update(cuentas).set({ es_principal: false })
  }

  const inserted = await db.insert(cuentas).values({
    nombre: body.nombre.trim(),
    banco: typeof body.banco === 'string' && body.banco.trim() ? body.banco.trim() : null,
    saldo_inicial: roundMoney(saldoInicialRaw),
    es_principal: esPrincipal,
    color: typeof body.color === 'string' && body.color.trim() ? body.color.trim() : 'emerald',
    created_at: new Date().toISOString()
  }).returning()

  return {
    success: true,
    cuenta: inserted[0]
  }
})
