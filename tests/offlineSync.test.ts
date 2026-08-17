import { describe, it, expect, beforeEach } from 'vitest'

interface OfflineAction {
  id: string
  tipo: 'gasto_create' | 'gasto_update' | 'gasto_delete' | 'ingreso_create' | 'ingreso_delete'
  url: string
  method: 'POST' | 'PUT' | 'DELETE'
  body?: any
  timestamp: number
  descripcion: string
}

describe('Lógica de Cola Offline', () => {
  let queue: OfflineAction[] = []

  beforeEach(() => {
    queue = []
  })

  it('debe encolar acciones en orden FIFO', () => {
    const action1: OfflineAction = {
      id: '1',
      tipo: 'gasto_create',
      url: '/api/gastos',
      method: 'POST',
      body: { monto: 150, descripcion: 'Supermercado' },
      timestamp: 100,
      descripcion: 'Gasto: Supermercado'
    }

    const action2: OfflineAction = {
      id: '2',
      tipo: 'ingreso_create',
      url: '/api/ingresos',
      method: 'POST',
      body: { monto: 2000, descripcion: 'Nómina' },
      timestamp: 200,
      descripcion: 'Ingreso: Nómina'
    }

    queue.push(action1)
    queue.push(action2)

    expect(queue.length).toBe(2)
    expect(queue[0]?.tipo).toBe('gasto_create')
    expect(queue[1]?.tipo).toBe('ingreso_create')
  })

  it('debe procesar y remover elementos completados', () => {
    const action: OfflineAction = {
      id: 'test-123',
      tipo: 'gasto_delete',
      url: '/api/gastos/5',
      method: 'DELETE',
      timestamp: 300,
      descripcion: 'Eliminar gasto'
    }
    queue.push(action)

    // Simulación de remoción tras sync exitoso
    queue = queue.filter(a => a.id !== 'test-123')
    expect(queue.length).toBe(0)
  })
})
