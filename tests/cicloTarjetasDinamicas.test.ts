import { describe, it, expect } from 'vitest'
import {
  calcularPeriodoPagoGasto,
  tarjetaSugeridaEn,
  perteneceAlPeriodoNomina,
  type TarjetaInfo
} from '../shared/utils/cicloFinanciero'

describe('Modelo Flexible de Tarjetas: Asignación por Fecha de Corte y Nómina', () => {
  const tarjeta1706: TarjetaInfo = {
    id: 1,
    codigo: '1706',
    nombre: 'Mastercard 1706 (Principal)',
    dia_corte: 5,
    dia_pago_propio_tipo: 'dia_siguiente_corte',
    dia_vencimiento_pago: 31,
    es_principal: true,
    color: 'emerald'
  }

  const tarjeta1231: TarjetaInfo = {
    id: 2,
    codigo: '1231',
    nombre: 'Visa 1231 (Corte 9)',
    dia_corte: 9,
    dia_pago_propio_tipo: 'dia_nomina',
    dia_vencimiento_pago: 3,
    es_principal: false,
    color: 'indigo'
  }

  const tarjetaCorteMenor: TarjetaInfo = {
    id: 3,
    codigo: 'NUEVA',
    nombre: 'Tarjeta Corte 2',
    dia_corte: 2,
    dia_pago_propio_tipo: 'dia_nomina',
    dia_vencimiento_pago: 20,
    es_principal: false,
    color: 'amber'
  }

  describe('1. Tarjeta Principal 1706 (Corte 5 / Pago día 6 con nómina previa)', () => {
    it('Gasto el 4 de agosto (antes del corte 5): entra al corte de agosto y se paga el 6 de agosto', () => {
      const res = calcularPeriodoPagoGasto('2026-08-04', tarjeta1706, 26)
      expect(res.fechaCorte).toBe('2026-08-05')
      expect(res.fechaPagoEstimada).toBe('2026-08-06')
      expect(res.esDiferido).toBe(false)
      // Se paga con el presupuesto de la nómina previa (Julio 2026)
      expect(res.nominaPago.year).toBe(2026)
      expect(res.nominaPago.month).toBe(7)
    })

    it('Gasto el 6 de agosto (después del corte 5): entra al corte de septiembre y se paga el 6 de septiembre', () => {
      const res = calcularPeriodoPagoGasto('2026-08-06', tarjeta1706, 26)
      expect(res.fechaCorte).toBe('2026-09-05')
      expect(res.fechaPagoEstimada).toBe('2026-09-06')
      expect(res.esDiferido).toBe(true)
      // Se paga con la nómina de agosto 2026
      expect(res.nominaPago.year).toBe(2026)
      expect(res.nominaPago.month).toBe(8)
    })
  })

  describe('2. Tarjeta Secundaria 1231 con Corte Mayor (Corte 9 / Pago Nómina)', () => {
    it('Gasto el 8 de agosto (antes del corte 9): entra al corte de agosto y se paga en la nómina de agosto (26 ago)', () => {
      const res = calcularPeriodoPagoGasto('2026-08-08', tarjeta1231, 26)
      expect(res.fechaCorte).toBe('2026-08-09')
      expect(res.fechaPagoEstimada).toBe('2026-08-26')
      expect(res.esDiferido).toBe(false)
      expect(res.nominaPago.year).toBe(2026)
      expect(res.nominaPago.month).toBe(8)
    })

    it('Gasto el 10 de agosto (después del corte 9): entra al corte de septiembre y se paga en la nómina de septiembre (25 sep)', () => {
      const res = calcularPeriodoPagoGasto('2026-08-10', tarjeta1231, 26)
      expect(res.fechaCorte).toBe('2026-09-09')
      // Septiembre 2026: nómina el 25 porque 26 es sábado
      expect(res.fechaPagoEstimada).toBe('2026-09-25')
      expect(res.esDiferido).toBe(true)
      expect(res.nominaPago.year).toBe(2026)
      expect(res.nominaPago.month).toBe(9)
    })
  })

  describe('3. Tarjeta Secundaria con Corte Menor a la Principal (Corte 2 / Pago Nómina)', () => {
    it('Gasto el 1 de agosto (antes del corte 2): entra al corte de agosto y se paga en la nómina de agosto (26 ago)', () => {
      const res = calcularPeriodoPagoGasto('2026-08-01', tarjetaCorteMenor, 26)
      expect(res.fechaCorte).toBe('2026-08-02')
      expect(res.fechaPagoEstimada).toBe('2026-08-26')
      expect(res.esDiferido).toBe(false)
      expect(res.nominaPago.year).toBe(2026)
      expect(res.nominaPago.month).toBe(8)
    })

    it('Gasto el 3 de agosto (después del corte 2): entra al corte de septiembre y se paga en la nómina de septiembre', () => {
      const res = calcularPeriodoPagoGasto('2026-08-03', tarjetaCorteMenor, 26)
      expect(res.fechaCorte).toBe('2026-09-02')
      expect(res.fechaPagoEstimada).toBe('2026-09-25')
      expect(res.esDiferido).toBe(true)
      expect(res.nominaPago.year).toBe(2026)
      expect(res.nominaPago.month).toBe(9)
    })
  })

  describe('4. Dinámica de Tarjeta Sugerida en Tiempo Real', () => {
    const lista = [tarjeta1706, tarjeta1231]

    it('El 15 de agosto (entre el 6 y el 25): sugiere la Tarjeta Principal (1706)', () => {
      const sug = tarjetaSugeridaEn('2026-08-15', lista, 26)
      expect(sug.tarjeta?.id).toBe(tarjeta1706.id)
      expect(sug.esPrincipal).toBe(true)
      expect(sug.proximoCambio.tarjetaNuevaNombre).toBe(tarjeta1231.nombre)
      expect(sug.proximoCambio.fechaCambio).toBe('2026-08-26')
    })

    it('El 27 de agosto (después de la nómina del 26): sugiere la Tarjeta Secundaria (1231)', () => {
      const sug = tarjetaSugeridaEn('2026-08-27', lista, 26)
      expect(sug.tarjeta?.id).toBe(tarjeta1231.id)
      expect(sug.esPrincipal).toBe(false)
      expect(sug.proximoCambio.tarjetaNuevaNombre).toBe(tarjeta1706.nombre)
      expect(sug.proximoCambio.fechaCambio).toBe('2026-09-06')
    })

    it('El 3 de septiembre (antes del día 6): sugiere la Tarjeta Secundaria (1231)', () => {
      const sug = tarjetaSugeridaEn('2026-09-03', lista, 26)
      expect(sug.tarjeta?.id).toBe(tarjeta1231.id)
      expect(sug.proximoCambio.fechaCambio).toBe('2026-09-06')
      expect(sug.proximoCambio.diasFaltantes).toBe(3)
    })

    it('El 6 de septiembre: vuelve a sugerir la Tarjeta Principal (1706)', () => {
      const sug = tarjetaSugeridaEn('2026-09-06', lista, 26)
      expect(sug.tarjeta?.id).toBe(tarjeta1706.id)
      expect(sug.esPrincipal).toBe(true)
    })
  })

  describe('5. Cambio dinámico de Tarjeta Principal', () => {
    it('Si la tarjeta de corte 2 se convierte en Principal, el ciclo se ajusta a corte día 2', () => {
      const nuevaPrincipal: TarjetaInfo = {
        ...tarjetaCorteMenor,
        es_principal: true,
        dia_pago_propio_tipo: 'dia_siguiente_corte'
      }
      const antiguaSecundaria: TarjetaInfo = {
        ...tarjeta1706,
        es_principal: false,
        dia_pago_propio_tipo: 'dia_nomina'
      }

      const lista = [nuevaPrincipal, antiguaSecundaria]

      // El día 3 de agosto: como la principal corta el día 2, el día 3 ya es período de la principal
      const sug = tarjetaSugeridaEn('2026-08-03', lista, 26)
      expect(sug.tarjeta?.id).toBe(nuevaPrincipal.id)
      expect(sug.esPrincipal).toBe(true)
    })
  })

  describe('6. Pertenencia de Gastos al Período de Nómina (perteneceAlPeriodoNomina)', () => {
    it('Gastos realizados durante el período actual de nómina (24 jul - 25 ago) pertenecen a dicho período', () => {
      const periodoJulio = {
        inicio: '2026-07-24',
        fin: '2026-08-25',
        inicioDate: new Date('2026-07-24'),
        finDate: new Date('2026-08-25'),
        diasTotales: 33,
        diasRestantes: 6,
        diasTranscurridos: 27,
        etiqueta: '24 jul – 25 ago 2026',
        nominaYear: 2026,
        nominaMonth: 7
      }

      const periodoAgosto = {
        inicio: '2026-08-26',
        fin: '2026-09-24',
        inicioDate: new Date('2026-08-26'),
        finDate: new Date('2026-09-24'),
        diasTotales: 30,
        diasRestantes: 30,
        diasTranscurridos: 1,
        etiqueta: '26 ago – 24 sep 2026',
        nominaYear: 2026,
        nominaMonth: 8
      }

      // Gastos del 4 de agosto, 18 de agosto y 19 de agosto pertenecen al período 24 jul - 25 ago
      expect(perteneceAlPeriodoNomina('2026-08-04', tarjeta1706, periodoJulio, 26)).toBe(true)
      expect(perteneceAlPeriodoNomina('2026-08-18', tarjeta1706, periodoJulio, 26)).toBe(true)
      expect(perteneceAlPeriodoNomina('2026-08-19', tarjeta1706, periodoJulio, 26)).toBe(true)
      expect(perteneceAlPeriodoNomina('2026-08-04', tarjeta1231, periodoJulio, 26)).toBe(true)

      // Gastos fuera del período no pertenecen a él
      expect(perteneceAlPeriodoNomina('2026-08-26', tarjeta1706, periodoJulio, 26)).toBe(false)
      expect(perteneceAlPeriodoNomina('2026-08-26', tarjeta1706, periodoAgosto, 26)).toBe(true)
    })
  })
})
