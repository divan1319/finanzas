import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cuentas, gastos, liquidacionesTarjeta, movimientosCuenta, reconciliaciones, tarjetas } from '../server/db/schema'
import { ciclosCerradosAnteriores } from '../shared/utils/cicloFinanciero'

const readBody = vi.fn()
const getRouterParam = vi.fn()
const getQuery = vi.fn()
let database: typeof import('../server/db')

beforeAll(async () => {
  vi.stubEnv('TURSO_DATABASE_URL', 'file::memory:')
  vi.stubEnv('TURSO_AUTH_TOKEN', '')
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('readBody', readBody)
  vi.stubGlobal('getRouterParam', getRouterParam)
  vi.stubGlobal('getQuery', getQuery)
  vi.stubGlobal('createError', (error: { statusCode: number, statusMessage: string }) => Object.assign(new Error(error.statusMessage), error))
  database = await import('../server/db')
  await database.initDatabase()
})

beforeEach(async () => {
  await database.db.delete(liquidacionesTarjeta)
  await database.db.delete(movimientosCuenta)
  await database.db.delete(gastos)
  await database.db.delete(reconciliaciones)
  await database.db.delete(cuentas)
  await database.db.insert(cuentas).values({
    nombre: 'Cuenta Principal',
    banco: 'Banco Central',
    saldo_inicial: 2000,
    es_principal: true,
    color: 'emerald',
    created_at: '2026-10-01T10:00:00Z'
  })
})

