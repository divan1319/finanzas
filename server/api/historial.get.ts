import { db, initDatabase } from '../db'
import { configuracion, gastos, ingresos, tarjetas } from '../db/schema'
import { periodoActual } from '#shared/utils/cicloFinanciero'
import { and, gte, lte } from 'drizzle-orm'

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
  const [baseY, baseM, baseD] = fechaBase.split('-').map(Number)

  // Generar lista de los últimos N períodos
  const periodos = []
  const hoyDate = new Date(baseY, baseM - 1, baseD, 12, 0, 0)

  let iterDate = new Date(hoyDate.getTime())

  for (let i = 0; i < mesesAtras; i++) {
    const pInfo = periodoActual(iterDate, config.dia_objetivo_nomina)

    // Evitar duplicados
    const existe = periodos.find(p => p.inicio === pInfo.inicio)
    if (!existe) {
      // Obtener gastos de ese período
      const gastosPeriodo = await db.select()
        .from(gastos)
        .where(
          and(
            gte(gastos.fecha, pInfo.inicio),
            lte(gastos.fecha, pInfo.fin)
          )
        )

      let gastoTarjetaA = 0
      let gastoTarjetaB = 0
      let totalGastado = 0

      for (const g of gastosPeriodo) {
        totalGastado += g.monto
        const t = mapTarjetas.get(g.tarjeta_id)
        if (t?.codigo === 'A') gastoTarjetaA += g.monto
        else if (t?.codigo === 'B') gastoTarjetaB += g.monto
      }

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
    const [pY, pM] = pInfo.inicio.split('-').map(Number)
    const prevMonth = pM === 1 ? 12 : pM - 1
    const prevYear = pM === 1 ? pY - 1 : pY
    iterDate = new Date(prevYear, prevMonth - 1, 10, 12, 0, 0)
  }

  return {
    periodos
  }
})
