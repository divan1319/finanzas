export const useFinanzas = () => {
  const toast = useToast()

  // Estado del modal de gasto
  const expenseModalOpen = useState('expense_modal_open', () => false)
  const expenseModalData = useState<any>('expense_modal_data', () => null)

  // Estado del modal de ingreso
  const incomeModalOpen = useState('income_modal_open', () => false)

  // Trigger para refrescar datos en páginas
  const refreshKey = useState('finanzas_refresh_key', () => 0)

  const triggerRefresh = () => {
    refreshKey.value++
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
    const [y, m, d] = parts.map(Number)
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
    refreshKey,
    triggerRefresh,
    openNewExpenseModal,
    openEditExpenseModal,
    closeExpenseModal,
    openIncomeModal,
    closeIncomeModal,
    formatCurrency,
    formatDate
  }
}
