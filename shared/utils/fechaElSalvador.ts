const formatoFecha = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/El_Salvador',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

export function fechaElSalvador(fecha = new Date()): string {
  const partes = formatoFecha.formatToParts(fecha)
  const valor = (tipo: string) => partes.find(parte => parte.type === tipo)!.value
  return `${valor('year')}-${valor('month')}-${valor('day')}`
}

export function milisegundosHastaMananaElSalvador(fecha = new Date()): number {
  // El Salvador usa UTC-6 durante todo el año.
  const inicioHoy = new Date(`${fechaElSalvador(fecha)}T00:00:00-06:00`).getTime()
  return inicioHoy + 24 * 60 * 60 * 1000 - fecha.getTime()
}
