export default defineEventHandler(async (event) => {
  const path = getRequestPath(event)

  // Proteger únicamente los endpoints de /api, ignorando /api/auth
  if (!path.startsWith('/api') || path.startsWith('/api/auth')) {
    return
  }

  // Verificar la sesión de usuario
  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'No autorizado. Por favor inicia sesión.'
    })
  }
})
