import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOfflineSync } from '../app/composables/useOfflineSync'

const fetch = vi.fn()
const refresh = vi.fn()
let network: { onLine: boolean }
let storage: Map<string, string>

beforeEach(() => {
  const states = new Map<string, { value: unknown }>()
  storage = new Map()
  network = { onLine: true }
  vi.stubGlobal('useState', <T>(key: string, initial: () => T) => {
    if (!states.has(key)) states.set(key, { value: initial() })
    return states.get(key)
  })
  vi.stubGlobal('useAppConfig', () => ({ appIcons: { cloudCheck: 'check', wifiOff: 'offline' }, ui: { icons: { warning: 'warning' } } }))
  vi.stubGlobal('useToast', () => ({ add: vi.fn() }))
  vi.stubGlobal('navigator', network)
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value)
  })
  vi.stubGlobal('$fetch', fetch)
  vi.stubGlobal('refreshNuxtData', refresh)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  fetch.mockResolvedValue({ success: true })
  refresh.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

const cambio = {
  tipo: 'ingreso_update' as const,
  url: '/api/ingresos/42',
  method: 'PUT' as const,
  body: { fecha: '2026-11-09', monto: 1200, descripcion: 'Nómina corregida' },
  descripcion: 'Actualizar nómina'
}

describe('Sincronización de nómina editada', () => {
  it('persiste una actualización y la sincroniza con PUT, sin crear otro ingreso', async () => {
    const sync = useOfflineSync()
    sync.enqueueAction(cambio)
    expect(JSON.parse(storage.get('finanzas_offline_queue')!)[0]).toMatchObject(cambio)
    await sync.syncNow()
    expect(fetch).toHaveBeenCalledExactlyOnceWith(cambio.url, { method: 'PUT', body: cambio.body })
    expect(sync.pendingQueue.value).toHaveLength(0)
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('espera a tener conexión y conserva el orden de las modificaciones', async () => {
    const sync = useOfflineSync()
    sync.enqueueAction(cambio)
    sync.enqueueAction({ ...cambio, body: { ...cambio.body, monto: 1300 } })
    network.onLine = false
    await sync.syncNow()
    expect(fetch).not.toHaveBeenCalled()
    network.onLine = true
    await sync.syncNow()
    expect(fetch.mock.calls.map(call => call[1].body.monto)).toEqual([1200, 1300])
    expect(sync.pendingQueue.value).toHaveLength(0)
  })

  it('conserva los cambios pendientes si el servidor rechaza la actualización', async () => {
    const sync = useOfflineSync()
    sync.enqueueAction(cambio)
    fetch.mockRejectedValue({ statusCode: 404 })
    await sync.syncNow()
    expect(sync.pendingQueue.value).toHaveLength(1)
    expect(fetch).toHaveBeenCalledExactlyOnceWith(cambio.url, { method: 'PUT', body: cambio.body })
    expect(refresh).not.toHaveBeenCalled()
  })
})
