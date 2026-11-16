import { MAX_PROFILES } from '../lib/profile'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export class ApiError extends Error {
  /**
   * @param {number} status 0 si no hubo respuesta (servidor caído o sin red).
   * @param {Record<string, string>} [fieldErrors] errores de validación del backend por campo.
   */
  constructor(status, fieldErrors) {
    super(`API error ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

/** Mensaje traducido para un error de la API (los textos del backend están solo en español). */
export function apiErrorMessage(error, t) {
  if (!(error instanceof ApiError)) return t('errors.server', { status: '?' })
  if (error.status === 0) return t('errors.network')
  if (error.status === 409) return t('profiles.limit', { max: MAX_PROFILES })
  if (error.fieldErrors) return t('form.checkFields')
  return t('errors.server', { status: error.status })
}

/** Petición JSON a `${API_URL}/api${path}`. Lanza ApiError si falla. */
export async function request(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0)
  }

  if (response.status === 204) return null

  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, data?.errors)
  return data
}
