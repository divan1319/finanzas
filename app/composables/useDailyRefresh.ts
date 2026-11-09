import { fechaElSalvador, milisegundosHastaMananaElSalvador } from '#shared/utils/fechaElSalvador'

/** Actualiza el tablero al cambiar de día, incluso tras suspender la pestaña. */
export function useDailyRefresh(fechaConsulta: () => string | undefined, refresh: () => Promise<unknown>) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let refreshing = false

  const checkDate = async () => {
    if (!navigator.onLine || refreshing || fechaConsulta() === fechaElSalvador()) return
    refreshing = true
    try {
      await refresh()
    } catch {
      // Conservar el caché existente si la conexión falla.
    } finally {
      refreshing = false
    }
  }

  const scheduleRefresh = () => {
    timer = setTimeout(() => {
      void checkDate()
      scheduleRefresh()
    }, milisegundosHastaMananaElSalvador())
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') void checkDate()
  }

  onMounted(() => {
    void checkDate()
    scheduleRefresh()
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', checkDate)
    window.addEventListener('online', checkDate)
  })

  onUnmounted(() => {
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('focus', checkDate)
    window.removeEventListener('online', checkDate)
  })
}
