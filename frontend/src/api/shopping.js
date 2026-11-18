import { request } from './client'

// Todas devuelven la lista completa: { weekStart, people, days, hasDiet, ingredients, items }

export const getShopping = (profileId, week) => request(`/profiles/${profileId}/shopping?week=${week}`)

/** settings: { people?, days?, uncheckAll? } */
export const updateShopping = (profileId, week, settings) =>
  request(`/profiles/${profileId}/shopping`, { method: 'PUT', body: { week, ...settings } })

export const checkIngredient = (profileId, week, key, checked) =>
  request(`/profiles/${profileId}/shopping/checks`, { method: 'PUT', body: { week, key, checked } })

/** item: { foodId } o { name }, con `amount` opcional */
export const addShoppingItem = (profileId, week, item) =>
  request(`/profiles/${profileId}/shopping/items`, { method: 'POST', body: { week, ...item } })

export const updateShoppingItem = (profileId, itemId, patch) =>
  request(`/profiles/${profileId}/shopping/items/${itemId}`, { method: 'PATCH', body: patch })

export const deleteShoppingItem = (profileId, itemId) =>
  request(`/profiles/${profileId}/shopping/items/${itemId}`, { method: 'DELETE' })
