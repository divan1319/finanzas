export interface PeriodoRango {
  inicio: string // YYYY-MM-DD
  fin: string // YYYY-MM-DD
  inicioDate: Date
  finDate: Date
  diasTotales: number
  diasRestantes: number
  diasTranscurridos: number
  etiqueta: string
  nominaYear: number
  nominaMonth: number
}

export interface CicloFacturacionRango {
  tarjetaCodigo?: string
  diaCorte?: number
  inicio: string // YYYY-MM-DD
  fin: string // YYYY-MM-DD
  inicioDate: Date
  finDate: Date
  etiqueta: string
}

export interface TarjetaInfo {
  id?: number
  codigo?: string
  nombre: string
  dia_corte: number
  dia_pago_propio_tipo: 'dia_siguiente_corte' | 'dia_nomina' | string
  dia_vencimiento_pago?: number | null
  es_principal?: boolean
  color?: string | null
}

export interface PeriodoPagoGasto {
  fechaGasto: string
  diaCorte: number
  fechaCorte: string
  fechaPagoEstimada: string
  nominaPago: {
    year: number
    month: number
    fechaNomina: string
  }
  esDiferido: boolean
  etiquetaPago: string
}

export interface TarjetaSugeridaResultado {
  tarjeta: TarjetaInfo | null
  codigo: string
  esPrincipal: boolean
  motivo: string
  proximoCambio: {
    tarjetaNuevaNombre: string
    tarjetaNuevaCodigo: string
    fechaCambio: string
    diasFaltantes: number
  }
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
 * Cálculo del día de nómina
 * Nómina objetivo: día 26 (por defecto).
 * Si cae sábado (6) -> viernes 25
 * Si cae domingo (0) -> viernes 24
 * Otro caso -> 26
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
 * Calcula con precisión a qué ciclo de corte y nómina de pago pertenece un gasto
 */
export function calcularPeriodoPagoGasto(
  fechaGastoStr: Date | string,
  tarjeta: {
    dia_corte: number
    dia_pago_propio_tipo?: string
    es_principal?: boolean
  },
  diaObjetivoNomina = 26
): PeriodoPagoGasto {
  const date = typeof fechaGastoStr === 'string' ? parseISODate(fechaGastoStr) : new Date(fechaGastoStr.getTime())
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()

  const diaCorte = tarjeta.dia_corte || 5
  const esTipoSiguiente = tarjeta.dia_pago_propio_tipo === 'dia_siguiente_corte' || tarjeta.es_principal

  let corteYear = y
  let corteMonth = m
  let esDiferido = false

  if (d <= diaCorte) {
    // Pertenece al corte de este mes
    corteYear = y
    corteMonth = m
    esDiferido = false
  } else {
    // Pertenece al corte del próximo mes
    if (m === 12) {
      corteYear = y + 1
      corteMonth = 1
    } else {
      corteYear = y
      corteMonth = m + 1
    }
    esDiferido = true
  }

  const fechaCorteObj = new Date(corteYear, corteMonth - 1, diaCorte, 12, 0, 0)
  const fechaCorteStr = formatDateISO(fechaCorteObj)

  let fechaPagoObj: Date
  let nominaYear: number
  let nominaMonth: number

  const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]

  if (esTipoSiguiente) {
    // Se paga el día siguiente al corte (ej. día 6)
    fechaPagoObj = new Date(corteYear, corteMonth - 1, diaCorte + 1, 12, 0, 0)
    // Financiado con la nómina del mes anterior a la fecha de pago
    if (corteMonth === 1) {
      nominaYear = corteYear - 1
      nominaMonth = 12
    } else {
      nominaYear = corteYear
      nominaMonth = corteMonth - 1
    }
  } else {
    // Se paga el día de nómina correspondiente a ese corte
    nominaYear = corteYear
    nominaMonth = corteMonth
    const dNom = diaNomina(nominaYear, nominaMonth, diaObjetivoNomina)
    fechaPagoObj = new Date(nominaYear, nominaMonth - 1, dNom, 12, 0, 0)
  }

  const nomDate = fechaNomina(nominaYear, nominaMonth, diaObjetivoNomina)
  const fechaNominaStr = formatDateISO(nomDate)
  const fechaPagoStr = formatDateISO(fechaPagoObj)

  const etiquetaPago = esTipoSiguiente
    ? `Se paga el ${fechaPagoObj.getDate()} de ${MESES[fechaPagoObj.getMonth()]} (con presupuesto de nómina previa)`
    : `Se paga el ${fechaPagoObj.getDate()} de ${MESES[fechaPagoObj.getMonth()]} (Nómina de ${MESES[nominaMonth - 1]})`

