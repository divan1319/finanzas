import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { select, initDatabase, getQuery } = vi.hoisted(() => ({
  select: vi.fn(), initDatabase: vi.fn(), getQuery: vi.fn()
}))
vi.mock('../server/db', () => ({ db: { select }, initDatabase }))

const tarjetas = [
  { id: 1, codigo: 'A', nombre: 'Principal', dia_corte: 5, dia_pago_propio_tipo: 'dia_siguiente_corte', es_principal: true },
  { id: 2, codigo: 'B', nombre: 'Secundaria', dia_corte: 9, dia_pago_propio_tipo: 'dia_nomina', es_principal: false }
]

function prepararConsultas(gastos: Array<{ id: number, fecha: string, monto: number, tarjeta_id: number }>, limite = 200) {
  const resultados: unknown[][] = [
    [{ dia_objetivo_nomina: 26, limite_gasto_periodo: 1000 }],
    tarjetas,
    [{ limite }],
    gastos,
    []
  ]
  select.mockImplementation(() => {
    const consulta = Object.assign(Promise.resolve(resultados.shift()), {
      from: () => consulta,
      where: () => consulta,
      orderBy: () => consulta
    })
    return consulta
  })
}

async function consultarDashboard() {
  const { default: handler } = await import('../server/api/dashboard.get')
  return handler({} as Parameters<typeof handler>[0])
}

beforeEach(() => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getQuery', getQuery)
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-17T05:30:00Z')) // Todavía es 16 en El Salvador.
  getQuery.mockReturnValue({})
  prepararConsultas([])
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Resumen diario del dashboard', () => {
  it('usa la fecha salvadoreña aunque UTC ya esté en el día siguiente', async () => {
    const dashboard = await consultarDashboard()
    expect(dashboard.fechaConsulta).toBe('2026-11-16')
    expect(dashboard.resumenGasto.limite).toBe(200)
    expect(dashboard.resumenDiario.presupuestoHoy).toBe(20)
  })

  it('respeta la fecha explícita, incluso en el último día del período', async () => {
    getQuery.mockReturnValue({ fecha: '2026-11-25' })
    const dashboard = await consultarDashboard()
    expect(dashboard.fechaConsulta).toBe('2026-11-25')
    expect(dashboard.periodo.diasRestantes).toBe(0)
    expect(dashboard.resumenDiario.disponibleHoy).toBe(200)
  })

  it('suma todos los gastos de hoy del ciclo y excluye los asignados a otra nómina', async () => {
    prepararConsultas([
      ...Array.from({ length: 7 }, (_, i) => ({ id: i + 1, fecha: '2026-11-16', monto: 1, tarjeta_id: 1 })),
      { id: 8, fecha: '2026-11-16', monto: 100, tarjeta_id: 2 }
    ])
    const dashboard = await consultarDashboard()
    expect(dashboard.ultimosGastos).toHaveLength(5)
    expect(dashboard.resumenGasto.totalGastado).toBe(7)
    expect(dashboard.resumenDiario).toEqual({
      presupuestoHoy: 20, gastadoHoy: 7, disponibleHoy: 13, excesoHoy: 0
    })
  })

  it('recalcula al actualizar, eliminar y mover un gasto a otro día o período', async () => {
    for (const [gastos, esperado] of [
      [[{ id: 1, fecha: '2026-11-16', monto: 12, tarjeta_id: 1 }], 8],
      [[], 20],
      [[{ id: 1, fecha: '2026-11-15', monto: 12, tarjeta_id: 1 }], 18.8],
      [[{ id: 1, fecha: '2026-11-16', monto: 12, tarjeta_id: 2 }], 20]
    ] as const) {
      prepararConsultas([...gastos])
      expect((await consultarDashboard()).resumenDiario.disponibleHoy).toBe(esperado)
    }
  })
})
