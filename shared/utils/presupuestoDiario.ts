export interface ResumenDiario {
  presupuestoHoy: number
  gastadoHoy: number
  disponibleHoy: number
  excesoHoy: number
}

/** Recibe todos los gastos ya asignados al período de nómina consultado. */
export function calcularResumenDiario({
  limite,
  gastosPeriodo,
  fechaConsulta,
  diasRestantes
}: {
  limite: number
  gastosPeriodo: ReadonlyArray<{ fecha: string, monto: number }>
  fechaConsulta: string
  diasRestantes: number
}): ResumenDiario {
  // Operar en centavos evita falsos excesos por errores de punto flotante.
  let totalCentavos = 0
  let hoyCentavos = 0
  for (const gasto of gastosPeriodo) {
    const centavos = Math.round(gasto.monto * 100)
    totalCentavos += centavos
    if (gasto.fecha === fechaConsulta) hoyCentavos += centavos
  }

  const saldoAlIniciarHoy = Math.max(0, Math.round(limite * 100) - totalCentavos + hoyCentavos)
  // diasRestantes excluye hoy; el último día del ciclo todavía tiene presupuesto.
  const presupuestoCentavos = Math.round(saldoAlIniciarHoy / (Math.max(0, diasRestantes) + 1))
  const saldoHoy = presupuestoCentavos - hoyCentavos

  return {
    presupuestoHoy: presupuestoCentavos / 100,
    gastadoHoy: hoyCentavos / 100,
    disponibleHoy: Math.max(0, saldoHoy) / 100,
    excesoHoy: Math.max(0, -saldoHoy) / 100
  }
}
