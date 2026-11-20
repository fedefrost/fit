/**
 * Alertas de un día del historial (`today` = "YYYY-MM-DD" de hoy):
 * - calories: se consumió más de lo recomendado (excess = kcal de más). Vale también para hoy.
 * - water: se tomó menos agua de la recomendada (missingMl = lo que faltó). Solo días ya terminados.
 * - exercises: ejercicios planificados que no se hicieron (pending = cuántos). Solo días ya terminados.
 * Calorías y agua solo se evalúan si ese día se registró alguna comida (un día sin registros no es
 * un día con poca agua: simplemente no hay datos). Cada alerta es null si no aplica.
 */
export function dayAlerts(day, today) {
  const targets = day?.targets
  const finished = day ? day.date < today : false
  const logged = (day?.consumed.calories ?? 0) > 0
  const excess = targets && logged ? day.consumed.calories - targets.calories : 0
  const missingMl = targets && logged && finished ? targets.waterMl - day.consumed.waterMl : 0
  const pending = finished && day?.workout ? day.workout.exercises.filter((entry) => !entry.done).length : 0
  const alerts = {
    calories: excess > 0 ? { excess } : null,
    water: missingMl > 0 ? { missingMl } : null,
    exercises: pending > 0 ? { pending } : null,
  }
  return { ...alerts, any: Boolean(alerts.calories || alerts.water || alerts.exercises) }
}
