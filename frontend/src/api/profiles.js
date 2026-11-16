import { request } from './client'

export { ApiError, apiErrorMessage } from './client'

export const listProfiles = () => request('/profiles')
export const createProfile = (input) => request('/profiles', { method: 'POST', body: input })
export const updateProfile = (id, input) => request(`/profiles/${id}`, { method: 'PUT', body: input })
export const deleteProfile = (id) => request(`/profiles/${id}`, { method: 'DELETE' })
