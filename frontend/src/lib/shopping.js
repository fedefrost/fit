import { formatNumber } from './recipes'

export const PEOPLE_RANGE = { min: 1, max: 20 }
export const MAX_ITEM_TEXT = 80

/**
 * Cantidad para comprar, redondeada hacia arriba a algo que se pueda pedir en la tienda:
 * g y ml de a 10 (en kg / L desde 1000), cucharadas de a ½ y el resto (unidades, rebanadas,
 * pizcas) entero.
 */
export function formatShoppingQuantity({ quantity, unit }, t, language) {
  if (unit === 'g' || unit === 'ml') {
    const rounded = Math.ceil(quantity / 10) * 10
    if (rounded >= 1000) {
      const value = formatNumber(Math.ceil(rounded / 100) / 10, language, 1)
      return t(unit === 'g' ? 'shopping.kg' : 'shopping.liters', { value })
    }
    return t(`units.${unit}`, { value: formatNumber(rounded, language, 0) })
  }
  const value = unit === 'tbsp' || unit === 'tsp' ? Math.ceil(quantity * 2) / 2 : Math.ceil(quantity - 0.01)
  return t(`units.${unit}`, { count: value, value: formatNumber(value, language, 1) })
}

/** Días elegidos al tocar uno: con los 7 o ninguno vuelve a "toda la semana" ([]). */
export function toggleDay(days, index) {
  const next = days.includes(index) ? days.filter((day) => day !== index) : [...days, index].sort((a, b) => a - b)
  return next.length === 7 ? [] : next
}
