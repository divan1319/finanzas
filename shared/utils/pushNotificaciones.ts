// Contenido que viaja dentro de cada mensaje Web Push y que lee public/sw-push.js
export interface PushPayload {
  title: string
  body: string
  url?: string // Ruta que se abre al tocar la notificación
  tag?: string // Notificaciones con el mismo tag se reemplazan en lugar de apilarse
}

export interface DatosNotificacionGasto {
  id?: number
  monto: number
  moneda?: string
  comercio: string
  tarjetaNombre?: string | null
}

export function formatearMonto(monto: number, moneda = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(monto)
  } catch {
    // Código de moneda no reconocido por Intl
    return `${moneda} ${monto.toFixed(2)}`
  }
}

export function construirNotificacionGasto(datos: DatosNotificacionGasto): PushPayload {
  const monto = formatearMonto(datos.monto, datos.moneda)
  const detalle = datos.tarjetaNombre ? ` · ${datos.tarjetaNombre}` : ''

  return {
    title: 'Nuevo gasto registrado',
    body: `${monto} en ${datos.comercio}${detalle}`,
    url: '/gastos',
    tag: datos.id ? `gasto-${datos.id}` : undefined
  }
}

// Los servicios push responden 404/410 cuando la suscripción expiró o el usuario revocó el permiso
export function suscripcionExpirada(statusCode?: number): boolean {
  return statusCode === 404 || statusCode === 410
}

// Convierte la llave pública VAPID (base64url) al formato binario que espera pushManager.subscribe()
export function base64UrlAUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

export function construirNotificacionError(motivo: string, detalle?: string): PushPayload {
  const texto = detalle ? `${motivo}: ${detalle}` : motivo

  return {
    title: '⚠️ Error en el registro de gastos',
    body: texto.length > 150 ? `${texto.slice(0, 147)}...` : texto,
    url: '/gastos'
  }
}
