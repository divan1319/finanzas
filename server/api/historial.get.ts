import { db, initDatabase } from '../db'
import { configuracion, gastos, ingresos, tarjetas } from '../db/schema'
import {
  periodoActual,
  calcularPeriodoPagoGasto,
  formatDateISO,
  parseISODate,
  type PeriodoRango
} from '#shared/utils/cicloFinanciero'
import { and, gte, lte } from 'drizzle-orm'

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

  // Obtener fecha base hoy o consultada
  const fechaBase = (query.fecha as string) || new Date().toISOString().slice(0, 10)
  const [baseY = 2026, baseM = 1, baseD = 1] = fechaBase.split('-').map(Number)

  // Generar lista de los últimos N períodos
  const periodos: ItemHistorial[] = []
  const hoyDate = new Date(baseY, baseM - 1, baseD, 12, 0, 0)

  let iterDate = new Date(hoyDate.getTime())

  for (let i = 0; i < mesesAtras; i++) {
    const pInfo = periodoActual(iterDate, config.dia_objetivo_nomina)

    // Evitar duplicados
    const existe = periodos.find(p => p.inicio === pInfo.inicio)
    if (!existe) {
      // Obtener gastos alrededor del período (rango amplio de 60 días para agrupar por ciclo de pago)
      const pInitDate = parseISODate(pInfo.inicio)
      const pSearchStart = formatDateISO(new Date(pInitDate.getFullYear(), pInitDate.getMonth() - 2, 1, 12, 0, 0))
      const pSearchEnd = formatDateISO(new Date(pInitDate.getFullYear(), pInitDate.getMonth() + 2, 28, 12, 0, 0))

      const todosGastosPeriodo = await db.select()
        .from(gastos)
        .where(
          and(
            gte(gastos.fecha, pSearchStart),
            lte(gastos.fecha, pSearchEnd)
          )
        )

      const gastosPeriodo: Array<typeof gastos.$inferSelect> = []
      for (const g of todosGastosPeriodo) {
        const t = mapTarjetas.get(g.tarjeta_id)
        if (t) {
          const pCalc = calcularPeriodoPagoGasto(g.fecha, t, config.dia_objetivo_nomina)
          if (pCalc.nominaPago.fechaNomina === pInfo.inicio) {
            gastosPeriodo.push(g)
          }
        } else {
          if (g.fecha >= pInfo.inicio && g.fecha <= pInfo.fin) {
            gastosPeriodo.push(g)
          }
        }
      }

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
      const limite = config.limite_gasto_periodo
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
        porcentajeLimite,
        cumpleLimite: totalGastado <= limite
      })
    }

    // Retroceder un mes antes del inicio del período actual
    const [pY = 2026, pM = 1] = pInfo.inicio.split('-').map(Number)
    const prevMonth = pM === 1 ? 12 : pM - 1
    const prevYear = pM === 1 ? pY - 1 : pY
    iterDate = new Date(prevYear, prevMonth - 1, 10, 12, 0, 0)
  }

  return {
    periodos
  }
})
