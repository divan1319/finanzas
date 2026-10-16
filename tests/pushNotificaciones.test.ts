import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { eq } from 'drizzle-orm'
import webpushReal from 'web-push'
import { db, initDatabase } from '../server/db'
import { pushSubscriptions } from '../server/db/schema'
import {
  construirNotificacionGasto,
  formatearMonto,
  suscripcionExpirada,
  base64UrlAUint8Array
} from '../shared/utils/pushNotificaciones'

const { sendNotification } = vi.hoisted(() => ({ sendNotification: vi.fn() }))
vi.mock('web-push', async (importOriginal) => {
  const real = await importOriginal<{ default: typeof import('web-push') }>()
  return { default: { ...real.default, sendNotification } }
})

describe('Payload de notificación de gasto', () => {
  it('incluye monto, comercio y tarjeta', () => {
    const payload = construirNotificacionGasto({
      id: 42,
      monto: 1234.5,
      moneda: 'USD',
      comercio: 'SUPERMERCADO LA COLONIA',
      tarjetaNombre: 'Tarjeta A'
    })

    expect(payload.title).toBe('Nuevo gasto registrado')
    expect(payload.body).toBe('$1,234.50 en SUPERMERCADO LA COLONIA · Tarjeta A')
    expect(payload.url).toBe('/gastos')
    expect(payload.tag).toBe('gasto-42')
  })

  it('omite la tarjeta y el tag cuando no se conocen', () => {
    const payload = construirNotificacionGasto({ monto: 5, comercio: 'CAFE' })
    expect(payload.body).toBe('$5.00 en CAFE')
    expect(payload.tag).toBeUndefined()
  })

  it('respeta monedas distintas a USD y tolera códigos inválidos', () => {
    expect(formatearMonto(10, 'EUR')).toBe('€10.00')
    expect(formatearMonto(10, 'XX')).toBe('XX 10.00')
  })
})

describe('Detección de suscripciones expiradas', () => {
  it('solo 404 y 410 indican que la suscripción debe eliminarse', () => {
    expect(suscripcionExpirada(404)).toBe(true)
    expect(suscripcionExpirada(410)).toBe(true)
    expect(suscripcionExpirada(400)).toBe(false)
    expect(suscripcionExpirada(403)).toBe(false)
    expect(suscripcionExpirada(500)).toBe(false)
    expect(suscripcionExpirada(undefined)).toBe(false)
  })
})

describe('Conversión de la llave pública VAPID', () => {
  it('decodifica base64url a los 65 bytes de una llave P-256 sin comprimir', () => {
    const { publicKey } = webpushReal.generateVAPIDKeys()
    const bytes = base64UrlAUint8Array(publicKey)

    expect(bytes.length).toBe(65)
    expect(bytes[0]).toBe(0x04)
    expect(Buffer.from(bytes).equals(Buffer.from(publicKey, 'base64url'))).toBe(true)
  })
})

describe('Tabla push_subscriptions', () => {
  it('upsert por endpoint: re-suscribir el mismo dispositivo actualiza sus llaves', async () => {
    await initDatabase()
    const endpoint = `https://push.example.com/test-upsert-${Date.now()}`

    const guardar = (p256dh: string, auth: string) => db.insert(pushSubscriptions).values({
      endpoint,
      p256dh,
      auth,
      user_agent: 'vitest',
      created_at: new Date().toISOString()
    }).onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { p256dh, auth }
    })

    await guardar('p1', 'a1')
    await guardar('p2', 'a2')

    const filas = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
    expect(filas.length).toBe(1)
    expect(filas[0]?.p256dh).toBe('p2')
    expect(filas[0]?.auth).toBe('a2')

    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
  })
})

describe('enviarPush', () => {
  const vapid = webpushReal.generateVAPIDKeys()
  let runtimeConfig: {
    vapidPrivateKey: string
    vapidSubject: string
    public: { vapidPublicKey: string }
  }
  const endpoints: string[] = []

  const crearSuscripcion = async () => {
    const endpoint = `https://push.example.com/test-envio-${Date.now()}-${endpoints.length}`
    endpoints.push(endpoint)
    await db.insert(pushSubscriptions).values({
      endpoint,
      p256dh: 'p256dh-test',
      auth: 'auth-test',
      created_at: new Date().toISOString()
    })
    return endpoint
  }

  const existe = async (endpoint: string) =>
    (await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))).length > 0

  beforeEach(async () => {
    await initDatabase()
    sendNotification.mockReset()
    runtimeConfig = {
      vapidPrivateKey: vapid.privateKey,
      vapidSubject: 'mailto:test@example.com',
      public: { vapidPublicKey: vapid.publicKey }
    }
    vi.stubGlobal('useRuntimeConfig', () => runtimeConfig)
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    for (const endpoint of endpoints.splice(0)) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
    }
  })

  it('envía el payload como JSON con las llaves VAPID configuradas', async () => {
    const { enviarPush } = await import('../server/utils/webPush')
    const endpoint = await crearSuscripcion()
    sendNotification.mockResolvedValue({ statusCode: 201 })

    const resultado = await enviarPush({ title: 'Hola', body: 'Mundo' }, { endpoint })

    expect(resultado).toEqual({ total: 1, enviadas: 1, fallidas: 0, eliminadas: 0 })
    const [sub, cuerpo, opciones] = sendNotification.mock.calls[0]!
    expect(sub).toEqual({ endpoint, keys: { p256dh: 'p256dh-test', auth: 'auth-test' } })
    expect(JSON.parse(cuerpo)).toEqual({ title: 'Hola', body: 'Mundo' })
    expect(opciones.vapidDetails).toEqual({
      publicKey: vapid.publicKey,
      privateKey: vapid.privateKey,
      subject: 'mailto:test@example.com'
    })
    expect(opciones.timeout).toBeGreaterThan(0)
  })

  it('elimina la suscripción cuando el servicio push responde 410', async () => {
    const { enviarPush } = await import('../server/utils/webPush')
    const endpoint = await crearSuscripcion()
    sendNotification.mockRejectedValue(Object.assign(new Error('Gone'), { statusCode: 410 }))

    const resultado = await enviarPush({ title: 't', body: 'b' }, { endpoint })

    expect(resultado).toEqual({ total: 1, enviadas: 0, fallidas: 0, eliminadas: 1 })
    expect(await existe(endpoint)).toBe(false)
  })

  it('conserva la suscripción ante otros errores del servicio push', async () => {
    const { enviarPush } = await import('../server/utils/webPush')
    const endpoint = await crearSuscripcion()
    sendNotification.mockRejectedValue(Object.assign(new Error('Server error'), { statusCode: 500 }))
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})

    const resultado = await enviarPush({ title: 't', body: 'b' }, { endpoint })

    expect(resultado).toEqual({ total: 1, enviadas: 0, fallidas: 1, eliminadas: 0 })
    expect(await existe(endpoint)).toBe(true)
    consola.mockRestore()
  })

  it('no envía nada si faltan las llaves VAPID', async () => {
    const { enviarPush, pushConfigurado } = await import('../server/utils/webPush')
    const endpoint = await crearSuscripcion()
    runtimeConfig.vapidPrivateKey = ''
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(pushConfigurado()).toBe(false)
    const resultado = await enviarPush({ title: 't', body: 'b' }, { endpoint })

    expect(resultado).toEqual({ total: 0, enviadas: 0, fallidas: 0, eliminadas: 0 })
    expect(sendNotification).not.toHaveBeenCalled()
    aviso.mockRestore()
  })
})
