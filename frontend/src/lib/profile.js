import FemaleIcon from '@mui/icons-material/Female'
import MaleIcon from '@mui/icons-material/Male'
import PersonIcon from '@mui/icons-material/Person'
import i18n from '../i18n'

export const MAX_PROFILES = 5

// Las etiquetas se traducen con t(`sex.${value}`).
export const SEX_OPTIONS = [
  { value: 'female', Icon: FemaleIcon },
  { value: 'male', Icon: MaleIcon },
  { value: 'other', Icon: PersonIcon },
]

export function sexIcon(value) {
  return (SEX_OPTIONS.find((option) => option.value === value) ?? SEX_OPTIONS[2]).Icon
}

/** "Perfil 1".."Perfil 5" según la posición en la lista (los perfiles no tienen nombre). */
export function profileLabel(t, index) {
  return t('profiles.label', { n: index + 1 })
}

const locale = () => i18n.resolvedLanguage ?? 'es'

export const formatNumber = (value) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(value)

export const formatBmi = (value) =>
  new Intl.NumberFormat(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)

export const formatDate = (value) => new Intl.DateTimeFormat(locale(), { dateStyle: 'medium' }).format(new Date(value))

/** Valor para un campo de texto: en español con coma decimal. */
export function toInputValue(value) {
  const text = String(value)
  return locale() === 'es' ? text.replace('.', ',') : text
}

// Acepta coma o punto como separador decimal. Vacío => NaN.
function toNumber(raw) {
  const text = String(raw ?? '').trim().replace(',', '.')
  return text === '' ? NaN : Number(text)
}

export const PROFILE_FIELDS = ['weight', 'height', 'age', 'sex']

/**
 * Misma validación que el backend (backend/lib/validation.ts).
 * Los errores son claves de traducción, para que cambien si se cambia de idioma.
 */
export function validateProfile(values) {
  const weight = toNumber(values.weight)
  const height = toNumber(values.height)
  const age = toNumber(values.age)
  const errors = {}

  if (!Number.isFinite(weight) || weight <= 0 || weight > 500) errors.weight = 'validation.weight'
  if (!Number.isFinite(height) || height <= 0 || height > 300) errors.height = 'validation.height'
  if (!Number.isInteger(age) || age < 0 || age > 120) errors.age = 'validation.age'
  if (!SEX_OPTIONS.some((option) => option.value === values.sex)) errors.sex = 'validation.sex'

  return { errors, data: { weight, height, age, sex: values.sex } }
}

/** IMC redondeado a 1 decimal, para que la categoría coincida con el número que se muestra. */
export function bmi(weightKg, heightCm) {
  const meters = heightCm / 100
  return Math.round((weightKg / (meters * meters)) * 10) / 10
}

/** Categorías de IMC de la OMS; solo aplican a adultos. `key` es una clave de traducción. */
export function bmiCategory(value, age) {
  if (age < 18) return { key: 'bmi.minor', color: 'default' }
  if (value < 18.5) return { key: 'bmi.underweight', color: 'info' }
  if (value < 25) return { key: 'bmi.healthy', color: 'success' }
  if (value < 30) return { key: 'bmi.overweight', color: 'warning' }
  return { key: 'bmi.obesity', color: 'error' }
}
