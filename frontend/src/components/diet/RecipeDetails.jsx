import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useDiet } from '../../context/DietContext'
import { foodName } from '../../lib/foods'
import { formatQuantity, recipeSummary } from '../../lib/recipes'

/**
 * Ingredientes (escalados a `servings`) y preparación de una receta. Los opcionales se indican;
 * los que el perfil rechaza y son opcionales aparecen tachados como omitidos.
 */
export default function RecipeDetails({ recipe, servings, sx }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const { foodsById, preferences } = useDiet()

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { md: '1fr 1.4fr' }, ...sx }}>
      <Box>
        <Typography variant="subtitle2" component="h4" sx={{ fontWeight: 800, mb: 1 }}>
          {t('diet.ingredients')}
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 0.5 }}>
          {recipe.ingredients.map((ingredient) => {
            const food = foodsById.get(ingredient.foodId)
            const rejected = preferences.rejected.has(ingredient.foodId)
            const skipped = rejected && ingredient.optional
            return (
              <Typography
                component="li"
                variant="body2"
                key={ingredient.foodId}
                sx={skipped ? { color: 'text.disabled' } : rejected ? { color: 'error.main' } : undefined}
              >
                <Box component="span" sx={skipped ? { textDecoration: 'line-through' } : undefined}>
                  {food ? foodName(food, language) : '—'}
                  <Typography component="span" variant="body2" color="text.secondary">
                    {' · '}
                    {formatQuantity(ingredient, servings, t, language)}
                  </Typography>
                </Box>
                {ingredient.optional && (
                  <Typography component="span" variant="caption" color={skipped ? 'text.disabled' : 'text.secondary'}>
                    {' '}
                    {skipped ? t('diet.omitted') : t('diet.optional')}
                  </Typography>
                )}
              </Typography>
            )
          })}
        </Box>
        {recipe.ingredients.some((ingredient) => ingredient.optional) && (
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
            {t('diet.optionalHint')}
          </Typography>
        )}
      </Box>
      <Box>
        <Typography variant="subtitle2" component="h4" sx={{ fontWeight: 800, mb: 1 }}>
          {t('diet.preparation')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {recipeSummary(recipe, language)}
        </Typography>
      </Box>
    </Box>
  )
}
