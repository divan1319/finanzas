export interface PeriodoRango {
  inicio: string // YYYY-MM-DD
  fin: string // YYYY-MM-DD
  inicioDate: Date
  finDate: Date
  diasTotales: number
  diasRestantes: number
  diasTranscurridos: number
  etiqueta: string
}

export interface CicloFacturacionRango {
  tarjetaCodigo: 'A' | 'B'
  inicio: string // YYYY-MM-DD
  fin: string // YYYY-MM-DD
  inicioDate: Date
  finDate: Date
  etiqueta: string
}

/**
 * Formatea un objeto Date a YYYY-MM-DD usando la zona local o calendario sin desajustes UTC
 */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Parsea un string YYYY-MM-DD de forma segura a Date en medianoche local
 */
export function parseISODate(dateStr: string): Date {
  const [y = 2026, m = 1, d = 1] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

/**
 * 3.2 Cálculo del día de nómina
 * Nómina objetivo: día 26 (por defecto).
 * Si cae sábado (6) -> viernes 25
 * Si cae domingo (0) -> viernes 24
 * Otro caso -> 26
 *
 * @param year Año (ej. 2026)
 * @param month Mes 1-12
 * @param diaObjetivo Día objetivo (default 26)
 */
export function diaNomina(year: number, month: number, diaObjetivo = 26): number {
  const fecha = new Date(year, month - 1, diaObjetivo, 12, 0, 0)
  const diaSemana = fecha.getDay() // 0 = Domingo, 6 = Sábado
  if (diaSemana === 6) {
    return diaObjetivo - 1
  }
  if (diaSemana === 0) {
    return diaObjetivo - 2
  }
  return diaObjetivo
}

/**
 * Retorna el objeto Date de la nómina para un mes dado
 */
export function fechaNomina(year: number, month: number, diaObjetivo = 26): Date {
  const d = diaNomina(year, month, diaObjetivo)
  return new Date(year, month - 1, d, 12, 0, 0)
}

/**
 * 3.3 Tarjeta Activa (la regla central de la app)
 * - Día 6 de cada mes -> se activa Tarjeta A
 * - Día de nómina (24/25/26) -> se activa Tarjeta B
 * Si d >= 6 y d < diaNomina(mes): Tarjeta A
 * En cualquier otro caso: Tarjeta B (cubre d < 6 arrastrado del mes anterior y d >= nómina)
 */
export function tarjetaActivaEn(
  fecha: Date | string,
  diaObjetivoNomina = 26
): 'A' | 'B' {
  const date = typeof fecha === 'string' ? parseISODate(fecha) : new Date(fecha.getTime())
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const P = diaNomina(year, month, diaObjetivoNomina)

  if (day >= 6 && day < P) {
    return 'A'
  }
  return 'B'
}

/**
 * Calcula la próxima fecha de cambio de tarjeta activa
 */
export function proximoCambioTarjeta(
  fecha: Date | string,
  diaObjetivoNomina = 26
): { tarjetaNueva: 'A' | 'B'; fechaCambio: string; diasFaltantes: number } {
  const date = typeof fecha === 'string' ? parseISODate(fecha) : new Date(fecha.getTime())
  const activeNow = tarjetaActivaEn(date, diaObjetivoNomina)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const P = diaNomina(year, month, diaObjetivoNomina)

  let fechaCambio: Date
  let tarjetaNueva: 'A' | 'B'

  if (activeNow === 'A') {
    // Está en A (entre el 6 y P-1). Cambiará a B el día P de este mes
    tarjetaNueva = 'B'
    fechaCambio = new Date(year, month - 1, P, 12, 0, 0)
  } else {
    // Está en B
    tarjetaNueva = 'A'
    if (day < 6) {
      // Cambiará a A el día 6 de este mismo mes
      fechaCambio = new Date(year, month - 1, 6, 12, 0, 0)
    } else {
      // Cambiará a A el día 6 del próximo mes
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      fechaCambio = new Date(nextYear, nextMonth - 1, 6, 12, 0, 0)
    }
  }

  const hoyMid = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
  const diffTime = fechaCambio.getTime() - hoyMid.getTime()
  const diasFaltantes = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)))

  return {
    tarjetaNueva,
    fechaCambio: formatDateISO(fechaCambio),
    diasFaltantes
  }
}

