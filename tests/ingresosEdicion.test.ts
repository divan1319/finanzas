import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { ingresos } from '../server/db/schema'

const readBody = vi.fn()
const getRouterParam = vi.fn()
const getQuery = vi.fn()
let database: typeof import('../server/db')
let original: typeof ingresos.$inferSelect

beforeAll(async () => {
  // These endpoint tests never connect to the application's real database.
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
  await database.db.delete(ingresos)
  const rows = await database.db.insert(ingresos).values({
    fecha: '2026-11-09', monto: 1000, descripcion: 'Nómina original', fecha_registro: '2026-11-09T12:00:00Z'
  }).returning()
  original = rows[0]!
  readBody.mockResolvedValue({ fecha: '2026-11-09', monto: 1200, descripcion: '  Nómina corregida  ' })
  getRouterParam.mockReturnValue(String(original.id))
  getQuery.mockReturnValue({ fecha: '2026-11-09', meses: 2 })
})

afterEach(() => vi.clearAllMocks())
afterAll(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

async function actualizar() {
  const { default: handler } = await import('../server/api/ingresos/[id].put')
  return handler({} as Parameters<typeof handler>[0])
}

describe('Edición de nómina', () => {
  it('actualiza el registro existente y conserva su ID y fecha de registro', async () => {
    const result = await actualizar()
    expect(result.success).toBe(true)
    expect(result.ingreso).toEqual({ ...original, monto: 1200, descripcion: 'Nómina corregida' })
    expect(await database.db.select().from(ingresos)).toHaveLength(1)
  })

  it('acepta una fecha bisiesta real y usa Nómina para un concepto vacío', async () => {
    readBody.mockResolvedValue({ fecha: '2028-02-29', monto: '1500.25', descripcion: '  ' })
    expect((await actualizar()).ingreso).toMatchObject({ fecha: '2028-02-29', monto: 1500.25, descripcion: 'Nómina' })
  })

  it('recalcula ingreso y ahorro del dashboard y del historial', async () => {
    await actualizar()
    const { default: dashboard } = await import('../server/api/dashboard.get')
    const { default: historial } = await import('../server/api/historial.get')
    expect((await dashboard({} as Parameters<typeof dashboard>[0])).resumenAhorro).toMatchObject({ totalIngreso: 1200, ahorro: 1200 })
    expect((await historial({} as Parameters<typeof historial>[0])).periodos[0]).toMatchObject({ totalIngreso: 1200, ahorro: 1200 })
  })

  it('mueve la nómina al período correcto al cambiar su fecha', async () => {
    readBody.mockResolvedValue({ fecha: '2026-10-10', monto: 1200, descripcion: 'Nómina anterior' })
    await actualizar()
    const { default: dashboard } = await import('../server/api/dashboard.get')
    const { default: historial } = await import('../server/api/historial.get')
    expect((await dashboard({} as Parameters<typeof dashboard>[0])).resumenAhorro).toMatchObject({ tieneIngreso: false, totalIngreso: 0, ahorro: null })
    const resultado = await historial({} as Parameters<typeof historial>[0])
    expect(resultado.periodos[0]).toMatchObject({ totalIngreso: 0 })
    expect(resultado.periodos[1]).toMatchObject({ totalIngreso: 1200, ahorro: 1200 })
  })

  it('devuelve 404 para una nómina inexistente sin crear otra', async () => {
    getRouterParam.mockReturnValue('999999')
    await expect(actualizar()).rejects.toMatchObject({ statusCode: 404 })
    expect(await database.db.select().from(ingresos)).toEqual([original])
  })

  it.each(['0', '-1', '1.5', 'abc', 'Infinity', '9007199254740992', undefined])('rechaza el ID inválido %s', async (id) => {
    getRouterParam.mockReturnValue(id)
    await expect(actualizar()).rejects.toMatchObject({ statusCode: 400 })
  })

  it.each([
    null, [], 'nómina', {},
    { fecha: '2026-02-30', monto: 100 },
    { fecha: '2026-13-01', monto: 100 },
    { fecha: '09/11/2026', monto: 100 },
    { fecha: '2026-11-09', monto: 0 },
    { fecha: '2026-11-09', monto: -20 },
    { fecha: '2026-11-09', monto: Infinity },
    { fecha: '2026-11-09', monto: 'Infinity' },
    { fecha: '2026-11-09', monto: 'abc' },
    { fecha: '2026-11-09', monto: true },
    { fecha: '2026-11-09', monto: 100, descripcion: {} }
  ])('rechaza datos inválidos sin modificar la nómina: %j', async (body) => {
    readBody.mockResolvedValue(body)
    await expect(actualizar()).rejects.toMatchObject({ statusCode: 400 })
    expect(await database.db.select().from(ingresos).where(eq(ingresos.id, original.id))).toEqual([original])
  })

  it('conserva la creación y aplica las mismas validaciones a los registros nuevos', async () => {
    const { default: crear } = await import('../server/api/ingresos/index.post')
    const result = await crear({} as Parameters<typeof crear>[0])
    expect(result.ingreso).toMatchObject({ fecha: '2026-11-09', monto: 1200, descripcion: 'Nómina corregida' })
    expect(result.ingreso?.id).not.toBe(original.id)
    readBody.mockResolvedValue({ fecha: '2026-02-30', monto: 10 })
    await expect(crear({} as Parameters<typeof crear>[0])).rejects.toMatchObject({ statusCode: 400 })
    expect(await database.db.select().from(ingresos)).toHaveLength(2)
  })
})
