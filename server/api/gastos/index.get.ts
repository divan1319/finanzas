import { db, initDatabase } from '../../db'
import { configuracion, gastos, tarjetas } from '../../db/schema'
import {
  periodoActual,
  calcularPeriodoPagoGasto,
  perteneceAlPeriodoNomina
} from '#shared/utils/cicloFinanciero'
import { and, gte, lte, eq, desc, like } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const query = getQuery(event)
  const fechaInicio = query.inicio as string | undefined
  const fechaFin = query.fin as string | undefined
  const tarjetaId = query.tarjeta_id ? Number(query.tarjeta_id) : undefined
  const categoria = query.categoria as string | undefined
  const search = query.q as string | undefined
  const soloPeriodoActual = query.periodo_nomina === 'actual'

  const configList = await db.select().from(configuracion)
  const config = configList[0] || {
    dia_objetivo_nomina: 26,
    limite_gasto_periodo: 15000
  }

  const periodo = periodoActual(new Date(), config.dia_objetivo_nomina)

  const conditions = []

  if (!soloPeriodoActual) {
    if (fechaInicio) {
      conditions.push(gte(gastos.fecha, fechaInicio))
    }
    if (fechaFin) {
      conditions.push(lte(gastos.fecha, fechaFin))
    }
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
    tarjeta_color: tarjetas.color,
    tarjeta_dia_corte: tarjetas.dia_corte,
    tarjeta_dia_pago_propio_tipo: tarjetas.dia_pago_propio_tipo,
    tarjeta_es_principal: tarjetas.es_principal
  })
    .from(gastos)
    .innerJoin(tarjetas, eq(gastos.tarjeta_id, tarjetas.id))

  const resultsRaw = conditions.length > 0
    ? await queryBuilder.where(and(...conditions)).orderBy(desc(gastos.fecha), desc(gastos.id))
    : await queryBuilder.orderBy(desc(gastos.fecha), desc(gastos.id))

  const results = resultsRaw.map(item => {
    const tarjetaInfo = {
      dia_corte: item.tarjeta_dia_corte,
      dia_pago_propio_tipo: item.tarjeta_dia_pago_propio_tipo,
      es_principal: Boolean(item.tarjeta_es_principal)
    }
    const periodoPagoInfo = calcularPeriodoPagoGasto(item.fecha, tarjetaInfo, config.dia_objetivo_nomina)
    return {
      ...item,
      periodoPagoInfo
    }
  })

  const resultsFiltrados = soloPeriodoActual
    ? results.filter(item => {
        const tarjetaInfo = {
          dia_corte: item.tarjeta_dia_corte,
          dia_pago_propio_tipo: item.tarjeta_dia_pago_propio_tipo,
          es_principal: Boolean(item.tarjeta_es_principal)
        }
        return perteneceAlPeriodoNomina(item.fecha, tarjetaInfo, periodo, config.dia_objetivo_nomina)
      })
    : results

  const total = resultsFiltrados.reduce((sum, item) => sum + item.monto, 0)

  return {
    gastos: resultsFiltrados,
    total,
    cantidad: resultsFiltrados.length,
    periodoActual: periodo
  }
})
