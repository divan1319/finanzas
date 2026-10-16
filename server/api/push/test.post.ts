import { enviarPush, pushConfigurado } from '../../utils/webPush'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ endpoint?: string }>(event)

  if (!body?.endpoint) {
    throw createError({
      statusCode: 400,
      message: 'Falta el endpoint de la suscripción'
    })
  }

  if (!pushConfigurado()) {
    throw createError({
      statusCode: 503,
      message: 'Web Push no está configurado en el servidor (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)'
    })
  }

  const resultado = await enviarPush({
    title: 'Notificaciones activas',
    body: 'Así te avisaremos cuando se registre un gasto desde tu correo.',
    url: '/configuracion',
    tag: 'push-prueba'
  }, { endpoint: body.endpoint })

  if (resultado.total === 0 || resultado.eliminadas > 0) {
    throw createError({
      statusCode: 404,
      message: 'Este dispositivo no tiene una suscripción vigente. Desactiva y vuelve a activar las notificaciones.'
    })
  }

  if (resultado.enviadas === 0) {
    throw createError({
      statusCode: 502,
      message: 'El servicio push del navegador rechazó la notificación. Revisa los logs del servidor.'
    })
  }

  return { success: true, ...resultado }
})
