import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FavoriteIcon from '@mui/icons-material/Favorite'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import { useDiet } from '../../context/DietContext'
import { foodName } from '../../lib/foods'
import { formatNumber, formatQuantity, recipeContains, recipeName, recipeSummary, SLOT_ICONS } from '../../lib/recipes'

/** Una comida de la dieta: receta, calorías, hidratación, tick de consumida y acciones. */
export default function MealCard({ meal, busy, onToggleConsumed, onSwap, onRemove }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const { recipesById, foodsById, preferences } = useDiet()
  const [open, setOpen] = useState(false)

  const recipe = recipesById.get(meal.recipeId)
  if (!recipe) return null

  const name = recipeName(recipe, language)
  const SlotIcon = SLOT_ICONS[meal.slot]
  const isExtra = meal.slot === 'extra'
  const hasPreferred = recipeContains(recipe, preferences.preferred)
  const hasRejected = recipeContains(recipe, preferences.rejected)
  const detailsId = `meal-${meal.id}-details`

  return (
    <Card
      component="article"
      aria-label={`${t(`diet.slots.${meal.slot}`)}: ${name}`}
      sx={(theme) => ({
        borderRadius: 4,
        transition: 'border-color 150ms, background-color 150ms',
        ...(meal.consumed && {
          borderColor: theme.vars.palette.success.main,
          backgroundColor: `rgba(${theme.vars.palette.success.mainChannel} / 0.06)`,
        }),
      })}
    >
      <Stack direction="row" spacing={2} sx={{ p: { xs: 2, sm: 2.5 }, alignItems: 'flex-start' }}>
        <Avatar
          variant="rounded"
          sx={(theme) => ({
            width: 44,
            height: 44,
            borderRadius: '14px',
            color: isExtra ? 'secondary.main' : 'primary.main',
            bgcolor: `rgba(${theme.vars.palette[isExtra ? 'secondary' : 'primary'].mainChannel} / 0.12)`,
            display: { xs: 'none', sm: 'flex' },
          })}
        >
          <SlotIcon />
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary" component="p" sx={{ lineHeight: 1.6 }}>
            {t(`diet.slots.${meal.slot}`)}
          </Typography>
          <Typography variant="subtitle1" component="h3" sx={{ lineHeight: 1.3, mb: 1 }}>
            {name}
          </Typography>

          <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              size="small"
              icon={<LocalFireDepartmentIcon />}
              label={t('diet.kcal', { value: formatNumber(meal.calories, language, 0) })}
              color="warning"
              variant="outlined"
            />
            <Typography variant="body2" color="text.secondary">
              {t('diet.servings', { count: meal.servings, value: formatNumber(meal.servings, language, 2) })}
            </Typography>
            {meal.waterMl > 0 && (
              <Chip
                size="small"
                icon={<WaterDropIcon />}
                label={t('diet.water', { value: formatNumber(meal.waterMl, language, 0) })}
                color="primary"
                variant="outlined"
              />
            )}
            {hasPreferred && (
              <Chip size="small" icon={<FavoriteIcon />} label={t('diet.includesPreferred')} color="success" variant="outlined" />
            )}
            {hasRejected && (
              <Chip size="small" icon={<WarningAmberIcon />} label={t('diet.includesRejected')} color="error" variant="outlined" />
            )}
          </Stack>
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={meal.consumed}
              onChange={(event) => onToggleConsumed(event.target.checked)}
              disabled={busy}
              color="success"
              slotProps={{ input: { 'aria-label': t('diet.markConsumed', { name }) } }}
            />
          }
          label={t('diet.consumed')}
          labelPlacement="bottom"
          sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: 12, fontWeight: 700, color: 'text.secondary' } }}
        />
      </Stack>

      <Divider />

      <Stack direction="row" spacing={1} sx={{ px: 1.5, py: 1, justifyContent: 'space-between' }}>
        <Button
          size="small"
          color="inherit"
          onClick={() => setOpen((value) => !value)}
          endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          aria-expanded={open}
          aria-controls={detailsId}
        >
          {open ? t('diet.hideRecipe') : t('diet.showRecipe')}
        </Button>
        {isExtra ? (
          <Button
            size="small"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={onRemove}
            disabled={busy}
            aria-label={t('diet.removeAria', { name })}
          >
            {t('diet.remove')}
          </Button>
        ) : (
          <Button
            size="small"
            startIcon={<SwapHorizIcon />}
            onClick={onSwap}
            disabled={busy}
            aria-label={t('diet.swapAria', { name })}
          >
            {t('diet.swap')}
          </Button>
        )}
      </Stack>

      <Collapse in={open} id={detailsId} unmountOnExit>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5, display: 'grid', gap: 2, gridTemplateColumns: { md: '1fr 1.4fr' } }}>
          <Box>
            <Typography variant="subtitle2" component="h4" sx={{ fontWeight: 800, mb: 1 }}>
              {t('diet.ingredients')}
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 0.5 }}>
              {recipe.ingredients.map((ingredient) => {
                const food = foodsById.get(ingredient.foodId)
                const rejected = preferences.rejected.has(ingredient.foodId)
                return (
                  <Typography component="li" variant="body2" key={ingredient.foodId} sx={rejected ? { color: 'error.main' } : undefined}>
                    {food ? foodName(food, language) : '—'}
                    <Typography component="span" variant="body2" color="text.secondary">
                      {' · '}
                      {formatQuantity(ingredient, meal.servings, t, language)}
                    </Typography>
                  </Typography>
                )
              })}
            </Box>
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
      </Collapse>
    </Card>
  )
}
