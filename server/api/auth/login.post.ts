export default defineEventHandler(async (event) => {
  // Retardo intencional de 350ms para mitigar ataques de fuerza bruta y ataques de temporización
  await new Promise(resolve => setTimeout(resolve, 350))

  const body = await readBody(event)

  if (!body || typeof body.password !== 'string' || !body.password.trim()) {
    throw createError({
      statusCode: 400,
      message: 'La contraseña es requerida'
    })
  }

  const password = body.password.trim()
  const config = useRuntimeConfig(event)
  const expectedPassword = (config.appPassword || 'admin123').trim()

  if (password !== expectedPassword) {
    throw createError({
      statusCode: 401,
      message: 'Contraseña incorrecta'
    })
  }

  // Establecer sesión segura y cifrada por 60 días
  await setUserSession(
    event,
    {
      user: {
        role: 'owner',
        authenticatedAt: new Date().toISOString()
      }
    },
    {
      maxAge: 60 * 60 * 24 * 60 // 60 días
    }
  )

  return {
    success: true,
    message: 'Sesión iniciada correctamente'
  }
})
