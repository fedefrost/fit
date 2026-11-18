import BakeryDiningIcon from '@mui/icons-material/BakeryDining'
import DinnerDiningIcon from '@mui/icons-material/DinnerDining'
import FreeBreakfastIcon from '@mui/icons-material/FreeBreakfast'
import LunchDiningIcon from '@mui/icons-material/LunchDining'

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'junk']

/** Snacks y comida rápida: se registran, pero el generador nunca los propone. */
export const isJunk = (recipe) => recipe.mealTypes.includes('junk')

/** ¿Tiene algo que mostrar en "Ver receta"? (los snacks comprados listos no). */
export const hasRecipeDetails = (recipe) =>
  recipe.ingredients.length > 0 || Boolean(recipe.summaryEs || recipe.summaryEn)

export const SLOT_ICONS = {
  breakfast: FreeBreakfastIcon,
  lunch: LunchDiningIcon,
  dinner: DinnerDiningIcon,
  extra: BakeryDiningIcon,
}

/** Mismo rango que el backend (backend/lib/diet.ts): porciones al cambiar o añadir una receta. */
export const SERVINGS_RANGE = { min: 0.1, max: 10 }

/** Texto ingresado ("1,5", "2", "0.75") → número de porciones con 2 decimales, o null si no es válido. */
export function parseServingsInput(raw) {
  const text = String(raw ?? '').trim().replace(',', '.')
  if (!/^\d*\.?\d+$/.test(text)) return null
  const servings = Math.round(Number(text) * 100) / 100
  return servings >= SERVINGS_RANGE.min && servings <= SERVINGS_RANGE.max ? servings : null
}

/** Porciones → texto para el campo, con coma decimal en español. */
export const servingsToInput = (servings, language) =>
  language === 'es' ? String(servings).replace('.', ',') : String(servings)

export const recipeName = (recipe, language) => (language === 'en' ? recipe.nameEn : recipe.nameEs)
export const recipeSummary = (recipe, language) => (language === 'en' ? recipe.summaryEn : recipe.summaryEs)

/** Sin tildes y en minúsculas, para buscar. */
export const normalizeText = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export const formatNumber = (value, language, maximumFractionDigits = 1) =>
  new Intl.NumberFormat(language, { maximumFractionDigits }).format(value)

/** Litros con 1 decimal a partir de ml (p. ej. 3450 → "3,5"). */
export const formatLiters = (ml, language) =>
  new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(ml / 1000)

/** Cantidad de un ingrediente escalada a las porciones, ya traducida ("150 g", "2 unidades", "una pizca"). */
export function formatQuantity({ quantity, unit }, servings, t, language) {
  const scaled = quantity * servings
  // g y ml se redondean de a 5 (o a 1 si son cantidades chicas); el resto, de a 1/4.
  const value =
    unit === 'g' || unit === 'ml' ? (scaled >= 20 ? Math.round(scaled / 5) * 5 : Math.round(scaled)) : Math.round(scaled * 4) / 4
  return t(`units.${unit}`, { count: value, value: formatNumber(value, language, 2) })
}

export function recipeContains(recipe, foodIds) {
  return recipe.ingredients.some((ingredient) => foodIds.has(ingredient.foodId))
}
