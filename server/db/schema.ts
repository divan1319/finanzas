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

export const cuentas = sqliteTable('cuentas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  banco: text('banco'),
  saldo_inicial: real('saldo_inicial').default(0).notNull(),
  es_principal: integer('es_principal', { mode: 'boolean' }).default(false).notNull(),
  color: text('color').default('emerald'),
  created_at: text('created_at').notNull()
})

export const ingresos = sqliteTable('ingresos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fecha: text('fecha').notNull(), // Día de nómina YYYY-MM-DD
  monto: real('monto').notNull(),
  descripcion: text('descripcion').default('Nómina'),
  cuenta_id: integer('cuenta_id').references(() => cuentas.id),
  fecha_registro: text('fecha_registro').notNull()
})

export const gastos = sqliteTable('gastos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tarjeta_id: integer('tarjeta_id').references(() => tarjetas.id).notNull(),
  fecha: text('fecha').notNull(), // YYYY-MM-DD
  monto: real('monto').notNull(),
  descripcion: text('descripcion').notNull(),
  categoria: text('categoria').default('General'),
  aporta_cuenta: integer('aporta_cuenta', { mode: 'boolean' }).default(false).notNull(),
  cuenta_destino_id: integer('cuenta_destino_id').references(() => cuentas.id),
  monto_cuenta: real('monto_cuenta'),
  created_at: text('created_at').notNull()
})

export const movimientosCuenta = sqliteTable('movimientos_cuenta', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cuenta_id: integer('cuenta_id').references(() => cuentas.id).notNull(),
  tipo: text('tipo').notNull(), // 'entrada' | 'salida'
  categoria: text('categoria').notNull(), // 'nomina' | 'transferencia' | 'aguinaldo' | 'bono' | 'retiro_tarjeta' | 'pago_tarjeta' | 'retiro_efectivo' | 'traspaso' | 'otro'
  monto: real('monto').notNull(),
  fecha: text('fecha').notNull(), // YYYY-MM-DD
  descripcion: text('descripcion').notNull(),
  ingreso_id: integer('ingreso_id'),
  gasto_id: integer('gasto_id'),
  tarjeta_id: integer('tarjeta_id'),
  transferencia_par_id: integer('transferencia_par_id'),
  created_at: text('created_at').notNull()
})

export const liquidacionesTarjeta = sqliteTable('liquidaciones_tarjeta', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tarjeta_id: integer('tarjeta_id').references(() => tarjetas.id).notNull(),
  ciclo_inicio: text('ciclo_inicio').notNull(),
  ciclo_fin: text('ciclo_fin').notNull(),
  estado: text('estado').notNull(), // 'pagado' | 'omitido'
  monto_pagado: real('monto_pagado').default(0).notNull(),
  cuenta_id: integer('cuenta_id').references(() => cuentas.id),
  movimiento_id: integer('movimiento_id'),
  fecha_pago: text('fecha_pago').notNull(),
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
