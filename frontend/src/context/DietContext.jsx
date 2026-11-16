import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { addMeal, deleteMeal, generateDiet, getDiet, listRecipes, updateMeal } from '../api/diet'
import { getProfileFoods, listFoods } from '../api/foods'
import { currentWeekIso, todayIso } from '../lib/dates'
import { useSelectedProfile } from './SelectedProfileContext'

const DietContext = createContext(null)

const sumBy = (meals, key) => meals.reduce((total, meal) => total + meal[key], 0)

/** Totales de un día: lo planificado y lo consumido (calorías y agua). */
export function daySummary(day) {
  const meals = day?.meals ?? []
  const consumed = meals.filter((meal) => meal.consumed)
  return {
    plannedCalories: sumBy(meals, 'calories'),
    consumedCalories: sumBy(consumed, 'calories'),
    consumedWaterMl: sumBy(consumed, 'waterMl'),
  }
}

/**
 * Dieta de la semana en curso del perfil elegido, compartida por la página de dieta y el
 * resumen de la barra superior. También guarda los catálogos (recetas y alimentos) y las
 * preferencias del perfil, que se necesitan para mostrar las recetas.
 */
export function DietProvider({ children }) {
  const { selected } = useSelectedProfile()
  const profileId = selected?.profile.id ?? null
  const week = useMemo(() => currentWeekIso(), [])

  const [diet, setDiet] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [foods, setFoods] = useState([])
  const [preferences, setPreferences] = useState({ preferred: new Set(), rejected: new Set() })
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [error, setError] = useState(null)
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const current = ++requestId.current
    if (!profileId) {
      setDiet(null)
      setStatus('idle')
      return
    }
    setStatus('loading')
    try {
      const [nextDiet, nextRecipes, nextFoods, lists] = await Promise.all([
        getDiet(profileId, week),
        listRecipes(),
        listFoods(),
        getProfileFoods(profileId),
      ])
      if (current !== requestId.current) return // llegó tarde: ya se eligió otro perfil
      setDiet(nextDiet)
      setRecipes(nextRecipes)
      setFoods(nextFoods)
      setPreferences({
        preferred: new Set(lists.preferred.map((food) => food.id)),
        rejected: new Set(lists.rejected.map((food) => food.id)),
      })
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

  // Cada acción devuelve la dieta completa desde el backend; se reemplaza la local.
  const apply = useCallback(async (call) => {
    const next = await call()
    setDiet(next)
    return next
  }, [])

  const actions = useMemo(
    () => ({
      generateWeek: () => apply(() => generateDiet(profileId, week)),
      regenerateDay: (date) => apply(() => generateDiet(profileId, week, date)),
      setConsumed: (mealId, consumed) => apply(() => updateMeal(profileId, mealId, { consumed })),
      swapMeal: (mealId, recipeId, servings) =>
        apply(() => updateMeal(profileId, mealId, { recipeId, servings, consumed: true })),
      addExtra: (date, recipeId, servings) => apply(() => addMeal(profileId, { week, date, recipeId, servings })),
      removeExtra: (mealId) => apply(() => deleteMeal(profileId, mealId)),
    }),
    [apply, profileId, week],
  )

  const value = useMemo(() => {
    const today = todayIso()
    const todayDay = diet?.plan?.days.find((day) => day.date === today)
    return {
      week,
      today,
      diet,
      status,
      error,
      reload: load,
      recipesById: new Map(recipes.map((recipe) => [recipe.id, recipe])),
      recipes,
      foods,
      foodsById: new Map(foods.map((food) => [food.id, food])),
      preferences,
      todaySummary: diet ? { ...daySummary(todayDay), targets: diet.targets } : null,
      ...actions,
    }
  }, [week, diet, status, error, load, recipes, foods, preferences, actions])

  return <DietContext.Provider value={value}>{children}</DietContext.Provider>
}

export function useDiet() {
  const context = useContext(DietContext)
  if (!context) throw new Error('useDiet debe usarse dentro de <DietProvider>')
  return context
}
