// Mismos valores que el backend (backend/lib/workout.ts y backend/lib/exercise.ts).
export const TRAINABLE_MUSCLES = ['legs', 'biceps', 'triceps', 'glutes', 'chest', 'back', 'abs', 'shoulders']
export const ALL_MUSCLES = [...TRAINABLE_MUSCLES, 'general']
export const MAX_MUSCLES = 2
export const LOCATIONS = ['home', 'gym']

const REST = { minutesPerSet: 1, met: 1.5 }

export const exerciseName = (exercise, language) => (language === 'en' ? exercise.nameEn : exercise.nameEs)
export const exerciseInstructions = (exercise, language) =>
  language === 'en' ? exercise.instructionsEn : exercise.instructionsEs
export const equipmentName = (item, language) => (language === 'en' ? item.nameEn : item.nameEs)

export const exerciseImage = (exercise) => `/exercises/${exercise.slug}.png`
export const exerciseAnimation = (exercise) => `/exercises/${exercise.slug}.gif`

/** Campos que se registran según el tipo de ejercicio. */
export function measureFields(measure) {
  if (measure === 'time') return ['minutes']
  if (measure === 'reps') return ['sets', 'reps']
  return ['sets', 'reps', 'weightKg']
}

const LIMITS = {
  minutes: { min: 0.25, max: 300, integer: false },
  sets: { min: 1, max: 20, integer: true },
  reps: { min: 1, max: 200, integer: true },
  weightKg: { min: 0.5, max: 500, integer: false },
}

/** Texto ingresado (acepta coma) → número válido para el campo, o null. */
export function parseMeasureInput(field, raw) {
  const text = String(raw ?? '').trim().replace(',', '.')
  if (!/^\d*\.?\d+$/.test(text)) return null
  const value = Number(text)
  const { min, max, integer } = LIMITS[field]
  if (integer && !Number.isInteger(value)) return null
  if (value < min || value > max) return null
  return integer ? value : Math.round(value * 100) / 100
}

export const measureToInput = (value, language) =>
  value === null || value === undefined ? '' : language === 'es' ? String(value).replace('.', ',') : String(value)

/** Medidas de texto → { campo: número } solo si todos los campos del ejercicio son válidos. */
export function parseMeasures(measure, texts) {
  const out = {}
  for (const field of measureFields(measure)) {
    const value = parseMeasureInput(field, texts[field])
    if (value === null) return null
    out[field] = value
  }
  return out
}

/**
 * Estimación de calorías igual a la del backend, para mostrar antes de guardar:
 * trabajo (tiempo o series × reps × s/rep) × kcal/min del perfil × intensidad por carga
 * + descanso entre series (1 min a 1,5 MET por serie).
 */
export function estimateCalories(exercise, measures, personal, bodyWeight) {
  if (!personal || !measures) return 0
  const work =
    exercise.measure === 'time'
      ? measures.minutes ?? 0
      : ((measures.sets ?? 0) * (measures.reps ?? 0) * exercise.secondsPerRep) / 60
  const intensity =
    exercise.measure === 'reps_weight' && measures.weightKg ? 1 + 0.5 * Math.min(1, measures.weightKg / bodyWeight) : 1
  const restMinutes = exercise.measure === 'time' ? 0 : (measures.sets ?? 0) * REST.minutesPerSet
  const restKcalPerMinute = (personal.kcalPerMinute * REST.met) / exercise.met
  return Math.round(work * personal.kcalPerMinute * intensity + restMinutes * restKcalPerMinute)
}

/** "20 min", "3 × 12", "3 × 12 · 8 kg" con el formato numérico del idioma. */
export function formatMeasures(exercise, entry, t, format) {
  if (exercise.measure === 'time') return t('routine.summary.time', { minutes: format(entry.minutes) })
  if (exercise.measure === 'reps') return t('routine.summary.reps', { sets: entry.sets, reps: entry.reps })
  return t('routine.summary.reps_weight', { sets: entry.sets, reps: entry.reps, kg: format(entry.weightKg) })
}

/** ¿Se puede hacer con este equipamiento? (los de peso corporal siempre). */
export const canDoWith = (exercise, equipmentIds) => exercise.equipmentIds.every((id) => equipmentIds.includes(id))
