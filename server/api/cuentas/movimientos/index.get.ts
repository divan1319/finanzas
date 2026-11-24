import { and, desc, eq, like } from 'drizzle-orm'
import { db, initDatabase } from '../../../db'
import { cuentas, movimientosCuenta } from '../../../db/schema'
import { roundMoney } from '../../../utils/cuentas'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const query = getQuery(event)
  const cuentaId = query.cuenta_id ? Number(query.cuenta_id) : undefined
  const tipo = query.tipo as string | undefined
  const categoria = query.categoria as string | undefined
  const search = query.q as string | undefined

  const conditions = []
  if (cuentaId && Number.isSafeInteger(cuentaId)) {
    conditions.push(eq(movimientosCuenta.cuenta_id, cuentaId))
  }
  if (tipo === 'entrada' || tipo === 'salida') {
    conditions.push(eq(movimientosCuenta.tipo, tipo))
  }
  if (categoria && categoria !== 'todas') {
    conditions.push(eq(movimientosCuenta.categoria, categoria))
  }
  if (search && search.trim()) {
    conditions.push(like(movimientosCuenta.descripcion, `%${search.trim()}%`))
  }

  const queryBuilder = db.select({
    id: movimientosCuenta.id,
    cuenta_id: movimientosCuenta.cuenta_id,
    cuenta_nombre: cuentas.nombre,
    cuenta_color: cuentas.color,
    tipo: movimientosCuenta.tipo,
    categoria: movimientosCuenta.categoria,
    monto: movimientosCuenta.monto,
    fecha: movimientosCuenta.fecha,
    descripcion: movimientosCuenta.descripcion,
    ingreso_id: movimientosCuenta.ingreso_id,
    gasto_id: movimientosCuenta.gasto_id,
    tarjeta_id: movimientosCuenta.tarjeta_id,
    transferencia_par_id: movimientosCuenta.transferencia_par_id,
    created_at: movimientosCuenta.created_at
  })
    .from(movimientosCuenta)
    .innerJoin(cuentas, eq(movimientosCuenta.cuenta_id, cuentas.id))

  const rows = conditions.length > 0
    ? await queryBuilder.where(and(...conditions)).orderBy(desc(movimientosCuenta.fecha), desc(movimientosCuenta.id))
    : await queryBuilder.orderBy(desc(movimientosCuenta.fecha), desc(movimientosCuenta.id))

  const totalEntradas = roundMoney(
    rows.filter(r => r.tipo === 'entrada').reduce((acc, r) => acc + r.monto, 0)
  )
  const totalSalidas = roundMoney(
    rows.filter(r => r.tipo === 'salida').reduce((acc, r) => acc + r.monto, 0)
  )

  const page = Math.max(1, Number(query.page || 1))
  const limit = query.limit !== undefined ? Math.max(1, Number(query.limit)) : undefined
  const totalItems = rows.length
  const paginated = limit !== undefined
    ? rows.slice((page - 1) * limit, page * limit)
    : rows

  return {
    movimientos: paginated,
    totalEntradas,
    totalSalidas,
    cantidad: totalItems,
    page,
    limit: limit || totalItems,
    totalPages: limit ? Math.ceil(totalItems / limit) || 1 : 1
  }
})
