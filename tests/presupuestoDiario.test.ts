import { describe, expect, it } from 'vitest'
import { calcularResumenDiario } from '../shared/utils/presupuestoDiario'

describe('Disponible diario', () => {
  const base = { limite: 200, fechaConsulta: '2026-11-16', diasRestantes: 9 }

  it('reparte el saldo entre los días pendientes incluyendo hoy', () => {
    expect(calcularResumenDiario({ ...base, gastosPeriodo: [] })).toEqual({
      presupuestoHoy: 20, gastadoHoy: 0, disponibleHoy: 20, excesoHoy: 0
    })
  })

  it('resta completas las compras de hoy sin reducir otra vez la base diaria', () => {
    const gastosPeriodo = [
      { fecha: base.fechaConsulta, monto: 3 },
      { fecha: base.fechaConsulta, monto: 4 }
    ]
    expect(calcularResumenDiario({ ...base, gastosPeriodo })).toEqual({
      presupuestoHoy: 20, gastadoHoy: 7, disponibleHoy: 13, excesoHoy: 0
    })
  })

  it('redistribuye el sobrante al día siguiente', () => {
    const gastosPeriodo = [{ fecha: base.fechaConsulta, monto: 7 }]
    expect(calcularResumenDiario({
      ...base, gastosPeriodo, fechaConsulta: '2026-11-17', diasRestantes: 8
    })).toEqual({ presupuestoHoy: 21.44, gastadoHoy: 0, disponibleHoy: 21.44, excesoHoy: 0 })
  })

  it('distingue un presupuesto agotado de un exceso diario', () => {
    expect(calcularResumenDiario({
      ...base, gastosPeriodo: [{ fecha: base.fechaConsulta, monto: 20 }]
    })).toMatchObject({ disponibleHoy: 0, excesoHoy: 0 })
    expect(calcularResumenDiario({
      ...base, gastosPeriodo: [{ fecha: base.fechaConsulta, monto: 25 }]
    })).toEqual({ presupuestoHoy: 20, gastadoHoy: 25, disponibleHoy: 0, excesoHoy: 5 })
  })

  it('no recupera presupuesto si el ciclo ya estaba agotado o excedido antes de hoy', () => {
    for (const monto of [200, 220]) {
      expect(calcularResumenDiario({
        ...base,
        gastosPeriodo: [{ fecha: '2026-11-15', monto }, { fecha: base.fechaConsulta, monto: 7 }]
      })).toEqual({ presupuestoHoy: 0, gastadoHoy: 7, disponibleHoy: 0, excesoHoy: 7 })
    }
  })

  it('permite usar todo el saldo en el último día del ciclo', () => {
    expect(calcularResumenDiario({
      ...base,
      diasRestantes: 0,
      gastosPeriodo: [{ fecha: '2026-11-15', monto: 150 }, { fecha: base.fechaConsulta, monto: 7 }]
    })).toEqual({ presupuestoHoy: 50, gastadoHoy: 7, disponibleHoy: 43, excesoHoy: 0 })
  })

  it('recalcula al editar, eliminar o cambiar la fecha de un gasto', () => {
    expect(calcularResumenDiario({
      ...base, gastosPeriodo: [{ fecha: base.fechaConsulta, monto: 12 }]
    }).disponibleHoy).toBe(8)
    expect(calcularResumenDiario({ ...base, gastosPeriodo: [] }).disponibleHoy).toBe(20)
    expect(calcularResumenDiario({
      ...base, gastosPeriodo: [{ fecha: '2026-11-15', monto: 12 }]
    })).toEqual({ presupuestoHoy: 18.8, gastadoHoy: 0, disponibleHoy: 18.8, excesoHoy: 0 })
  })

  it('mantiene consistencia en centavos y evita excesos residuales', () => {
    expect(calcularResumenDiario({
      ...base, limite: 3, gastosPeriodo: [{ fecha: base.fechaConsulta, monto: 0.1 }, { fecha: base.fechaConsulta, monto: 0.2 }]
    })).toEqual({ presupuestoHoy: 0.3, gastadoHoy: 0.3, disponibleHoy: 0, excesoHoy: 0 })
    expect(calcularResumenDiario({ ...base, limite: 100, diasRestantes: 2, gastosPeriodo: [] }).presupuestoHoy).toBe(33.33)
  })
})
