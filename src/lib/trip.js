export const LEG_ALLER = 'aller'
export const LEG_RETOUR = 'retour'
export const LEGACY_DEFAULT_DATE = '2026-07-31'

export function membershipDocId(uid, leg) {
  return `${uid}__${leg}`
}

export function normalizeLeg(value) {
  return value === LEG_RETOUR ? LEG_RETOUR : LEG_ALLER
}

/** Aujourd'hui en YYYY-MM-DD (fuseau local). */
export function todayISO() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isValidISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function isDateNotPast(isoDate, referenceISO = todayISO()) {
  return isValidISODate(isoDate) && isoDate >= referenceISO
}

export function formatDateFR(isoDate) {
  if (!isValidISODate(isoDate)) return ''
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

export function splitISODate(isoDate) {
  if (!isValidISODate(isoDate)) {
    const [year, month, day] = LEGACY_DEFAULT_DATE.split('-')
    return { year, month, day }
  }
  const [year, month, day] = isoDate.split('-')
  return { year, month, day }
}

export function joinISODate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function daysInMonth(year, month) {
  return new Date(Number(year), Number(month), 0).getDate()
}

export function cityLabel(leg) {
  return normalizeLeg(leg) === LEG_RETOUR ? 'Destination' : 'Départ de'
}

export function freeSeats(car) {
  return Math.max(0, car.seats - (car.passengers?.length || 0) - 1)
}
