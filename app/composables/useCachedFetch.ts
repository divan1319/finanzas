import type { NitroFetchRequest, AvailableRouterMethod } from 'nitropack'
import type { AsyncData, FetchResult, UseFetchOptions } from 'nuxt/app'

const CACHE_PREFIX = 'finanzas_query_cache_'

/**
 * Obtener datos almacenados en localStorage
 */
export function getLocalCachedData<T = any>(key: string): T | null {
  if (import.meta.server) return null
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch (err) {
    console.error(`Error al leer caché local para ${key}:`, err)
    return null
  }
}

/**
 * Guardar datos en localStorage
 */
export function setLocalCachedData(key: string, data: any): void {
  if (import.meta.server || data === undefined || data === null) return
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data))
  } catch (err) {
    console.error(`Error al guardar en caché local para ${key}:`, err)
  }
}

/**
 * Composable useCachedFetch
 * Funciona como TanStack Query con Stale-While-Revalidate:
 * 1. Inicializa inmediatamente con los datos cacheados en localStorage si existen.
 * 2. Si no hay conexión o falla la red, preserva los datos cacheados en pantalla.
 * 3. Si hay conexión, consulta en segundo plano y actualiza el caché y la UI reactivamente.
 */
export function useCachedFetch<
  ResT = void,
  ErrorT = Error,
  ReqT extends NitroFetchRequest = NitroFetchRequest,
  MethodT extends AvailableRouterMethod<ReqT> = 'get' extends AvailableRouterMethod<ReqT> ? 'get' : AvailableRouterMethod<ReqT>,
  _ResT = ResT extends void ? FetchResult<ReqT, MethodT> : ResT,
  DataT = _ResT
>(
  url: ReqT | (() => ReqT),
  options: UseFetchOptions<_ResT, DataT> = {}
): AsyncData<DataT, ErrorT | undefined> {
  const getResolvedKey = () => {
    if (isRef(options.key)) return (options.key as any).value
    if (typeof options.key === 'string') return options.key
    return typeof url === 'string' ? url : 'cached_fetch_default'
  }

  const resolvedKey = getResolvedKey()

  // Obtener dato previo en localStorage para entrega inmediata (offline/SWR)
  const initialCache = getLocalCachedData<any>(resolvedKey)

  const fetchOptions: UseFetchOptions<_ResT, DataT> = {
    lazy: true,
    ...options,
    default: () => {
      if (initialCache !== null) {
        return initialCache
      }
      return options.default ? options.default() : (null as any)
    },
    onResponse(context) {
      if (context.response.ok && context.response._data) {
        setLocalCachedData(getResolvedKey(), context.response._data)
      }
      if (typeof options.onResponse === 'function') {
        (options.onResponse as any)(context)
      }
    }
  }

  const result = useFetch(url, fetchOptions as any) as unknown as AsyncData<DataT, ErrorT | undefined>

  // Asegurar que si data.value viene vacío tras montar pero hay caché local en cliente, se aplique
  if (import.meta.client && !result.data.value && initialCache !== null) {
    (result.data as any).value = initialCache
  }

  return result
}

/**
 * Precargar en segundo plano las rutas principales cuando haya internet
 * para que toda la app esté disponible al pasar a modo offline
 */
export async function prefetchAppRoutesData() {
  if (import.meta.server || !navigator.onLine) return
  const endpoints = [
    { url: '/api/configuracion', key: 'global-config' },
    { url: '/api/dashboard', key: 'dashboard' },
    { url: '/api/gastos', key: 'gastos' },
    { url: '/api/ingresos', key: 'ingresos' },
    { url: '/api/historial?meses=6', key: 'historial' },
    { url: '/api/reconciliaciones', key: 'reconciliaciones' }
  ]

  for (const item of endpoints) {
    try {
      const data = await $fetch(item.url)
      if (data) {
        setLocalCachedData(item.key, data)
      }
    } catch {
      // Ignorar errores silenciosamente en prefetch de fondo
    }
  }
}
