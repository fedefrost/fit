import { request } from './client'

// Catálogos de solo lectura: se piden una sola vez por sesión.
const cache = {}
function cached(key, path) {
  if (!cache[key]) {
    cache[key] = request(path).catch((error) => {
      delete cache[key]
      throw error
    })
  }
  return cache[key]
}

export const listEquipment = () => cached('equipment', '/equipment')
export const listExercises = () => cached('exercises', '/exercises')

/** → { home: Equipment[], gym: Equipment[] } */
export const getProfileEquipment = (profileId) => request(`/profiles/${profileId}/equipment`)
export const updateProfileEquipment = (profileId, { home, gym }) =>
  request(`/profiles/${profileId}/equipment`, { method: 'PUT', body: { home, gym } })

// Todas devuelven la semana completa: { weekStart, fitness, equipment, personalized, days }
export const getWorkout = (profileId, week) => request(`/profiles/${profileId}/workout?week=${week}`)

export const setDayLocation = (profileId, week, date, location) =>
  request(`/profiles/${profileId}/workout/days/${date}`, { method: 'PUT', body: { week, location } })

export const generateWorkout = (profileId, week, date, muscles) =>
  request(`/profiles/${profileId}/workout/days/${date}/generate`, { method: 'POST', body: { week, muscles } })

/** measures: { minutes } | { sets, reps } | { sets, reps, weightKg } según el ejercicio */
export const addWorkoutExercise = (profileId, week, date, exerciseId, measures) =>
  request(`/profiles/${profileId}/workout/days/${date}/exercises`, {
    method: 'POST',
    body: { week, exerciseId, ...measures },
  })

/** patch: { done?, exerciseId?, minutes?, sets?, reps?, weightKg? } */
export const updateWorkoutExercise = (profileId, entryId, patch) =>
  request(`/profiles/${profileId}/workout/exercises/${entryId}`, { method: 'PATCH', body: patch })

export const deleteWorkoutExercise = (profileId, entryId) =>
  request(`/profiles/${profileId}/workout/exercises/${entryId}`, { method: 'DELETE' })
