import { db, initDatabase } from '../../db'
import { gastos, tarjetas } from '../../db/schema'
import { and, gte, lte, eq, desc, like } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const query = getQuery(event)
  const fechaInicio = query.inicio as string | undefined
  const fechaFin = query.fin as string | undefined
  const tarjetaId = query.tarjeta_id ? Number(query.tarjeta_id) : undefined
  const categoria = query.categoria as string | undefined
  const search = query.q as string | undefined

  const conditions = []

  if (fechaInicio) {
    conditions.push(gte(gastos.fecha, fechaInicio))
  }
  if (fechaFin) {
    conditions.push(lte(gastos.fecha, fechaFin))
  }
  if (tarjetaId) {
    conditions.push(eq(gastos.tarjeta_id, tarjetaId))
  }
  if (categoria && categoria !== 'Todas') {
    conditions.push(eq(gastos.categoria, categoria))
  }
  if (search && search.trim()) {
    conditions.push(like(gastos.descripcion, `%${search.trim()}%`))
  }

  const queryBuilder = db.select({
    id: gastos.id,
    tarjeta_id: gastos.tarjeta_id,
    fecha: gastos.fecha,
    monto: gastos.monto,
    descripcion: gastos.descripcion,
    categoria: gastos.categoria,
    created_at: gastos.created_at,
    tarjeta_nombre: tarjetas.nombre,
    tarjeta_codigo: tarjetas.codigo,
    tarjeta_color: tarjetas.color
  })
    .from(gastos)
    .innerJoin(tarjetas, eq(gastos.tarjeta_id, tarjetas.id))

  const results = conditions.length > 0
    ? await queryBuilder.where(and(...conditions)).orderBy(desc(gastos.fecha), desc(gastos.id))
    : await queryBuilder.orderBy(desc(gastos.fecha), desc(gastos.id))

  const total = results.reduce((sum, item) => sum + item.monto, 0)

  return {
    gastos: results,
    total,
    cantidad: results.length
  }
})
