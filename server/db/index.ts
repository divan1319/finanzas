import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const dbDir = resolve(process.cwd(), '.data')
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true })
}

const client = createClient({
  url: `file:${resolve(dbDir, 'finanzas.db')}`
})

export const db = drizzle(client, { schema })

let initialized = false

export async function initDatabase() {
  if (initialized) return
  initialized = true

  await client.execute(`
    CREATE TABLE IF NOT EXISTS tarjetas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      dia_corte INTEGER NOT NULL,
      dia_pago_propio_tipo TEXT NOT NULL,
      dia_vencimiento_pago INTEGER,
      color TEXT DEFAULT 'blue'
    );
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS configuracion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dia_objetivo_nomina INTEGER NOT NULL DEFAULT 26,
      limite_gasto_periodo REAL NOT NULL DEFAULT 15000
    );
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS ingresos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      monto REAL NOT NULL,
      descripcion TEXT DEFAULT 'Nómina',
      fecha_registro TEXT NOT NULL
    );
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS gastos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tarjeta_id INTEGER NOT NULL REFERENCES tarjetas(id),
      fecha TEXT NOT NULL,
      monto REAL NOT NULL,
      descripcion TEXT NOT NULL,
      categoria TEXT DEFAULT 'General',
      created_at TEXT NOT NULL
    );
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS reconciliaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tarjeta_id INTEGER NOT NULL REFERENCES tarjetas(id),
      ciclo_inicio TEXT NOT NULL,
      ciclo_fin TEXT NOT NULL,
      total_banco REAL NOT NULL,
      total_app_calculado REAL NOT NULL,
      diferencia REAL NOT NULL,
      notas TEXT,
      fecha_registro TEXT NOT NULL
    );
  `)

  // Sembrar tarjetas por defecto si no existen
  const tarjetasExist = await db.select().from(schema.tarjetas)
  if (tarjetasExist.length === 0) {
    await db.insert(schema.tarjetas).values([
      {
        codigo: 'A',
        nombre: 'Tarjeta A (Corte 5 / Paga 6)',
        dia_corte: 5,
        dia_pago_propio_tipo: 'dia_siguiente_corte',
        dia_vencimiento_pago: 30,
        color: 'emerald'
      },
      {
        codigo: 'B',
        nombre: 'Tarjeta B (Corte 9 / Paga Nómina)',
        dia_corte: 9,
        dia_pago_propio_tipo: 'dia_nomina',
        dia_vencimiento_pago: 3,
        color: 'indigo'
      }
    ])
  }

  // Sembrar configuración por defecto si no existe
  const configExist = await db.select().from(schema.configuracion)
  if (configExist.length === 0) {
    await db.insert(schema.configuracion).values({
      dia_objetivo_nomina: 26,
      limite_gasto_periodo: 15000
    })
  }
}

// Inicializar en primer llamado
initDatabase().catch(console.error)
