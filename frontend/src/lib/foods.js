/** Mismo límite que el backend (backend/lib/foods.ts): 200 preferidos y 200 rechazados. */
export const MAX_FOODS_PER_LIST = 200

// Mismo orden que el enum FoodCategory del backend; define el orden de los grupos.
export const FOOD_CATEGORIES = [
  'vegetables',
  'fruits',
  'legumes',
  'plant_proteins',
  'grains',
  'meat',
  'poultry',
  'eggs',
  'fish_seafood',
  'dairy',
  'dairy_alternatives',
  'nuts_seeds',
  'herbs_spices',
  'oils_fats',
  'sweets',
  'condiments',
  'beverages',
]

export function foodName(food, language) {
  return language === 'en' ? food.nameEn : food.nameEs
}

/** Catálogo ordenado por categoría y luego por nombre en el idioma actual (necesario para agrupar). */
export function sortFoods(foods, language) {
  const collator = new Intl.Collator(language, { sensitivity: 'base' })
  return [...foods].sort(
    (a, b) =>
      FOOD_CATEGORIES.indexOf(a.category) - FOOD_CATEGORIES.indexOf(b.category) ||
      collator.compare(foodName(a, language), foodName(b, language)),
  )
}
