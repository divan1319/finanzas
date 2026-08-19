export default defineNuxtRouteMiddleware(async (to) => {
  // Ignorar peticiones de recursos estáticos, manifest, service workers o extensiones
  if (
    to.path.includes('.') ||
    to.path.startsWith('/dev-sw') ||
    to.path.startsWith('/sw') ||
    to.path.startsWith('/manifest')
  ) {
    return
  }

  const { loggedIn, ready, fetch: fetchSession } = useUserSession()

  // Si el estado de la sesión aún no ha sido hidratado / cargado,
  // esperamos a que useUserSession().fetch() concluya para no redirigir falsamente en F5 / reload
  if (!ready.value) {
    await fetchSession()
  }

  if (!loggedIn.value && to.path !== '/login') {
    return navigateTo('/login')
  }

  if (loggedIn.value && to.path === '/login') {
    return navigateTo('/')
  }
})
