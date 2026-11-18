import { request } from './client'

/** month: "YYYY-MM" → { month, days: [{ date, targets, consumed, plannedCalories, meals, workout, baselineBurn }] } */
export const getHistory = (profileId, month) => request(`/profiles/${profileId}/history?month=${month}`)
