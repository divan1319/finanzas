import { db, initDatabase } from '../../db'
import { tarjetas, gastos, reconciliaciones } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID de tarjeta inválido'
    })
  }

  // 1. Obtener tarjeta
  const cardList = await db.select().from(tarjetas).where(eq(tarjetas.id, id))
  const tarjeta = cardList[0]
  if (!tarjeta) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Tarjeta no encontrada'
    })
  }

  // 2. Comprobar registros históricos en gastos
  const gastosAsociados = await db.select({ id: gastos.id }).from(gastos).where(eq(gastos.tarjeta_id, id))
  const reconciliacionesAsociadas = await db.select({ id: reconciliaciones.id }).from(reconciliaciones).where(eq(reconciliaciones.tarjeta_id, id))

  const countGastos = gastosAsociados.length
  const countReconciliaciones = reconciliacionesAsociadas.length

  if (countGastos > 0 || countReconciliaciones > 0) {
    const detalles: string[] = []
    if (countGastos > 0) detalles.push(`${countGastos} ${countGastos === 1 ? 'gasto registrado' : 'gastos registrados'}`)
    if (countReconciliaciones > 0) detalles.push(`${countReconciliaciones} ${countReconciliaciones === 1 ? 'reconciliación guardada' : 'reconciliaciones guardadas'}`)

    throw createError({
      statusCode: 400,
      statusMessage: `No se puede eliminar la tarjeta "${tarjeta.nombre}" porque tiene ${detalles.join(' y ')}. Para eliminarla, primero debes reasignar o borrar sus movimientos asociados.`
    })
  }

  // 3. Proceder con el borrado
  await db.delete(tarjetas).where(eq(tarjetas.id, id))

  return {
    success: true,
    message: `Tarjeta "${tarjeta.nombre}" eliminada correctamente.`
  }
})