afterEach(() => vi.clearAllMocks())
afterAll(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('Verificación y Liquidación de Ciclos de Tarjetas', () => {
  it('ciclosCerradosAnteriores solo devuelve ciclos ya cerrados y excluye el ciclo abierto en curso', () => {
    // El día 5 de noviembre sigue abierto el ciclo 2026-10-06 al 2026-11-05
    const cerradosDiaCorte = ciclosCerradosAnteriores(5, '2026-11-05', 2)
    expect(cerradosDiaCorte[0]).toMatchObject({ inicio: '2026-09-06', fin: '2026-10-05' })

    // El día 6 de noviembre ya cerró el ciclo 2026-10-06 al 2026-11-05
    const cerradosDiaSiguiente = ciclosCerradosAnteriores(5, '2026-11-06', 2)
    expect(cerradosDiaSiguiente[0]).toMatchObject({ inicio: '2026-10-06', fin: '2026-11-05' })
  })

  it('detecta ciclos cerrados pendientes, prioriza total_banco si está reconciliado y descuenta o omite correctamente', async () => {
    const { default: getPendientes } = await import('../server/api/cuentas/ciclos-pendientes.get')
    const { default: liquidarCiclo } = await import('../server/api/cuentas/liquidar-ciclo.post')
    const { default: getCuentas } = await import('../server/api/cuentas/index.get')
    const { default: deleteMov } = await import('../server/api/cuentas/movimientos/[id].delete')

    const listaTarjetas = await database.db.select().from(tarjetas)
    const tarjetaA = listaTarjetas.find(t => t.dia_corte === 5)!
    const tarjetaB = listaTarjetas.find(t => t.dia_corte === 9)!

    // Gastos en ciclo cerrado de Tarjeta A (2026-10-06 al 2026-11-05)
    await database.db.insert(gastos).values([
      { tarjeta_id: tarjetaA.id, fecha: '2026-10-15', monto: 120, descripcion: 'Super', categoria: 'Alimentos', created_at: '2026-10-15T12:00:00Z' },
      { tarjeta_id: tarjetaA.id, fecha: '2026-11-02', monto: 80, descripcion: 'Gasolina', categoria: 'Transporte', created_at: '2026-11-02T12:00:00Z' },
      // Gasto en ciclo aún abierto de Tarjeta A (no debe salir como cerrado)
      { tarjeta_id: tarjetaA.id, fecha: '2026-11-08', monto: 99, descripcion: 'Gasto abierto', categoria: 'General', created_at: '2026-11-08T12:00:00Z' },
      // Gasto en ciclo cerrado de Tarjeta B (2026-10-10 al 2026-11-09)
      { tarjeta_id: tarjetaB.id, fecha: '2026-10-20', monto: 300, descripcion: 'Compra B', categoria: 'Compras', created_at: '2026-10-20T12:00:00Z' }
    ])

    // Reconciliación para Tarjeta A con diferencia de banco (205 vs 200 app)
    await database.db.insert(reconciliaciones).values({
      tarjeta_id: tarjetaA.id,
      ciclo_inicio: '2026-10-06',
      ciclo_fin: '2026-11-05',
      total_banco: 205,
      total_app_calculado: 200,
      diferencia: 5,
      fecha_registro: '2026-11-06T12:00:00Z'
    })

    getQuery.mockReturnValue({ fecha: '2026-11-10' })
    const resPendientes = await getPendientes({} as Parameters<typeof getPendientes>[0])
    expect(resPendientes.ciclos).toHaveLength(2)

    const cicloA = resPendientes.ciclos.find(c => c.tarjeta.id === tarjetaA.id)!
    const cicloB = resPendientes.ciclos.find(c => c.tarjeta.id === tarjetaB.id)!
    expect(cicloA.total_app).toBe(200)
    expect(cicloA.total_banco).toBe(205)
    expect(cicloA.monto_sugerido).toBe(205)
    expect(cicloA.reconciliado).toBe(true)

    expect(cicloB.total_app).toBe(300)
    expect(cicloB.monto_sugerido).toBe(300)
    expect(cicloB.reconciliado).toBe(false)

    // 1. Pagar ciclo A (descuenta 205 de Cuenta Principal)
    readBody.mockResolvedValue({
      tarjeta_id: tarjetaA.id,
      ciclo_inicio: cicloA.ciclo_inicio,
      ciclo_fin: cicloA.ciclo_fin,
      accion: 'pagar',
      monto: 205,
      fecha_pago: '2026-11-10'
    })
    const pagoA = await liquidarCiclo({} as Parameters<typeof liquidarCiclo>[0])
    expect(pagoA.estado).toBe('pagado')
    expect((await getCuentas({} as Parameters<typeof getCuentas>[0])).cuentaPrincipal?.saldo_actual).toBe(1795)

    // Prevenir doble liquidación del mismo ciclo
    await expect(liquidarCiclo({} as Parameters<typeof liquidarCiclo>[0])).rejects.toMatchObject({ statusCode: 409 })

    // 2. Omitir ciclo B (no descuenta saldo)
    readBody.mockResolvedValue({
      tarjeta_id: tarjetaB.id,
      ciclo_inicio: cicloB.ciclo_inicio,
      ciclo_fin: cicloB.ciclo_fin,
      accion: 'omitir',
      fecha_pago: '2026-11-10'
    })
    const omitirB = await liquidarCiclo({} as Parameters<typeof liquidarCiclo>[0])
    expect(omitirB.estado).toBe('omitido')
    expect((await getCuentas({} as Parameters<typeof getCuentas>[0])).cuentaPrincipal?.saldo_actual).toBe(1795)

    // Ya no quedan ciclos pendientes
    const trasProcesar = await getPendientes({} as Parameters<typeof getPendientes>[0])
    expect(trasProcesar.ciclos).toHaveLength(0)

    // Si se borra el movimiento de pago del ciclo A, se restaura el saldo y vuelve a estar pendiente
    getRouterParam.mockReturnValue(String(pagoA.movimiento!.id))
    await deleteMov({} as Parameters<typeof deleteMov>[0])
    expect((await getCuentas({} as Parameters<typeof getCuentas>[0])).cuentaPrincipal?.saldo_actual).toBe(2000)
    const trasRevertir = await getPendientes({} as Parameters<typeof getPendientes>[0])
    expect(trasRevertir.ciclos).toHaveLength(1)
    expect(trasRevertir.ciclos[0]?.tarjeta.id).toBe(tarjetaA.id)
  })
})
