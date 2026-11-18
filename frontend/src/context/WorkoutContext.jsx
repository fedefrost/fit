import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  addWorkoutExercise,
  deleteWorkoutExercise,
  generateWorkout,
  getWorkout,
  listEquipment,
  listExercises,
  setDayLocation,
  updateWorkoutExercise,
} from '../api/workout'
import { currentWeekIso, todayIso } from '../lib/dates'
import { useSelectedProfile } from './SelectedProfileContext'

const WorkoutContext = createContext(null)

/** Calorías quemadas (ejercicios hechos) y planificadas de un día. */
export function workoutDaySummary(day) {
  const entries = day?.entries ?? []
  return {
    burned: entries.filter((entry) => entry.done).reduce((total, entry) => total + entry.calories, 0),
    planned: entries.reduce((total, entry) => total + entry.calories, 0),
  }
}

/**
 * Rutina de la semana en curso del perfil elegido, compartida por la página de rutina y la
 * barra superior (calorías quemadas hoy). También guarda los catálogos de ejercicios y equipamiento.
 */
export function WorkoutProvider({ children }) {
  const { selected } = useSelectedProfile()
  const profileId = selected?.profile.id ?? null
  const week = useMemo(() => currentWeekIso(), [])

  const [workout, setWorkout] = useState(null)
  const [exercises, setExercises] = useState([])
  const [equipment, setEquipment] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const current = ++requestId.current
    if (!profileId) {
      setWorkout(null)
      setStatus('idle')
      return
    }
    setStatus('loading')
    try {
      const [nextWorkout, nextExercises, nextEquipment] = await Promise.all([
        getWorkout(profileId, week),
        listExercises(),
        listEquipment(),
      ])
      if (current !== requestId.current) return
      setWorkout(nextWorkout)
      setExercises(nextExercises)
      setEquipment(nextEquipment)
      setStatus('ready')
    } catch (loadError) {
      if (current !== requestId.current) return
      setError(loadError)
      setStatus('error')
    }
  }, [profileId, week])

  useEffect(() => {
    load()
  }, [load])

  const apply = useCallback(async (call) => {
    const next = await call()
    setWorkout(next)
    return next
  }, [])

  const actions = useMemo(
    () => ({
      setLocation: (date, location) => apply(() => setDayLocation(profileId, week, date, location)),
      generate: (date, muscles) => apply(() => generateWorkout(profileId, week, date, muscles)),
      addExercise: (date, exerciseId, measures) => apply(() => addWorkoutExercise(profileId, week, date, exerciseId, measures)),
      updateEntry: (entryId, patch) => apply(() => updateWorkoutExercise(profileId, entryId, patch)),
      removeEntry: (entryId) => apply(() => deleteWorkoutExercise(profileId, entryId)),
    }),
    [apply, profileId, week],
  )

  const value = useMemo(() => {
    const today = todayIso()
    const todayDay = workout?.days.find((day) => day.date === today)
    return {
      week,
      today,
      workout,
      status,
      error,
      reload: load,
      exercises,
      exercisesById: new Map(exercises.map((exercise) => [exercise.id, exercise])),
      equipment,
      equipmentById: new Map(equipment.map((item) => [item.id, item])),
      personalizedById: new Map((workout?.personalized ?? []).map((item) => [item.exerciseId, item])),
      todayBurned: workout ? workoutDaySummary(todayDay).burned : null,
      ...actions,
    }
  }, [week, workout, status, error, load, exercises, equipment, actions])

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
}

export function useWorkout() {
  const context = useContext(WorkoutContext)
  if (!context) throw new Error('useWorkout debe usarse dentro de <WorkoutProvider>')
  return context
}