/**
 * 3.4 Período de gasto (para el límite de ahorro)
 * Va de un día de nómina al día anterior a la siguiente nómina.
 */
export function periodoActual(
  fecha: Date | string = new Date(),
  diaObjetivoNomina = 26
): PeriodoRango {
  const date = typeof fecha === 'string' ? parseISODate(fecha) : new Date(fecha.getTime())
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const P_mes_actual = diaNomina(year, month, diaObjetivoNomina)

  let inicio: Date
  let fin: Date

  if (day >= P_mes_actual) {
    // Inicio: día P de este mes
    inicio = new Date(year, month - 1, P_mes_actual, 12, 0, 0)
    // Fin: día anterior a la nómina del siguiente mes
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const P_next = diaNomina(nextYear, nextMonth, diaObjetivoNomina)
    fin = new Date(nextYear, nextMonth - 1, P_next - 1, 12, 0, 0)
  } else {
    // Inicio: día de nómina del mes anterior
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const P_prev = diaNomina(prevYear, prevMonth, diaObjetivoNomina)
    inicio = new Date(prevYear, prevMonth - 1, P_prev, 12, 0, 0)
    // Fin: día anterior a la nómina de este mes
    fin = new Date(year, month - 1, P_mes_actual - 1, 12, 0, 0)
  }

  const hoyMid = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
  const unDia = 1000 * 60 * 60 * 24
  const diasTotales = Math.round((fin.getTime() - inicio.getTime()) / unDia) + 1
  const diasTranscurridos = Math.min(
    diasTotales,
    Math.max(1, Math.round((hoyMid.getTime() - inicio.getTime()) / unDia) + 1)
  )
  const diasRestantes = Math.max(0, Math.round((fin.getTime() - hoyMid.getTime()) / unDia))

  const MESES = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
  ]
  const etiqueta = `${inicio.getDate()} ${MESES[inicio.getMonth()]} – ${fin.getDate()} ${MESES[fin.getMonth()]} ${fin.getFullYear()}`

  return {
    inicio: formatDateISO(inicio),
    fin: formatDateISO(fin),
    inicioDate: inicio,
    finDate: fin,
    diasTotales,
    diasRestantes,
    diasTranscurridos,
    etiqueta
  }
}

/**
 * 3.5 Ciclo de facturación por tarjeta (para reconciliación, fase 2)
 * - Tarjeta A: del día 6 al día 5 del mes siguiente
 * - Tarjeta B: del día 10 al día 9 del mes siguiente
 */
export function cicloFacturacion(
  tarjetaCodigo: 'A' | 'B',
  fecha: Date | string = new Date()
): CicloFacturacionRango {
  const date = typeof fecha === 'string' ? parseISODate(fecha) : new Date(fecha.getTime())
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  let inicio: Date
  let fin: Date

  if (tarjetaCodigo === 'A') {
    // Corte 5, inicio 6
    if (day >= 6) {
      inicio = new Date(year, month - 1, 6, 12, 0, 0)
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      fin = new Date(nextYear, nextMonth - 1, 5, 12, 0, 0)
    } else {
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      inicio = new Date(prevYear, prevMonth - 1, 6, 12, 0, 0)
      fin = new Date(year, month - 1, 5, 12, 0, 0)
    }
  } else {
    // Tarjeta B: Corte 9, inicio 10
    if (day >= 10) {
      inicio = new Date(year, month - 1, 10, 12, 0, 0)
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      fin = new Date(nextYear, nextMonth - 1, 9, 12, 0, 0)
    } else {
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      inicio = new Date(prevYear, prevMonth - 1, 10, 12, 0, 0)
      fin = new Date(year, month - 1, 9, 12, 0, 0)
    }
  }

  const MESES = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
  ]
  const etiqueta = `Ciclo ${tarjetaCodigo}: ${inicio.getDate()} ${MESES[inicio.getMonth()]} – ${fin.getDate()} ${MESES[fin.getMonth()]} ${fin.getFullYear()}`

  return {
    tarjetaCodigo,
    inicio: formatDateISO(inicio),
    fin: formatDateISO(fin),
    inicioDate: inicio,
    finDate: fin,
    etiqueta
  }
}
