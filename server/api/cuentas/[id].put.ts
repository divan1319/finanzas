import { eq } from 'drizzle-orm'
import { db, initDatabase } from '../../db'
import { cuentas } from '../../db/schema'
import { roundMoney } from '../../utils/cuentas'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID de cuenta inválido' })
  }

  const existentes = await db.select().from(cuentas).where(eq(cuentas.id, id))
  const actual = existentes[0]
  if (!actual) {
    throw createError({ statusCode: 404, statusMessage: 'Cuenta no encontrada' })
  }

  const body = await readBody(event)
  const updateData: Partial<typeof cuentas.$inferInsert> = {}

  if (body.nombre !== undefined) {
    if (typeof body.nombre !== 'string' || !body.nombre.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'El nombre de la cuenta no puede estar vacío' })
    }
    updateData.nombre = body.nombre.trim()
  }

  if (body.banco !== undefined) {
    updateData.banco = typeof body.banco === 'string' && body.banco.trim() ? body.banco.trim() : null
  }

  if (body.saldo_inicial !== undefined) {
    const saldoInicial = Number(body.saldo_inicial)
    if (!Number.isFinite(saldoInicial)) {
      throw createError({ statusCode: 400, statusMessage: 'El saldo inicial debe ser un número válido' })
    }
    updateData.saldo_inicial = roundMoney(saldoInicial)
  }

  if (body.color !== undefined && typeof body.color === 'string' && body.color.trim()) {
    updateData.color = body.color.trim()
  }

  if (body.es_principal !== undefined) {
    const quierePrincipal = Boolean(body.es_principal)
    if (quierePrincipal) {
      await db.update(cuentas).set({ es_principal: false })
      updateData.es_principal = true
    } else if (actual.es_principal) {
      const todas = await db.select().from(cuentas)
      const existeOtraPrincipal = todas.some(c => c.id !== id && c.es_principal)
      if (existeOtraPrincipal) {
        updateData.es_principal = false
      }
    }
  }

  const updated = Object.keys(updateData).length > 0
    ? await db.update(cuentas).set(updateData).where(eq(cuentas.id, id)).returning()
    : [actual]

  return {
    success: true,
    cuenta: updated[0]
  }
})