  return {
    fechaGasto: formatDateISO(date),
    diaCorte,
    fechaCorte: fechaCorteStr,
    fechaPagoEstimada: fechaPagoStr,
    nominaPago: {
      year: nominaYear,
      month: nominaMonth,
      fechaNomina: fechaNominaStr
    },
    esDiferido,
    etiquetaPago
  }
}

/**
 * Determina dinámicamente cuál tarjeta conviene usar hoy según la configuración de tarjetas
 */
export function tarjetaSugeridaEn(
  fechaRef: Date | string,
  tarjetas: TarjetaInfo[] = [],
  diaObjetivoNomina = 26
): TarjetaSugeridaResultado {
  const date = typeof fechaRef === 'string' ? parseISODate(fechaRef) : new Date(fechaRef.getTime())
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const P = diaNomina(year, month, diaObjetivoNomina)

  // Identificar tarjeta principal y secundarias con fallback a tarjetas A y B por defecto
  const listaEfectiva: TarjetaInfo[] = tarjetas.length > 0
    ? tarjetas
    : [
        { id: 1, codigo: 'A', nombre: 'Tarjeta A', dia_corte: 5, dia_pago_propio_tipo: 'dia_siguiente_corte', es_principal: true },
        { id: 2, codigo: 'B', nombre: 'Tarjeta B', dia_corte: 9, dia_pago_propio_tipo: 'dia_nomina', es_principal: false }
      ]

  const principal: TarjetaInfo = listaEfectiva.find(t => t.es_principal) || listaEfectiva.find(t => t.codigo === 'A') || listaEfectiva[0]!
  const secundarias = listaEfectiva.filter(t => t.id !== principal.id)
  const secundaria: TarjetaInfo | null = secundarias[0] || null

  const cortePrincipal = principal.dia_corte ?? 5
  const diaCambioPrincipal = cortePrincipal + 1

  let tarjetaElegida: TarjetaInfo = principal
  let motivo = ''
  let tarjetaNuevaNombre = ''
  let tarjetaNuevaCodigo = ''
  let fechaCambio: Date

  // Regla de sugerencia:
  // Si day >= diaCambioPrincipal y day < P -> Sugerir Tarjeta Principal
  // En cualquier otro caso (day >= P o day < diaCambioPrincipal) -> Sugerir Tarjeta Secundaria (si existe)
  if (day >= diaCambioPrincipal && day < P) {
    tarjetaElegida = principal
    motivo = `Liquidada el día ${diaCambioPrincipal}. Las compras de hoy se pagarán hasta el ${diaCambioPrincipal} del próximo mes.`

    // Cambiará a la secundaria el día de nómina P
    tarjetaNuevaNombre = secundaria?.nombre || 'Tarjeta Secundaria'
    tarjetaNuevaCodigo = secundaria?.codigo || 'B'
    fechaCambio = new Date(year, month - 1, P, 12, 0, 0)
  } else {
    tarjetaElegida = secundaria || principal
    motivo = `El corte ya ocurrió. Las compras de hoy se pagarán hasta la nómina del próximo mes.`

    // Cambiará a la principal el día diaCambioPrincipal
    tarjetaNuevaNombre = principal.nombre || 'Tarjeta Principal'
    tarjetaNuevaCodigo = principal.codigo || 'A'
    if (day < diaCambioPrincipal) {
      fechaCambio = new Date(year, month - 1, diaCambioPrincipal, 12, 0, 0)
    } else {
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      fechaCambio = new Date(nextYear, nextMonth - 1, diaCambioPrincipal, 12, 0, 0)
    }
  }

  const hoyMid = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
  const diffTime = fechaCambio.getTime() - hoyMid.getTime()
  const diasFaltantes = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)))

  return {
    tarjeta: tarjetaElegida,
    codigo: tarjetaElegida?.codigo || 'A',
    esPrincipal: Boolean(tarjetaElegida?.es_principal || tarjetaElegida?.id === principal?.id),
    motivo,
    proximoCambio: {
      tarjetaNuevaNombre,
      tarjetaNuevaCodigo,
      fechaCambio: formatDateISO(fechaCambio),
      diasFaltantes
    }
  }
}

/**
 * Compatibilidad hacia atrás para tarjeta activa
 */
