import { eq } from 'drizzle-orm'
import { db } from '../db'
import {
  configuracion,
  cuentas,
  gastos,
  liquidacionesTarjeta,
  movimientosCuenta,
  reconciliaciones,
  tarjetas
} from '../db/schema'
import {
  calcularPeriodoPagoGasto,
  ciclosCerradosAnteriores
} from '#shared/utils/cicloFinanciero'
import { fechaElSalvador } from '#shared/utils/fechaElSalvador'
import type { CicloPendientePago, CuentaConSaldo } from '#shared/types/cuenta'

export function roundMoney(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100
}

export function validarFechaISO(fecha: unknown, label = 'fecha'): string {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw createError({ statusCode: 400, statusMessage: `La ${label} debe tener el formato AAAA-MM-DD` })
  }
  const fechaDate = new Date(`${fecha}T12:00:00Z`)
  if (Number.isNaN(fechaDate.getTime()) || fechaDate.toISOString().slice(0, 10) !== fecha) {
    throw createError({ statusCode: 400, statusMessage: `La ${label} no es válida` })
  }
  return fecha
}

export async function obtenerCuentaPrincipal() {
  const lista = (await db.select().from(cuentas)) ?? []
  if (lista.length === 0) return null
  return lista.find(c => Boolean(c.es_principal)) ?? lista[0] ?? null
}

export async function obtenerCuentasConSaldo(): Promise<{
  cuentas: CuentaConSaldo[]
  cuentaPrincipal: CuentaConSaldo | null
  saldo_total: number
}> {
  const listaCuentas = (await db.select().from(cuentas)) ?? []
  const todosMovimientos = (await db.select().from(movimientosCuenta)) ?? []

  const acumulados = new Map<number, { entradas: number, salidas: number, count: number }>()

  for (const mov of todosMovimientos) {
    const actual = acumulados.get(mov.cuenta_id) ?? { entradas: 0, salidas: 0, count: 0 }
    if (mov.tipo === 'entrada') {
      actual.entradas += mov.monto
    } else if (mov.tipo === 'salida') {
      actual.salidas += mov.monto
    }
    actual.count += 1
    acumulados.set(mov.cuenta_id, actual)
  }

  const cuentasConSaldo: CuentaConSaldo[] = listaCuentas
    .map((c) => {
      const stats = acumulados.get(c.id) ?? { entradas: 0, salidas: 0, count: 0 }
      const totalEntradas = roundMoney(stats.entradas)
      const totalSalidas = roundMoney(stats.salidas)
      const saldoActual = roundMoney(c.saldo_inicial + totalEntradas - totalSalidas)

      return {
        id: c.id,
        nombre: c.nombre,
        banco: c.banco,
        saldo_inicial: roundMoney(c.saldo_inicial),
        es_principal: Boolean(c.es_principal),
        color: c.color || 'emerald',
        created_at: c.created_at,
        total_entradas: totalEntradas,
        total_salidas: totalSalidas,
        saldo_actual: saldoActual,
        cantidad_movimientos: stats.count
      }
    })
    .sort((a, b) => Number(b.es_principal) - Number(a.es_principal) || a.id - b.id)

  const cuentaPrincipal = cuentasConSaldo.find(c => c.es_principal) ?? cuentasConSaldo[0] ?? null
  const saldoTotal = roundMoney(cuentasConSaldo.reduce((acc, c) => acc + c.saldo_actual, 0))

  return {
    cuentas: cuentasConSaldo,
    cuentaPrincipal,
    saldo_total: saldoTotal
  }
}

export async function verificarCuentaExiste(cuentaId: number) {
  const rows = (await db.select().from(cuentas).where(eq(cuentas.id, cuentaId))) ?? []
  return rows[0] ?? null
}

interface DatosCiclosPrefetched {
  diaObjetivoNomina?: number
  listaTarjetas?: Array<typeof tarjetas.$inferSelect>
  todosGastos?: Array<typeof gastos.$inferSelect>
}

export async function obtenerCiclosPendientesTarjetas(
  fechaConsulta?: string,
  prefetched?: DatosCiclosPrefetched
): Promise<CicloPendientePago[]> {
  const fecha = fechaConsulta || fechaElSalvador()

  let diaObjetivoNomina = prefetched?.diaObjetivoNomina
  if (diaObjetivoNomina === undefined) {
    const configList = (await db.select().from(configuracion)) ?? []
    diaObjetivoNomina = configList[0]?.dia_objetivo_nomina ?? 26
  }

  const listaTarjetas = prefetched?.listaTarjetas ?? (await db.select().from(tarjetas)) ?? []
  const todosGastos = prefetched?.todosGastos ?? (await db.select().from(gastos)) ?? []
  const todasReconciliaciones = (await db.select().from(reconciliaciones)) ?? []
  const todasLiquidaciones = (await db.select().from(liquidacionesTarjeta)) ?? []

  const liquidacionesSet = new Set(
    todasLiquidaciones.map(l => `${l.tarjeta_id}:${l.ciclo_inicio}:${l.ciclo_fin}`)
  )
  const reconciliacionesMap = new Map(
    todasReconciliaciones.map(r => [`${r.tarjeta_id}:${r.ciclo_inicio}:${r.ciclo_fin}`, r])
  )

  const pendientes: CicloPendientePago[] = []

  for (const tarjeta of listaTarjetas) {
    const cerrados = ciclosCerradosAnteriores(tarjeta.dia_corte, fecha, 6)

    for (const ciclo of cerrados) {
      const clave = `${tarjeta.id}:${ciclo.inicio}:${ciclo.fin}`
      if (liquidacionesSet.has(clave)) continue

      const gastosCiclo = todosGastos.filter(
        g => g.tarjeta_id === tarjeta.id && g.fecha >= ciclo.inicio && g.fecha <= ciclo.fin
      )
      const totalApp = roundMoney(gastosCiclo.reduce((acc, g) => acc + g.monto, 0))
      const reconciliacion = reconciliacionesMap.get(clave)

      if (totalApp <= 0 && (!reconciliacion || reconciliacion.total_banco <= 0)) {
        continue
      }

      const infoPago = calcularPeriodoPagoGasto(ciclo.fin, tarjeta, diaObjetivoNomina)
      const totalBanco = reconciliacion ? roundMoney(reconciliacion.total_banco) : null
      const montoSugerido = totalBanco !== null ? totalBanco : totalApp

      pendientes.push({
        tarjeta: {
          id: tarjeta.id,
          codigo: tarjeta.codigo,
          nombre: tarjeta.nombre,
          dia_corte: tarjeta.dia_corte,
          dia_pago_propio_tipo: tarjeta.dia_pago_propio_tipo,
          es_principal: Boolean(tarjeta.es_principal),
          color: tarjeta.color
        },
        ciclo_inicio: ciclo.inicio,
        ciclo_fin: ciclo.fin,
        etiqueta: ciclo.etiqueta,
        cantidad_gastos: gastosCiclo.length,
        total_app: totalApp,
        reconciliado: Boolean(reconciliacion),
        total_banco: totalBanco,
        monto_sugerido: montoSugerido,
        fecha_pago_estimada: infoPago.fechaPagoEstimada,
        pago_vencido_o_hoy: infoPago.fechaPagoEstimada <= fecha
      })
    }
  }

  return pendientes.sort((a, b) => b.ciclo_fin.localeCompare(a.ciclo_fin) || a.tarjeta.id - b.tarjeta.id)
}
