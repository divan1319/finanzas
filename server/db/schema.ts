import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const tarjetas = sqliteTable('tarjetas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  codigo: text('codigo').notNull().unique(), // 'A' o 'B' o código único
  nombre: text('nombre').notNull(),
  dia_corte: integer('dia_corte').notNull(), // 5 o 9
  dia_pago_propio_tipo: text('dia_pago_propio_tipo').notNull(), // 'dia_siguiente_corte' | 'dia_nomina'
  dia_vencimiento_pago: integer('dia_vencimiento_pago'), // Informativo (ej. 30 o 3)
  es_principal: integer('es_principal', { mode: 'boolean' }).default(false).notNull(),
  color: text('color').default('blue')
})

export const configuracion = sqliteTable('configuracion', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  dia_objetivo_nomina: integer('dia_objetivo_nomina').default(26).notNull(),
  limite_gasto_periodo: real('limite_gasto_periodo').default(15000).notNull()
})

export const ingresos = sqliteTable('ingresos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fecha: text('fecha').notNull(), // Día de nómina YYYY-MM-DD
  monto: real('monto').notNull(),
  descripcion: text('descripcion').default('Nómina'),
  fecha_registro: text('fecha_registro').notNull()
})

export const gastos = sqliteTable('gastos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tarjeta_id: integer('tarjeta_id').references(() => tarjetas.id).notNull(),
  fecha: text('fecha').notNull(), // YYYY-MM-DD
  monto: real('monto').notNull(),
  descripcion: text('descripcion').notNull(),
  categoria: text('categoria').default('General'),
  created_at: text('created_at').notNull()
})

export const reconciliaciones = sqliteTable('reconciliaciones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tarjeta_id: integer('tarjeta_id').references(() => tarjetas.id).notNull(),
  ciclo_inicio: text('ciclo_inicio').notNull(),
  ciclo_fin: text('ciclo_fin').notNull(),
  total_banco: real('total_banco').notNull(),
  total_app_calculado: real('total_app_calculado').notNull(),
  diferencia: real('diferencia').notNull(),
  notas: text('notas'),
  fecha_registro: text('fecha_registro').notNull()
})

export const presupuestosPeriodo = sqliteTable('presupuestos_periodo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  periodo_inicio: text('periodo_inicio').notNull().unique(), // e.g. '2026-07-24'
  periodo_fin: text('periodo_fin').notNull(), // e.g. '2026-08-25'
  limite: real('limite').notNull(),
  updated_at: text('updated_at').notNull()
})

// Suscripciones Web Push: una fila por dispositivo/navegador que activó las notificaciones
export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  endpoint: text('endpoint').notNull().unique(), // URL única del servicio push del navegador
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  user_agent: text('user_agent'),
  created_at: text('created_at').notNull()
})
