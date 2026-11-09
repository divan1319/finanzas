/** Validate the same payroll fields for creation and editing. */
export function validarDatosIngreso(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createError({ statusCode: 400, statusMessage: 'Datos de nómina inválidos' })
  }
  const datos = body as Record<string, unknown>
  const fecha = datos.fecha
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw createError({ statusCode: 400, statusMessage: 'La fecha debe tener el formato AAAA-MM-DD' })
  }
  const fechaDate = new Date(`${fecha}T12:00:00Z`)
  if (Number.isNaN(fechaDate.getTime()) || fechaDate.toISOString().slice(0, 10) !== fecha) {
    throw createError({ statusCode: 400, statusMessage: 'La fecha de nómina no es válida' })
  }
  const monto = typeof datos.monto === 'number' || typeof datos.monto === 'string'
    ? Number(datos.monto)
    : NaN
  if (!Number.isFinite(monto) || monto <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'El monto debe ser un número positivo mayor a 0' })
  }
  if (datos.descripcion != null && typeof datos.descripcion !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'El concepto de nómina debe ser texto' })
  }
  return { fecha, monto, descripcion: (datos.descripcion as string | null | undefined)?.trim() || 'Nómina' }
}