export function tarjetaActivaEn(
  fecha: Date | string,
  diaObjetivoNomina = 26
): 'A' | 'B' {
  const res = tarjetaSugeridaEn(fecha, [], diaObjetivoNomina)
  return res.codigo === 'B' ? 'B' : 'A'
}

/**
 * Compatibilidad hacia atrás para cálculo de próximo cambio
 */
export function proximoCambioTarjeta(
  fecha: Date | string,
  diaObjetivoNomina = 26
): { tarjetaNueva: 'A' | 'B'; fechaCambio: string; diasFaltantes: number } {
  const res = tarjetaSugeridaEn(fecha, [], diaObjetivoNomina)
  return {
    tarjetaNueva: res.proximoCambio.tarjetaNuevaCodigo === 'B' ? 'B' : 'A',
    fechaCambio: res.proximoCambio.fechaCambio,
    diasFaltantes: res.proximoCambio.diasFaltantes
  }
}

/**
 * Período de gasto (para el límite de ahorro y nómina)
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
  let nominaYear: number
  let nominaMonth: number

  if (day >= P_mes_actual) {
    inicio = new Date(year, month - 1, P_mes_actual, 12, 0, 0)
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const P_next = diaNomina(nextYear, nextMonth, diaObjetivoNomina)
    fin = new Date(nextYear, nextMonth - 1, P_next - 1, 12, 0, 0)
    nominaYear = nextYear
    nominaMonth = nextMonth
  } else {
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const P_prev = diaNomina(prevYear, prevMonth, diaObjetivoNomina)
    inicio = new Date(prevYear, prevMonth - 1, P_prev, 12, 0, 0)
    fin = new Date(year, month - 1, P_mes_actual - 1, 12, 0, 0)
    nominaYear = year
    nominaMonth = month
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
    etiqueta,
    nominaYear,
    nominaMonth
  }
}

/**
 * Determina si un gasto debe pagarse y computarse en el período de nómina indicado
 */
export function perteneceAlPeriodoNomina(
  fechaGasto: string | Date,
  tarjeta: {
    dia_corte: number
    dia_pago_propio_tipo?: string
    es_principal?: boolean
  } | null | undefined,
  periodo: PeriodoRango,
  diaObjetivoNomina = 26
): boolean {
  if (!tarjeta) {
    const f = typeof fechaGasto === 'string' ? fechaGasto : formatDateISO(fechaGasto)
    return f >= periodo.inicio && f <= periodo.fin
  }
  const infoPago = calcularPeriodoPagoGasto(fechaGasto, tarjeta, diaObjetivoNomina)
  return infoPago.nominaPago.year === periodo.nominaYear && infoPago.nominaPago.month === periodo.nominaMonth
}

/**
 * Ciclo de facturación por tarjeta (para reconciliación)
 */
export function cicloFacturacion(
  tarjetaCodigoOrDiaCorte: 'A' | 'B' | string | number,
  fecha: Date | string = new Date()
): CicloFacturacionRango {
  const date = typeof fecha === 'string' ? parseISODate(fecha) : new Date(fecha.getTime())
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  let diaCorte = 5
  let tarjetaCodigo = typeof tarjetaCodigoOrDiaCorte === 'string' ? tarjetaCodigoOrDiaCorte : undefined

  if (typeof tarjetaCodigoOrDiaCorte === 'number') {
    diaCorte = tarjetaCodigoOrDiaCorte
  } else if (tarjetaCodigoOrDiaCorte === 'A') {
    diaCorte = 5
  } else if (tarjetaCodigoOrDiaCorte === 'B') {
    diaCorte = 9
  }

  const diaInicio = diaCorte + 1
  let inicio: Date
  let fin: Date

  if (day >= diaInicio) {
    inicio = new Date(year, month - 1, diaInicio, 12, 0, 0)
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    fin = new Date(nextYear, nextMonth - 1, diaCorte, 12, 0, 0)
  } else {
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    inicio = new Date(prevYear, prevMonth - 1, diaInicio, 12, 0, 0)
    fin = new Date(year, month - 1, diaCorte, 12, 0, 0)
  }

  const MESES = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
  ]
  const etiqueta = `Ciclo: ${inicio.getDate()} ${MESES[inicio.getMonth()]} – ${fin.getDate()} ${MESES[fin.getMonth()]} ${fin.getFullYear()}`

  return {
    tarjetaCodigo,
    diaCorte,
    inicio: formatDateISO(inicio),
    fin: formatDateISO(fin),
    inicioDate: inicio,
    finDate: fin,
    etiqueta
  }
}
