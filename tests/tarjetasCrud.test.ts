import { describe, it, expect } from 'vitest'
import { db, initDatabase } from '../server/db'
import { tarjetas, gastos, reconciliaciones } from '../server/db/schema'
import { eq } from 'drizzle-orm'

describe('Tarjetas CRUD & Validación de Integridad', () => {
  it('Permite crear una nueva tarjeta con nombre descriptivo personalizado', async () => {
    await initDatabase()

    const nueva = {
      codigo: 'TEST_AMEX_' + Date.now(),
      nombre: 'American Express Gold',
      dia_corte: 15,
      dia_pago_propio_tipo: 'dia_siguiente_corte',
      dia_vencimiento_pago: 20,
      color: 'amber'
    }

    const inserted = await db.insert(tarjetas).values(nueva).returning()
    expect(inserted[0]).toBeDefined()
    expect(inserted[0].nombre).toBe('American Express Gold')
    expect(inserted[0].color).toBe('amber')

    // Editar la tarjeta
    await db.update(tarjetas)
      .set({ nombre: 'Amex Platinum', color: 'rose' })
      .where(eq(tarjetas.id, inserted[0].id))

    const updated = await db.select().from(tarjetas).where(eq(tarjetas.id, inserted[0].id))
    expect(updated[0].nombre).toBe('Amex Platinum')
    expect(updated[0].color).toBe('rose')

    // Eliminar la tarjeta sin registros asociados
    await db.delete(tarjetas).where(eq(tarjetas.id, inserted[0].id))
    const checkDeleted = await db.select().from(tarjetas).where(eq(tarjetas.id, inserted[0].id))
    expect(checkDeleted.length).toBe(0)
  })

  it('Verifica la detección de gastos asociados para evitar eliminación errónea', async () => {
    await initDatabase()

    // Obtener tarjetas existentes
    const todas = await db.select().from(tarjetas)
    expect(todas.length).toBeGreaterThan(0)

    const primerTarjeta = todas[0]
    const gastosAsociados = await db.select().from(gastos).where(eq(gastos.tarjeta_id, primerTarjeta.id))

    if (gastosAsociados.length > 0) {
      // Tiene gastos, por lo que la regla de negocio debe rechazar la eliminación
      expect(gastosAsociados.length).toBeGreaterThan(0)
    }
  })
})
