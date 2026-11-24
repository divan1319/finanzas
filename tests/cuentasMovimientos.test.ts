import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { cuentas, gastos, ingresos, liquidacionesTarjeta, movimientosCuenta, reconciliaciones, tarjetas } from '../server/db/schema'

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
  await database.db.delete(ingresos)
  await database.db.delete(reconciliaciones)
  await database.db.delete(cuentas)
  await database.db.insert(cuentas).values({
    nombre: 'Cuenta Principal',
    banco: 'Banco Central',
    saldo_inicial: 1000,
    es_principal: true,
    color: 'emerald',
    created_at: '2026-11-01T10:00:00Z'
  })
  getQuery.mockReturnValue({ fecha: '2026-11-15' })
})

afterEach(() => vi.clearAllMocks())
afterAll(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('Cuentas, Movimientos de Saldo y Sincronización', () => {
  it('mantiene exclusividad de cuenta principal y bloquea eliminación si hay movimientos', async () => {
    const { default: getCuentas } = await import('../server/api/cuentas/index.get')
    const { default: createCuenta } = await import('../server/api/cuentas/index.post')
    const { default: updateCuenta } = await import('../server/api/cuentas/[id].put')
    const { default: deleteCuenta } = await import('../server/api/cuentas/[id].delete')
    const { default: createMov } = await import('../server/api/cuentas/movimientos/index.post')

    const inicial = await getCuentas({} as Parameters<typeof getCuentas>[0])
    expect(inicial.cuentas).toHaveLength(1)
    expect(inicial.cuentaPrincipal?.nombre).toBe('Cuenta Principal')
    expect(inicial.cuentaPrincipal?.saldo_actual).toBe(1000)

    readBody.mockResolvedValue({ nombre: 'Cuenta Ahorros', banco: 'Banco B', saldo_inicial: 500, es_principal: true, color: 'sky' })
    const creada = await createCuenta({} as Parameters<typeof createCuenta>[0])
    expect(creada.cuenta?.es_principal).toBe(true)

    const trasCrear = await getCuentas({} as Parameters<typeof getCuentas>[0])
    expect(trasCrear.cuentas).toHaveLength(2)
    expect(trasCrear.cuentaPrincipal?.id).toBe(creada.cuenta?.id)
    expect(trasCrear.saldo_total).toBe(1500)

    // Volver a marcar la primera como principal
    const primera = trasCrear.cuentas.find(c => c.nombre === 'Cuenta Principal')!
    getRouterParam.mockReturnValue(String(primera.id))
    readBody.mockResolvedValue({ es_principal: true })
    await updateCuenta({} as Parameters<typeof updateCuenta>[0])

    const trasSwitch = await getCuentas({} as Parameters<typeof getCuentas>[0])
    expect(trasSwitch.cuentaPrincipal?.id).toBe(primera.id)
    expect(trasSwitch.cuentas.filter(c => c.es_principal)).toHaveLength(1)

    // Registrar movimiento en la segunda cuenta e intentar eliminarla -> debe fallar
    readBody.mockResolvedValue({
      tipo: 'entrada',
      cuenta_id: creada.cuenta!.id,
      categoria: 'bono',
      monto: 200,
      fecha: '2026-11-10',
      descripcion: 'Bono extra'
    })
    await createMov({} as Parameters<typeof createMov>[0])

    getRouterParam.mockReturnValue(String(creada.cuenta!.id))
    await expect(deleteCuenta({} as Parameters<typeof deleteCuenta>[0])).rejects.toMatchObject({ statusCode: 400 })
  })

  it('calcula saldo exacto con entradas, salidas y traspasos entre cuentas propias (incluyendo borrado en par)', async () => {
    const { default: getCuentas } = await import('../server/api/cuentas/index.get')
    const { default: createCuenta } = await import('../server/api/cuentas/index.post')
    const { default: createMov } = await import('../server/api/cuentas/movimientos/index.post')
    const { default: deleteMov } = await import('../server/api/cuentas/movimientos/[id].delete')

    const { cuentaPrincipal } = await getCuentas({} as Parameters<typeof getCuentas>[0])
    readBody.mockResolvedValue({ nombre: 'Billetera Efectivo', saldo_inicial: 100, es_principal: false })
    const { cuenta: cuentaDestino } = await createCuenta({} as Parameters<typeof createCuenta>[0])

    // Entrada manual (aguinaldo)
    readBody.mockResolvedValue({
      tipo: 'entrada',
      cuenta_id: cuentaPrincipal!.id,
      categoria: 'aguinaldo',
      monto: 600,
      fecha: '2026-11-10',
      descripcion: 'Aguinaldo anual'
    })
    await createMov({} as Parameters<typeof createMov>[0])

    // Salida manual (retiro efectivo)
    readBody.mockResolvedValue({
      tipo: 'salida',
      cuenta_id: cuentaPrincipal!.id,
      categoria: 'retiro_efectivo',
      monto: 150,
      fecha: '2026-11-11',
      descripcion: 'Retiro cajero'
    })
    await createMov({} as Parameters<typeof createMov>[0])

    // Traspaso entre cuentas propias (300 de principal a billetera)
    readBody.mockResolvedValue({
      tipo: 'salida',
      cuenta_id: cuentaPrincipal!.id,
      categoria: 'transferencia',
      monto: 300,
      fecha: '2026-11-12',
      descripcion: 'Traspaso a efectivo',
      es_traspaso_propio: true,
      cuenta_destino_id: cuentaDestino!.id
    })
    const traspaso = await createMov({} as Parameters<typeof createMov>[0])
    expect(traspaso.movimiento.transferencia_par_id).toBe(traspaso.movimientoDestino?.id)

    const estado = await getCuentas({} as Parameters<typeof getCuentas>[0])
    const cta1 = estado.cuentas.find(c => c.id === cuentaPrincipal!.id)!
    const cta2 = estado.cuentas.find(c => c.id === cuentaDestino!.id)!
    expect(cta1.saldo_actual).toBe(1150) // 1000 + 600 - 150 - 300
    expect(cta2.saldo_actual).toBe(400) // 100 + 300

    // Borrar un lado del traspaso elimina ambos extremos
    getRouterParam.mockReturnValue(String(traspaso.movimiento.id))
    await deleteMov({} as Parameters<typeof deleteMov>[0])

    const trasBorrar = await getCuentas({} as Parameters<typeof getCuentas>[0])
    expect(trasBorrar.cuentas.find(c => c.id === cuentaPrincipal!.id)?.saldo_actual).toBe(1450)
    expect(trasBorrar.cuentas.find(c => c.id === cuentaDestino!.id)?.saldo_actual).toBe(100)
  })

  it('sincroniza nóminas con la cuenta seleccionada sin mezclar bonos/aguinaldos en ahorro del período', async () => {
    const { default: createIngreso } = await import('../server/api/ingresos/index.post')
    const { default: updateIngreso } = await import('../server/api/ingresos/[id].put')
    const { default: deleteIngreso } = await import('../server/api/ingresos/[id].delete')
    const { default: createMov } = await import('../server/api/cuentas/movimientos/index.post')
    const { default: getCuentas } = await import('../server/api/cuentas/index.get')
    const { default: getDashboard } = await import('../server/api/dashboard.get')

    // Crear nómina sin especificar cuenta -> usa cuenta principal
    readBody.mockResolvedValue({ fecha: '2026-11-05', monto: 2000, descripcion: 'Nómina Nov' })
    const resIngreso = await createIngreso({} as Parameters<typeof createIngreso>[0])
    expect(resIngreso.ingreso.cuenta_id).toBeTruthy()

    // Agregar un bono manual a la cuenta principal
    readBody.mockResolvedValue({
      tipo: 'entrada',
      categoria: 'bono',
      monto: 500,
      fecha: '2026-11-10',
      descripcion: 'Bono desempeño'
    })
    await createMov({} as Parameters<typeof createMov>[0])

    let estado = await getCuentas({} as Parameters<typeof getCuentas>[0])
    expect(estado.cuentaPrincipal?.saldo_actual).toBe(3500) // 1000 + 2000 + 500

    // Dashboard ahorro sigue midiendo solo Nómina (2000), no el bono (500) ni saldo inicial (1000)
    getQuery.mockReturnValue({ fecha: '2026-11-15' })
    const dash = await getDashboard({} as Parameters<typeof getDashboard>[0])
    expect(dash.resumenAhorro.totalIngreso).toBe(2000)
    expect(dash.resumenAhorro.ahorro).toBe(2000)
    expect(dash.resumenCuentas.cuentaPrincipal?.saldo_actual).toBe(3500)

    // Editar nómina a 2200
    getRouterParam.mockReturnValue(String(resIngreso.ingreso.id))
    readBody.mockResolvedValue({ fecha: '2026-11-05', monto: 2200, descripcion: 'Nómina Ajustada' })
    await updateIngreso({} as Parameters<typeof updateIngreso>[0])
    estado = await getCuentas({} as Parameters<typeof getCuentas>[0])
    expect(estado.cuentaPrincipal?.saldo_actual).toBe(3700)

    // Eliminar nómina revierte el abono en cuenta
    getRouterParam.mockReturnValue(String(resIngreso.ingreso.id))
    await deleteIngreso({} as Parameters<typeof deleteIngreso>[0])
    estado = await getCuentas({} as Parameters<typeof getCuentas>[0])
    expect(estado.cuentaPrincipal?.saldo_actual).toBe(1500)
  })

  it('abona a cuenta al registrar gasto de tarjeta con aporta_cuenta (soportando comisión) y sincroniza al editar/eliminar', async () => {
    const { default: createGasto } = await import('../server/api/gastos/index.post')
    const { default: updateGasto } = await import('../server/api/gastos/[id].put')
    const { default: deleteGasto } = await import('../server/api/gastos/[id].delete')
    const { default: getCuentas } = await import('../server/api/cuentas/index.get')

    const listaTarjetas = await database.db.select().from(tarjetas)
    const tarjetaA = listaTarjetas[0]!

    // Retiro de efectivo en tarjeta: 105 en tarjeta (5 de comisión), 100 entran a Cuenta Principal
    readBody.mockResolvedValue({
      tarjeta_id: tarjetaA.id,
      fecha: '2026-11-12',
      monto: 105,
      descripcion: 'Retiro de efectivo',
      categoria: 'Otros',
      aporta_cuenta: true,
      monto_cuenta: 100
    })
    const creado = await createGasto({} as Parameters<typeof createGasto>[0])
    expect(creado.gasto.aporta_cuenta).toBe(true)
    expect(creado.gasto.monto).toBe(105)
    expect(creado.gasto.monto_cuenta).toBe(100)

    let estado = await getCuentas({} as Parameters<typeof getCuentas>[0])
    expect(estado.cuentaPrincipal?.saldo_actual).toBe(1100) // 1000 + 100

    // Editar monto_cuenta a 150
    getRouterParam.mockReturnValue(String(creado.gasto.id))
    readBody.mockResolvedValue({ monto: 155, monto_cuenta: 150 })
    await updateGasto({} as Parameters<typeof updateGasto>[0])
    estado = await getCuentas({} as Parameters<typeof getCuentas>[0])
    expect(estado.cuentaPrincipal?.saldo_actual).toBe(1150)

    // Apagar aporta_cuenta elimina el abono
    getRouterParam.mockReturnValue(String(creado.gasto.id))
    readBody.mockResolvedValue({ aporta_cuenta: false })
    await updateGasto({} as Parameters<typeof updateGasto>[0])
    estado = await getCuentas({} as Parameters<typeof getCuentas>[0])
    expect(estado.cuentaPrincipal?.saldo_actual).toBe(1000)

    // Volver a activar y luego eliminar gasto
    getRouterParam.mockReturnValue(String(creado.gasto.id))
    readBody.mockResolvedValue({ aporta_cuenta: true, monto_cuenta: 80 })
    await updateGasto({} as Parameters<typeof updateGasto>[0])
    expect((await getCuentas({} as Parameters<typeof getCuentas>[0])).cuentaPrincipal?.saldo_actual).toBe(1080)

    getRouterParam.mockReturnValue(String(creado.gasto.id))
    await deleteGasto({} as Parameters<typeof deleteGasto>[0])
    expect((await getCuentas({} as Parameters<typeof getCuentas>[0])).cuentaPrincipal?.saldo_actual).toBe(1000)
    expect(await database.db.select().from(movimientosCuenta).where(eq(movimientosCuenta.gasto_id, creado.gasto.id))).toHaveLength(0)
  })
})
