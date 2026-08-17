export interface OfflineAction {
  id: string
  tipo: 'gasto_create' | 'gasto_update' | 'gasto_delete' | 'ingreso_create' | 'ingreso_delete'
  url: string
  method: 'POST' | 'PUT' | 'DELETE'
  body?: any
  timestamp: number
  descripcion: string
}

const STORAGE_QUEUE_KEY = 'finanzas_offline_queue'
const STORAGE_CONFIG_CACHE_KEY = 'finanzas_cached_config'

export const useOfflineSync = () => {
  const toast = useToast()

  const isOnline = useState<boolean>('offline_sync_is_online', () => true)
  const isSyncing = useState<boolean>('offline_sync_is_syncing', () => false)
  const pendingQueue = useState<OfflineAction[]>('offline_sync_pending_queue', () => [])
  const initialized = useState<boolean>('offline_sync_initialized', () => false)

  // Cargar cola persistida de localStorage
  const loadQueueFromStorage = () => {
    if (import.meta.server) return
    try {
      const stored = localStorage.getItem(STORAGE_QUEUE_KEY)
      if (stored) {
        pendingQueue.value = JSON.parse(stored)
      }
    } catch (e) {
      console.error('Error al cargar cola offline:', e)
    }
  }

  // Guardar cola actual en localStorage
  const saveQueueToStorage = () => {
    if (import.meta.server) return
    try {
      localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(pendingQueue.value))
    } catch (e) {
      console.error('Error al guardar cola offline:', e)
    }
  }

  // Guardar copia de respaldo de configuración y tarjetas
  const cacheConfigData = (data: any) => {
    if (import.meta.server || !data) return
    try {
      localStorage.setItem(STORAGE_CONFIG_CACHE_KEY, JSON.stringify(data))
    } catch (e) {
      console.error('Error al guardar caché de config:', e)
    }
  }

  // Leer configuración de respaldo si estamos offline
  const getCachedConfigData = () => {
    if (import.meta.server) return null
    try {
      const stored = localStorage.getItem(STORAGE_CONFIG_CACHE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  // Agregar una acción a la cola offline
  const enqueueAction = (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const item: OfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now()
    }
    pendingQueue.value.push(item)
    saveQueueToStorage()
    return item
  }

  // Eliminar una acción por id
  const removeAction = (id: string) => {
    pendingQueue.value = pendingQueue.value.filter(a => a.id !== id)
    saveQueueToStorage()
  }

  // Sincronizar todas las acciones pendientes
  const syncNow = async () => {
    if (import.meta.server || isSyncing.value || pendingQueue.value.length === 0) return
    if (!navigator.onLine) {
      toast.add({
        title: 'Sin conexión',
        description: 'No hay conexión a internet para sincronizar en este momento.',
        color: 'warning',
        icon: 'i-lucide-wifi-off'
      })
      return
    }

    isSyncing.value = true
    let syncedCount = 0
    let errorCount = 0

    try {
      // Clonar lista para procesar en orden FIFO
      const queueCopy = [...pendingQueue.value]

      for (const action of queueCopy) {
        try {
          await $fetch(action.url, {
            method: action.method,
            body: action.body
          })
          // Remover si tuvo éxito
          removeAction(action.id)
          syncedCount++
        } catch (err: any) {
          console.error(`Error al sincronizar acción ${action.tipo}:`, err)
          errorCount++
        }
      }

      if (syncedCount > 0) {
        // Refrescar todos los datos de Nuxt
        await refreshNuxtData()
        toast.add({
          title: 'Sincronización completa',
          description: `Se sincronizaron ${syncedCount} registro(s) pendiente(s) con éxito.`,
          color: 'success',
          icon: 'i-lucide-cloud-check'
        })
      }

      if (errorCount > 0) {
        toast.add({
          title: 'Sincronización parcial',
          description: `${errorCount} registro(s) no pudieron enviarse. Se reintentará luego.`,
          color: 'warning',
          icon: 'i-lucide-alert-triangle'
        })
      }
    } catch (e: any) {
      console.error('Error general durante la sincronización:', e)
    } finally {
      isSyncing.value = false
    }
  }

  // Inicializar listeners de red (solo en cliente)
  const initOfflineListeners = () => {
    if (import.meta.server || initialized.value) return
    initialized.value = true

    isOnline.value = navigator.onLine
    loadQueueFromStorage()

    window.addEventListener('online', () => {
      isOnline.value = true
      toast.add({
        title: 'Conexión restablecida',
        description: pendingQueue.value.length > 0
          ? `Iniciando sincronización de ${pendingQueue.value.length} registro(s)...`
          : 'Conectado a internet.',
        color: 'info',
        icon: 'i-lucide-wifi'
      })
      if (pendingQueue.value.length > 0) {
        syncNow()
      }
    })

    window.addEventListener('offline', () => {
      isOnline.value = false
      toast.add({
        title: 'Modo sin conexión',
        description: 'Puedes seguir registrando gastos e ingresos. Se guardarán en tu dispositivo.',
        color: 'warning',
        icon: 'i-lucide-wifi-off'
      })
    })

    // Si al arrancar ya hay internet y había elementos pendientes, sincronizar
    if (navigator.onLine && pendingQueue.value.length > 0) {
      setTimeout(() => {
        syncNow()
      }, 1000)
    }
  }

  return {
    isOnline,
    isSyncing,
    pendingQueue,
    initOfflineListeners,
    enqueueAction,
    removeAction,
    syncNow,
    cacheConfigData,
    getCachedConfigData
  }
}
