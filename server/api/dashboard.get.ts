import { db, initDatabase } from '../db'
import { configuracion, gastos, ingresos, tarjetas } from '../db/schema'
import { periodoActual, tarjetaActivaEn, proximoCambioTarjeta } from '#shared/utils/cicloFinanciero'
import { and, gte, lte, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const query = getQuery(event)
  const fechaConsulta = (query.fecha as string) || new Date().toISOString().slice(0, 10)

  // 1. Obtener configuración
  const configList = await db.select().from(configuracion)
  const config = configList[0] || {
    dia_objetivo_nomina: 26,
    limite_gasto_periodo: 15000
  }

  // 2. Obtener tarjetas
  const listaTarjetas = await db.select().from(tarjetas)
  const mapTarjetas = new Map(listaTarjetas.map(t => [t.id, t]))

  // 3. Regla central: Tarjeta activa y próximo cambio
  const codigoTarjetaActiva = tarjetaActivaEn(fechaConsulta, config.dia_objetivo_nomina)
  const infoTarjetaActiva = listaTarjetas.find(t => t.codigo === codigoTarjetaActiva)
  const proximoCambio = proximoCambioTarjeta(fechaConsulta, config.dia_objetivo_nomina)

  // 4. Período actual de nómina
  const periodo = periodoActual(fechaConsulta, config.dia_objetivo_nomina)

  // 5. Gastos del período actual
  const gastosPeriodo = await db.select()
    .from(gastos)
    .where(
      and(
        gte(gastos.fecha, periodo.inicio),
        lte(gastos.fecha, periodo.fin)
      )
    )
    .orderBy(desc(gastos.fecha), desc(gastos.id))

  // Totales y desglose por tarjeta
  let totalGastadoPeriodo = 0
  let gastoTarjetaA = 0
  let gastoTarjetaB = 0
  const gastosPorTarjetaMap = new Map<number, number>()
  const categoriasMap = new Map<string, number>()

  for (const g of gastosPeriodo) {
    totalGastadoPeriodo += g.monto
    gastosPorTarjetaMap.set(g.tarjeta_id, (gastosPorTarjetaMap.get(g.tarjeta_id) || 0) + g.monto)

    const t = mapTarjetas.get(g.tarjeta_id)
    if (t?.codigo === 'A') {
      gastoTarjetaA += g.monto
    } else if (t?.codigo === 'B') {
      gastoTarjetaB += g.monto
    }

    const cat = g.categoria || 'Otros'
    categoriasMap.set(cat, (categoriasMap.get(cat) || 0) + g.monto)
  }

  const desgloseTarjetas = listaTarjetas.map(t => {
    const total = gastosPorTarjetaMap.get(t.id) || 0
    return {
      id: t.id,
      nombre: t.nombre,
      codigo: t.codigo,
      color: t.color || 'emerald',
      dia_corte: t.dia_corte,
      dia_pago_propio_tipo: t.dia_pago_propio_tipo,
      dia_vencimiento_pago: t.dia_vencimiento_pago,
      total,
      porcentaje: totalGastadoPeriodo > 0 ? Math.round((total / totalGastadoPeriodo) * 100) : 0
    }
  })

  const limite = config.limite_gasto_periodo
  const porcentajeLimite = limite > 0 ? Math.round((totalGastadoPeriodo / limite) * 100) : 0
  const restanteLimite = Math.max(0, limite - totalGastadoPeriodo)
  const excedido = totalGastadoPeriodo > limite

  // 6. Ingreso del período actual
  const ingresosPeriodo = await db.select()
    .from(ingresos)
    .where(
      and(
        gte(ingresos.fecha, periodo.inicio),
        lte(ingresos.fecha, periodo.fin)
      )
    )

  const ingresoPrincipal = ingresosPeriodo.length > 0 ? ingresosPeriodo[0] : null
  const totalIngresoPeriodo = ingresosPeriodo.reduce((acc, ing) => acc + ing.monto, 0)

  // 7. Ahorro del período (Sección 3.6)
  const tieneIngreso = ingresosPeriodo.length > 0
  const ahorroPeriodo = tieneIngreso ? (totalIngresoPeriodo - totalGastadoPeriodo) : null
  const porcentajeAhorro = tieneIngreso && totalIngresoPeriodo > 0
    ? Math.round((ahorroPeriodo! / totalIngresoPeriodo) * 100)
    : null

  // 8. Distribución por categoría
  const desgloseCategorias = Array.from(categoriasMap.entries())
    .map(([nombre, total]) => ({
      categoria: nombre,
      total,
      porcentaje: totalGastadoPeriodo > 0 ? Math.round((total / totalGastadoPeriodo) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total)

  // 9. Últimos gastos
  const ultimosGastosRaw = await db.select()
    .from(gastos)
    .orderBy(desc(gastos.fecha), desc(gastos.id))
    .limit(10)

  const ultimosGastos = ultimosGastosRaw.map(g => ({
    ...g,
    tarjeta: mapTarjetas.get(g.tarjeta_id)
  }))

  const tarjetaNuevaInfo = listaTarjetas.find(t => t.codigo === proximoCambio.tarjetaNueva)

  return {
    fechaConsulta,
    config,
    tarjetas: listaTarjetas,
    tarjetaActiva: {
      codigo: codigoTarjetaActiva,
      info: infoTarjetaActiva,
      proximoCambio: {
        ...proximoCambio,
        tarjetaNuevaNombre: tarjetaNuevaInfo?.nombre || `Tarjeta ${proximoCambio.tarjetaNueva}`
      }
    },
    periodo,
    desgloseTarjetas,
    resumenGasto: {
      limite,
      totalGastado: totalGastadoPeriodo,
      restante: restanteLimite,
      porcentajeLimite,
      excedido,
      gastoTarjetaA,
      gastoTarjetaB,
      porcentajeTarjetaA: totalGastadoPeriodo > 0 ? Math.round((gastoTarjetaA / totalGastadoPeriodo) * 100) : 0,
      porcentajeTarjetaB: totalGastadoPeriodo > 0 ? Math.round((gastoTarjetaB / totalGastadoPeriodo) * 100) : 0,
      desgloseTarjetas
    },
    resumenAhorro: {
      tieneIngreso,
      ingreso: ingresoPrincipal,
      totalIngreso: totalIngresoPeriodo,
      ahorro: ahorroPeriodo,
      porcentajeAhorro
    },
    desgloseCategorias,
    ultimosGastos
  }
})
