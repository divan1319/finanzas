export interface IngresoEditable {
  id: number
  fecha: string
  monto: number
  descripcion?: string | null
  cuenta_id?: number | null
  cuenta_nombre?: string | null
}
