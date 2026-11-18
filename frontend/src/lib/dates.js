// Fechas "de calendario" (sin hora) en la zona horaria local, como "YYYY-MM-DD".
// La semana empieza el lunes; el backend recibe ese lunes y no depende de su propia zona horaria.

export function toIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromIsoDate(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function startOfWeek(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

export const todayIso = () => toIsoDate(new Date())

export const currentWeekIso = () => toIsoDate(startOfWeek(new Date()))

export function addDaysIso(iso, days) {
  const date = fromIsoDate(iso)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

export const formatDay = (iso, language, options) => new Intl.DateTimeFormat(language, options).format(fromIsoDate(iso))

/** "martes, 17 de noviembre" → "Martes, 17 de noviembre" (solo la primera letra). */
export const capitalizeFirst = (text) => text.charAt(0).toUpperCase() + text.slice(1)
