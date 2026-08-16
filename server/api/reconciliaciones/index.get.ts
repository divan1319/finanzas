import { db, initDatabase } from '../../db'
import { reconciliaciones, tarjetas, gastos } from '../../db/schema'
import { cicloFacturacion } from '#shared/utils/cicloFinanciero'
import { eq, desc, and, gte, lte } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await initDatabase()
  const query = getQuery(event)
  const tarjetaCodigo = query.tarjeta_codigo as 'A' | 'B' | undefined
  const fechaConsulta = (query.fecha as string) || new Date().toISOString().slice(0, 10)

  // 1. Obtener reconciliaciones históricas
  const historialRaw = await db.select({
    id: reconciliaciones.id,
    tarjeta_id: reconciliaciones.tarjeta_id,
    ciclo_inicio: reconciliaciones.ciclo_inicio,
    ciclo_fin: reconciliaciones.ciclo_fin,
    total_banco: reconciliaciones.total_banco,
    total_app_calculado: reconciliaciones.total_app_calculado,
    diferencia: reconciliaciones.diferencia,
    notas: reconciliaciones.notas,
    fecha_registro: reconciliaciones.fecha_registro,
    tarjeta_nombre: tarjetas.nombre,
    tarjeta_codigo: tarjetas.codigo,
    tarjeta_color: tarjetas.color
  })
    .from(reconciliaciones)
    .innerJoin(tarjetas, eq(reconciliaciones.tarjeta_id, tarjetas.id))
    .orderBy(desc(reconciliaciones.ciclo_inicio), desc(reconciliaciones.id))

  // 2. Si se solicita cálculo de ciclo en vivo para una tarjeta
  let cicloCalculado = null
  let gastosDelCiclo: any[] = []
  let totalCalculadoCiclo = 0

  if (tarjetaCodigo === 'A' || tarjetaCodigo === 'B') {
    const infoCiclo = cicloFacturacion(tarjetaCodigo, fechaConsulta)
    const tarjetasResult = await db.select().from(tarjetas).where(eq(tarjetas.codigo, tarjetaCodigo))
    const tarjeta = tarjetasResult[0]

    if (tarjeta) {
      gastosDelCiclo = await db.select()
        .from(gastos)
        .where(
          and(
            eq(gastos.tarjeta_id, tarjeta.id),
            gte(gastos.fecha, infoCiclo.inicio),
            lte(gastos.fecha, infoCiclo.fin)
          )
        )
        .orderBy(desc(gastos.fecha))

      totalCalculadoCiclo = gastosDelCiclo.reduce((sum, g) => sum + g.monto, 0)

      cicloCalculado = {
        tarjeta,
        ...infoCiclo,
        totalApp: totalCalculadoCiclo,
        cantidadGastos: gastosDelCiclo.length,
        gastos: gastosDelCiclo
      }
    }
  }

  return {
    historial: historialRaw,
    cicloCalculado
  }
})
