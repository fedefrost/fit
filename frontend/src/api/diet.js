import { request } from './client'

// El catálogo de recetas no cambia mientras la app está abierta: se pide una sola vez.
let recipesPromise = null

export function listRecipes() {
  if (!recipesPromise) {
    recipesPromise = request('/recipes').catch((error) => {
      recipesPromise = null
      throw error
    })
  }
  return recipesPromise
}

// Todas devuelven la dieta completa: { weekStart, targets, plan: null | { days: [...] } }

export const getDiet = (profileId, week) => request(`/profiles/${profileId}/diet?week=${week}`)

/** Sin `date` genera la semana entera; con `date` solo ese día. */
export const generateDiet = (profileId, week, date) =>
  request(`/profiles/${profileId}/diet/generate`, { method: 'POST', body: date ? { week, date } : { week } })

/** patch: { consumed?, recipeId?, servings? } */
export const updateMeal = (profileId, mealId, patch) =>
  request(`/profiles/${profileId}/diet/meals/${mealId}`, { method: 'PATCH', body: patch })

export const addMeal = (profileId, { week, date, recipeId, servings }) =>
  request(`/profiles/${profileId}/diet/meals`, { method: 'POST', body: { week, date, recipeId, servings } })

export const deleteMeal = (profileId, mealId) =>
  request(`/profiles/${profileId}/diet/meals/${mealId}`, { method: 'DELETE' })
