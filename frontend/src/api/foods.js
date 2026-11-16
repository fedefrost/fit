import { request } from './client'

// El catálogo no cambia mientras la app está abierta: se pide una sola vez.
let catalogPromise = null

export function listFoods() {
  if (!catalogPromise) {
    catalogPromise = request('/foods').catch((error) => {
      catalogPromise = null // permitir reintentar
      throw error
    })
  }
  return catalogPromise
}

/** → { preferred: Food[], rejected: Food[] } */
export const getProfileFoods = (profileId) => request(`/profiles/${profileId}/foods`)

/** Reemplaza ambas listas. `preferred` y `rejected` son ids. */
export const updateProfileFoods = (profileId, { preferred, rejected }) =>
  request(`/profiles/${profileId}/foods`, { method: 'PUT', body: { preferred, rejected } })
