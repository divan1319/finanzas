export const useFinanzas = () => {
  const toast = useToast()

  // Estado del modal de gasto
  const expenseModalOpen = useState('expense_modal_open', () => false)
  const expenseModalData = useState<any>('expense_modal_data', () => null)

  // Estado del modal de ingreso
  const incomeModalOpen = useState('income_modal_open', () => false)

  // Estado del modal de presupuesto por período
  const budgetModalOpen = useState('budget_modal_open', () => false)
  const budgetModalData = useState<any>('budget_modal_data', () => null)

  // Trigger para refrescar datos en páginas
  const refreshKey = useState('finanzas_refresh_key', () => 0)

  const triggerRefresh = async (keys?: string | string[]) => {
    refreshKey.value++
    if (keys) {
      await refreshNuxtData(keys)
    } else {
      await refreshNuxtData()
    }
  }

  const openNewExpenseModal = (prefill?: Partial<{ fecha: string; tarjeta_id: number; monto: number; descripcion: string; categoria: string }>) => {
    expenseModalData.value = prefill || null
    expenseModalOpen.value = true
  }

  const openEditExpenseModal = (expense: any) => {
    expenseModalData.value = { ...expense }
    expenseModalOpen.value = true
  }

  const closeExpenseModal = () => {
    expenseModalOpen.value = false
    expenseModalData.value = null
  }

  const openIncomeModal = () => {
    incomeModalOpen.value = true
  }

  const closeIncomeModal = () => {
    incomeModalOpen.value = false
  }

  const openBudgetModal = (periodoData: { inicio: string; fin: string; etiqueta?: string; limite?: number; tienePresupuestoPersonalizado?: boolean }) => {
    budgetModalData.value = { ...periodoData }
    budgetModalOpen.value = true
  }

  const closeBudgetModal = () => {
    budgetModalOpen.value = false
    budgetModalData.value = null
  }

  const formatCurrency = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val)
  }

  const formatDate = (isoDate: string | undefined): string => {
    if (!isoDate) return ''
    const parts = isoDate.split('-')
    if (parts.length < 3) return isoDate
    const [y = 2026, m = 1, d = 1] = parts.map(Number)
    const date = new Date(y, m - 1, d)
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date)
  }

  return {
    expenseModalOpen,
    expenseModalData,
    incomeModalOpen,
    budgetModalOpen,
    budgetModalData,
    refreshKey,
    triggerRefresh,
    openNewExpenseModal,
    openEditExpenseModal,
    closeExpenseModal,
    openIncomeModal,
    closeIncomeModal,
    openBudgetModal,
    closeBudgetModal,
    formatCurrency,
    formatDate
  }
}
