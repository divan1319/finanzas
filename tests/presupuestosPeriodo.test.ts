import { describe, it, expect, beforeEach } from 'vitest'
import { db, initDatabase } from '../server/db'
import { configuracion, presupuestosPeriodo } from '../server/db/schema'
import { eq } from 'drizzle-orm'

describe('Presupuestos Independientes por Período', () => {
  beforeEach(async () => {
    await initDatabase()
  })

  it('Permite guardar y actualizar presupuesto para un período específico', async () => {
    const periodoInicio = '2026-07-24'
    const periodoFin = '2026-08-25'
    const limitePersonalizado = 650

    // Limpiar si existía
    await db.delete(presupuestosPeriodo).where(eq(presupuestosPeriodo.periodo_inicio, periodoInicio))

    // Insertar
    const now = new Date().toISOString()
    await db.insert(presupuestosPeriodo).values({
      periodo_inicio: periodoInicio,
      periodo_fin: periodoFin,
      limite: limitePersonalizado,
      updated_at: now
    })

    const rows = await db.select().from(presupuestosPeriodo).where(eq(presupuestosPeriodo.periodo_inicio, periodoInicio))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.limite).toBe(650)
    expect(rows[0]?.periodo_inicio).toBe('2026-07-24')

    // Actualizar
    await db.update(presupuestosPeriodo)
      .set({ limite: 700, updated_at: new Date().toISOString() })
      .where(eq(presupuestosPeriodo.periodo_inicio, periodoInicio))

    const updated = await db.select().from(presupuestosPeriodo).where(eq(presupuestosPeriodo.periodo_inicio, periodoInicio))
    expect(updated[0]?.limite).toBe(700)
  })

  it('Aplica fallback a la configuración global si no hay presupuesto personalizado', async () => {
    const configList = await db.select().from(configuracion)
    const globalDefault = configList[0]?.limite_gasto_periodo ?? 15000

    const periodoSinPresupuesto = '1999-01-01'
    const custom = await db.select().from(presupuestosPeriodo).where(eq(presupuestosPeriodo.periodo_inicio, periodoSinPresupuesto))
    
    expect(custom).toHaveLength(0)
    const limiteFinal = custom.length > 0 ? custom[0]?.limite : globalDefault
    expect(limiteFinal).toBe(globalDefault)
  })
})
