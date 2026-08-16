export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return {
    success: true,
    message: 'Sesión cerrada correctamente'
  }
})
