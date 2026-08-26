import { describe, it, expect } from 'vitest'
import {
  diaNomina,
  tarjetaActivaEn,
  proximoCambioTarjeta,
  periodoActual,
  cicloFacturacion,
  generarHistorialPeriodos,
  formatDateISO,
  parseISODate
} from '../shared/utils/cicloFinanciero'

describe('Reglas de Negocio - Ciclo Financiero', () => {
  describe('3.2 Cálculo del día de nómina', () => {
    it('Agosto 2026: 26 de agosto es miércoles -> día 26', () => {
      expect(diaNomina(2026, 8)).toBe(26)
    })

    it('Septiembre 2026: 26 de septiembre es sábado -> día 25 (viernes)', () => {
      expect(diaNomina(2026, 9)).toBe(25)
    })

    it('Julio 2026: 26 de julio es domingo -> día 24 (viernes)', () => {
      expect(diaNomina(2026, 7)).toBe(24)
    })

    it('Octubre 2026: 26 de octubre es lunes -> día 26', () => {
      expect(diaNomina(2026, 10)).toBe(26)
    })
  })

  describe('3.3 Tarjeta activa en una fecha dada', () => {
    it('26 ago – 5 sep 2026: Tarjeta B activa', () => {
      expect(tarjetaActivaEn('2026-08-26')).toBe('B')
      expect(tarjetaActivaEn('2026-08-31')).toBe('B')
      expect(tarjetaActivaEn('2026-09-01')).toBe('B')
      expect(tarjetaActivaEn('2026-09-05')).toBe('B')
    })

    it('6 sep (paga Tarjeta A) – 24 sep 2026: Tarjeta A activa', () => {
      expect(tarjetaActivaEn('2026-09-06')).toBe('A')
      expect(tarjetaActivaEn('2026-09-15')).toBe('A')
      expect(tarjetaActivaEn('2026-09-24')).toBe('A')
    })

    it('25 sep (nómina de septiembre) – 5 oct 2026: Tarjeta B activa', () => {
      expect(tarjetaActivaEn('2026-09-25')).toBe('B')
      expect(tarjetaActivaEn('2026-09-30')).toBe('B')
      expect(tarjetaActivaEn('2026-10-01')).toBe('B')
      expect(tarjetaActivaEn('2026-10-05')).toBe('B')
    })

    it('6 oct – 25 oct 2026: Tarjeta A activa', () => {
      expect(tarjetaActivaEn('2026-10-06')).toBe('A')
      expect(tarjetaActivaEn('2026-10-25')).toBe('A')
    })

    it('26 oct 2026 (nómina): Tarjeta B activa', () => {
      expect(tarjetaActivaEn('2026-10-26')).toBe('B')
    })
  })

  describe('3.4 Período de gasto', () => {
    it('Calcula período correcto para 26 ago 2026 (va de 26 ago al 24 sep)', () => {
      const periodo = periodoActual('2026-08-26')
      expect(periodo.inicio).toBe('2026-08-26')
      expect(periodo.fin).toBe('2026-09-24') // 25 sep es nómina
    })

    it('Calcula período correcto para 5 sep 2026 (mismo período: 26 ago al 24 sep)', () => {
      const periodo = periodoActual('2026-09-05')
      expect(periodo.inicio).toBe('2026-08-26')
      expect(periodo.fin).toBe('2026-09-24')
    })

    it('Calcula período correcto para 19 ago 2026 (va de 24 jul al 25 ago)', () => {
      const periodo = periodoActual('2026-08-19')
      expect(periodo.inicio).toBe('2026-07-24')
      expect(periodo.fin).toBe('2026-08-25') // 26 ago es nómina
    })
  })

  describe('3.5 Ciclo de facturación por tarjeta (Reconciliación)', () => {
    it('Tarjeta A: del día 6 al 5 del mes siguiente', () => {
      const ciclo1 = cicloFacturacion('A', '2026-08-15')
      expect(ciclo1.inicio).toBe('2026-08-06')
      expect(ciclo1.fin).toBe('2026-09-05')

      const ciclo2 = cicloFacturacion('A', '2026-09-03')
      expect(ciclo2.inicio).toBe('2026-08-06')
      expect(ciclo2.fin).toBe('2026-09-05')
    })

    it('Tarjeta B: del día 10 al 9 del mes siguiente', () => {
      const ciclo1 = cicloFacturacion('B', '2026-08-15')
      expect(ciclo1.inicio).toBe('2026-08-10')
      expect(ciclo1.fin).toBe('2026-09-09')

      const ciclo2 = cicloFacturacion('B', '2026-09-05')
      expect(ciclo2.inicio).toBe('2026-08-10')
      expect(ciclo2.fin).toBe('2026-09-09')
    })
  })

  describe('Próximo cambio de tarjeta', () => {
    it('El 15 de septiembre (Tarjeta A activa), próximo cambio es a Tarjeta B el 25 sep', () => {
      const cambio = proximoCambioTarjeta('2026-09-15')
      expect(cambio.tarjetaNueva).toBe('B')
      expect(cambio.fechaCambio).toBe('2026-09-25')
      expect(cambio.diasFaltantes).toBe(10)
    })

    it('El 28 de agosto (Tarjeta B activa), próximo cambio es a Tarjeta A el 6 sep', () => {
      const cambio = proximoCambioTarjeta('2026-08-28')
      expect(cambio.tarjetaNueva).toBe('A')
      expect(cambio.fechaCambio).toBe('2026-09-06')
      expect(cambio.diasFaltantes).toBe(9)
    })
  })

  describe('3.6 Historial de períodos consecutivos', () => {
    it('Genera lista consecutiva de períodos sin saltarse ningún mes', () => {
      const historial = generarHistorialPeriodos('2026-08-26', 6, 26)
      expect(historial).toHaveLength(6)

      // Período 1: Actual (26 ago – 24 sep 2026)
      expect(historial[0]?.inicio).toBe('2026-08-26')
      expect(historial[0]?.fin).toBe('2026-09-24')

      // Período 2: El inmediatamente anterior (24 jul – 25 ago 2026)
      expect(historial[1]?.inicio).toBe('2026-07-24')
      expect(historial[1]?.fin).toBe('2026-08-25')

      // Período 3: (26 jun – 23 jul 2026)
      expect(historial[2]?.inicio).toBe('2026-06-26')
      expect(historial[2]?.fin).toBe('2026-07-23')

      // Período 4: (26 may – 25 jun 2026)
      expect(historial[3]?.inicio).toBe('2026-05-26')
      expect(historial[3]?.fin).toBe('2026-06-25')

      // Período 5: (24 abr – 25 may 2026)
      expect(historial[4]?.inicio).toBe('2026-04-24')
      expect(historial[4]?.fin).toBe('2026-05-25')

      // Período 6: (26 mar – 23 abr 2026)
      expect(historial[5]?.inicio).toBe('2026-03-26')
      expect(historial[5]?.fin).toBe('2026-04-23')
    })
  })
})
