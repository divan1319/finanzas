export type TipoMovimientoCuenta = 'entrada' | 'salida'

export type CategoriaMovimientoCuenta
  = 'nomina'
    | 'transferencia'
    | 'aguinaldo'
    | 'bono'
    | 'retiro_tarjeta'
    | 'pago_tarjeta'
    | 'retiro_efectivo'
    | 'traspaso'
    | 'otro'

export interface CuentaInfo {
  id: number
  nombre: string
  banco?: string | null
  saldo_inicial: number
  es_principal: boolean
  color?: string | null
  created_at: string
}

export interface CuentaConSaldo extends CuentaInfo {
  total_entradas: number
  total_salidas: number
  saldo_actual: number
  cantidad_movimientos: number
}

export interface MovimientoCuentaItem {
  id: number
  cuenta_id: number
  cuenta_nombre?: string | null
  cuenta_color?: string | null
  tipo: TipoMovimientoCuenta | string
  categoria: CategoriaMovimientoCuenta | string
  monto: number
  fecha: string
  descripcion: string
  ingreso_id?: number | null
  gasto_id?: number | null
  tarjeta_id?: number | null
  transferencia_par_id?: number | null
  created_at: string
}

export interface CicloPendientePago {
  tarjeta: {
    id: number
    codigo: string
    nombre: string
    dia_corte: number
    dia_pago_propio_tipo: string
    es_principal: boolean
    color?: string | null
  }
  ciclo_inicio: string
  ciclo_fin: string
  etiqueta: string
  cantidad_gastos: number
  total_app: number
  reconciliado: boolean
  total_banco: number | null
  monto_sugerido: number
  fecha_pago_estimada: string
  pago_vencido_o_hoy: boolean
}
