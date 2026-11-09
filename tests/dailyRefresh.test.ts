import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fechaElSalvador, milisegundosHastaMananaElSalvador } from '../shared/utils/fechaElSalvador'
import { useDailyRefresh } from '../app/composables/useDailyRefresh'

let mount: () => void
let unmount: () => void
let documento: EventTarget & { visibilityState: string }
let ventana: EventTarget
let red: { onLine: boolean }
let fechaConsulta: string

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-17T05:59:59Z'))
  documento = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  ventana = new EventTarget()
  red = { onLine: true }
  fechaConsulta = '2026-11-16'
  vi.stubGlobal('document', documento)
  vi.stubGlobal('window', ventana)
  vi.stubGlobal('navigator', red)
  vi.stubGlobal('onMounted', (callback: () => void) => {
    mount = callback
  })
  vi.stubGlobal('onUnmounted', (callback: () => void) => {
    unmount = callback
  })
})

afterEach(() => {
  unmount?.()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function iniciar() {
  const refresh = vi.fn(async () => {
    fechaConsulta = fechaElSalvador()
  })
  useDailyRefresh(() => fechaConsulta, refresh)
  mount()
  return refresh
}

describe('Cambio de día en El Salvador', () => {
  it('distingue medianoche UTC de medianoche local, incluido el cambio de año', () => {
    expect(fechaElSalvador(new Date('2027-01-01T05:59:59Z'))).toBe('2026-12-31')
    expect(fechaElSalvador(new Date('2027-01-01T06:00:00Z'))).toBe('2027-01-01')
    expect(milisegundosHastaMananaElSalvador()).toBe(1000)
    expect(milisegundosHastaMananaElSalvador(new Date('2027-01-01T06:00:00Z'))).toBe(86400000)
  })

  it('actualiza a medianoche y vuelve a programar para el siguiente día', async () => {
    const refresh = iniciar()
    expect(refresh).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(refresh).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(86400000)
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('actualiza al recuperar visibilidad o foco tras suspenderse y evita consultas el mismo día', async () => {
    const refresh = iniciar()
    ventana.dispatchEvent(new Event('focus'))
    expect(refresh).not.toHaveBeenCalled()
    vi.setSystemTime(new Date('2026-11-18T10:00:00Z'))
    documento.visibilityState = 'hidden'
    documento.dispatchEvent(new Event('visibilitychange'))
    expect(refresh).not.toHaveBeenCalled()
    documento.visibilityState = 'visible'
    documento.dispatchEvent(new Event('visibilitychange'))
    ventana.dispatchEvent(new Event('focus'))
    await Promise.resolve()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('conserva el caché offline y actualiza al reconectar', async () => {
    red.onLine = false
    const refresh = iniciar()
    await vi.advanceTimersByTimeAsync(1000)
    expect(refresh).not.toHaveBeenCalled()
    red.onLine = true
    ventana.dispatchEvent(new Event('online'))
    await Promise.resolve()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('actualiza un caché de un día anterior al montar', () => {
    fechaConsulta = '2026-11-15'
    expect(iniciar()).toHaveBeenCalledTimes(1)
  })

  it('elimina el temporizador y los listeners al salir del tablero', async () => {
    const refresh = iniciar()
    unmount()
    await vi.advanceTimersByTimeAsync(1000)
    ventana.dispatchEvent(new Event('focus'))
    ventana.dispatchEvent(new Event('online'))
    documento.dispatchEvent(new Event('visibilitychange'))
    expect(refresh).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
