import { db } from '../db'
import { configuracion, gastos, ingresos, reconciliaciones, tarjetas } from '../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async () => {
  // 1. Asegurar tarjetas y configuración
  const listaTarjetas = await db.select().from(tarjetas)
  const tarjetaA = listaTarjetas.find(t => t.codigo === 'A')
  const tarjetaB = listaTarjetas.find(t => t.codigo === 'B')

  if (!tarjetaA || !tarjetaB) {
    throw createError({ statusCode: 500, statusMessage: 'Tarjetas no configuradas' })
  }

  // Actualizar límite a $2,000 USD si está en el default viejo
  const configs = await db.select().from(configuracion)
  const firstConfig = configs[0]
  if (firstConfig) {
    await db.update(configuracion)
      .set({ limite_gasto_periodo: 2000 })
      .where(eq(configuracion.id, firstConfig.id))
  }

  // 2. Limpiar gastos, ingresos y reconciliaciones previas para demo limpio
  await db.delete(gastos)
  await db.delete(ingresos)
  await db.delete(reconciliaciones)

  // 3. Crear Ingresos de nómina en USD (ej. Julio y Agosto 2026)
  await db.insert(ingresos).values([
    {
      fecha: '2026-07-24', // 26 julio fue domingo -> 24
      monto: 3200,
      descripcion: 'Nómina Julio (USD)',
      fecha_registro: '2026-07-24T09:00:00Z'
    },
    {
      fecha: '2026-08-26', // 26 agosto es miércoles -> 26
      monto: 3200,
      descripcion: 'Nómina Agosto (USD)',
      fecha_registro: '2026-08-26T09:15:00Z'
    }
  ])

  // 4. Crear Gastos de prueba en USD
  const muestraGastos = [
    // Gastos en Tarjeta B (26 Jul - 5 Ago)
    { fecha: '2026-07-27', monto: 85.50, desc: 'Trader Joe\'s Supermarket', cat: 'Alimentos', codigo: 'B' },
    { fecha: '2026-07-30', monto: 45.00, desc: 'Gas Shell', cat: 'Transporte', codigo: 'B' },
    { fecha: '2026-08-02', monto: 120.00, desc: 'Dinner & Restaurant', cat: 'Ocio & Salidas', codigo: 'B' },
    { fecha: '2026-08-04', monto: 35.00, desc: 'CVS Pharmacy', cat: 'Salud & Farmacia', codigo: 'B' },

    // Gastos en Tarjeta A (6 Ago - 25 Ago)
    { fecha: '2026-08-06', monto: 165.00, desc: 'Costco Wholesale', cat: 'Alimentos', codigo: 'A' },
    { fecha: '2026-08-10', monto: 29.99, desc: 'Netflix & Spotify', cat: 'Suscripciones', codigo: 'A' },
    { fecha: '2026-08-14', monto: 60.00, desc: 'Chevron Gas', cat: 'Transporte', codigo: 'A' },
    { fecha: '2026-08-18', monto: 240.00, desc: 'Car Service & Maintenance', cat: 'Transporte', codigo: 'A' },
    { fecha: '2026-08-22', monto: 92.00, desc: 'Cinema & Weekend outing', cat: 'Ocio & Salidas', codigo: 'A' },

    // Gastos en el Período Actual (26 Ago - Hoy)
    // 26 Ago - 5 Sep -> Activa Tarjeta B
    { fecha: '2026-08-26', monto: 185.00, desc: 'Whole Foods Market', cat: 'Alimentos', codigo: 'B' },
    { fecha: '2026-08-28', monto: 55.00, desc: 'Mobil Gas', cat: 'Transporte', codigo: 'B' },
    { fecha: '2026-08-30', monto: 78.00, desc: 'Weekend Brunch', cat: 'Ocio & Salidas', codigo: 'B' },
    { fecha: '2026-09-02', monto: 32.00, desc: 'Coffee Shop & Bakery', cat: 'Alimentos', codigo: 'B' },
    { fecha: '2026-09-04', monto: 65.00, desc: 'Internet AT&T', cat: 'Servicios', codigo: 'B' },

    // 6 Sep - 24 Sep -> Activa Tarjeta A
    { fecha: '2026-09-06', monto: 210.00, desc: 'Monthly Grocery Target', cat: 'Alimentos', codigo: 'A' },
    { fecha: '2026-09-09', monto: 58.00, desc: 'Gas Station', cat: 'Transporte', codigo: 'A' },
    { fecha: '2026-09-12', monto: 89.00, desc: 'Clothing / Shopping', cat: 'Compras', codigo: 'A' },
    { fecha: '2026-09-15', monto: 145.00, desc: 'Celebration Dinner', cat: 'Ocio & Salidas', codigo: 'A' }
  ]

  for (const item of muestraGastos) {
    const t = item.codigo === 'A' ? tarjetaA : tarjetaB
    await db.insert(gastos).values({
      tarjeta_id: t.id,
      fecha: item.fecha,
      monto: item.monto,
      descripcion: item.desc,
      categoria: item.cat,
      created_at: `${item.fecha}T12:00:00Z`
    })
  }

  // 5. Sembrar reconciliación de prueba
  await db.insert(reconciliaciones).values({
    tarjeta_id: tarjetaA.id,
    ciclo_inicio: '2026-07-06',
    ciclo_fin: '2026-08-05',
    total_banco: 586.99,
    total_app_calculado: 586.99,
    diferencia: 0.00,
    notas: 'Reconciliación de corte de agosto',
    fecha_registro: '2026-08-07T10:00:00Z'
  })

  return {
    success: true,
    message: 'Datos de demostración sembrados exitosamente (en USD)'
  }
})
