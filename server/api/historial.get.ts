import { db, initDatabase } from '../db'
import { configuracion, gastos, ingresos, tarjetas, presupuestosPeriodo } from '../db/schema'
import {
  generarHistorialPeriodos,
  perteneceAlPeriodoNomina,
  type PeriodoRango
} from '#shared/utils/cicloFinanciero'
import { and, gte, lte, desc } from 'drizzle-orm'

export interface ItemHistorialDesgloseTarjeta {
  id: number
  nombre: string
  codigo: string
  color: string
  total: number
  porcentaje: number
}

export interface ItemHistorial extends PeriodoRango {
  totalGastado: number
  gastoTarjetaA: number
  gastoTarjetaB: number
  desgloseTarjetas: ItemHistorialDesgloseTarjeta[]
  cantidadGastos: number
  tieneIngreso: boolean
  totalIngreso: number
  ahorro: number | null
  limite: number
  tienePresupuestoPersonalizado: boolean
  porcentajeLimite: number
  cumpleLimite: boolean
}

export default defineEventHandler(async (event) => {
  await initDatabase()
  const query = getQuery(event)
  const mesesAtras = Math.min(12, Math.max(1, Number(query.meses || 6)))

  const configList = await db.select().from(configuracion)
  const config = configList[0] || {
    dia_objetivo_nomina: 26,
    limite_gasto_periodo: 15000
  }

  const listaTarjetas = await db.select().from(tarjetas)
  const mapTarjetas = new Map(listaTarjetas.map(t => [t.id, t]))

  // Obtener presupuestos personalizados por período
  const listaPresupuestos = await db.select().from(presupuestosPeriodo)
  const mapPresupuestos = new Map(listaPresupuestos.map(p => [p.periodo_inicio, p.limite]))

  // Obtener fecha base hoy o consultada
  const fechaBase = (query.fecha as string) || new Date().toISOString().slice(0, 10)

  // Obtener todos los gastos para agrupar por período de nómina
  const todosLosGastos = await db.select()
    .from(gastos)
    .orderBy(desc(gastos.fecha), desc(gastos.id))

  // Generar lista de los últimos N períodos consecutivos sin saltos
  const listaRangos = generarHistorialPeriodos(fechaBase, mesesAtras, config.dia_objetivo_nomina)
  const periodos: ItemHistorial[] = []

  for (const pInfo of listaRangos) {
    const gastosPeriodo = todosLosGastos.filter(g => {
      const t = mapTarjetas.get(g.tarjeta_id)
      return perteneceAlPeriodoNomina(g.fecha, t, pInfo, config.dia_objetivo_nomina)
    })

    let gastoTarjetaA = 0
    let gastoTarjetaB = 0
    let totalGastado = 0
    const mapGastosTarjeta = new Map<number, number>()

    for (const g of gastosPeriodo) {
      totalGastado += g.monto
      mapGastosTarjeta.set(g.tarjeta_id, (mapGastosTarjeta.get(g.tarjeta_id) || 0) + g.monto)
      const t = mapTarjetas.get(g.tarjeta_id)
      if (t?.es_principal || t?.codigo === 'A') gastoTarjetaA += g.monto
      else gastoTarjetaB += g.monto
    }

    const desgloseTarjetas = listaTarjetas.map(t => {
      const total = mapGastosTarjeta.get(t.id) || 0
      return {
        id: t.id,
        nombre: t.nombre,
        codigo: t.codigo,
        color: t.color || 'emerald',
        es_principal: Boolean(t.es_principal),
        total,
        porcentaje: totalGastado > 0 ? Math.round((total / totalGastado) * 100) : 0
      }
    })

    // Obtener ingresos de ese período
    const ingresosPeriodo = await db.select()
      .from(ingresos)
      .where(
        and(
          gte(ingresos.fecha, pInfo.inicio),
          lte(ingresos.fecha, pInfo.fin)
        )
      )

    const totalIngreso = ingresosPeriodo.reduce((acc, ing) => acc + ing.monto, 0)
    const tieneIngreso = ingresosPeriodo.length > 0
    const ahorro = tieneIngreso ? (totalIngreso - totalGastado) : null

    // Presupuesto específico del período o fallback al global
    const limiteCustom = mapPresupuestos.get(pInfo.inicio)
    const tienePresupuestoPersonalizado = limiteCustom !== undefined
    const limite = tienePresupuestoPersonalizado ? limiteCustom : config.limite_gasto_periodo

    const porcentajeLimite = limite > 0 ? Math.round((totalGastado / limite) * 100) : 0

    periodos.push({
      ...pInfo,
      totalGastado,
      gastoTarjetaA,
      gastoTarjetaB,
      desgloseTarjetas,
      cantidadGastos: gastosPeriodo.length,
      tieneIngreso,
      totalIngreso,
      ahorro,
      limite,
      tienePresupuestoPersonalizado,
      porcentajeLimite,
      cumpleLimite: totalGastado <= limite
    })
  }

  return {
    periodos
  }
})
