import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import FavoriteIcon from '@mui/icons-material/Favorite'
import SearchIcon from '@mui/icons-material/Search'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import { apiErrorMessage } from '../../api/client'
import { useDiet } from '../../context/DietContext'
import { foodName, sortFoods } from '../../lib/foods'
import {
  formatNumber,
  MEAL_TYPES,
  normalizeText,
  recipeContains,
  parseServingsInput,
  recipeName,
  servingsToInput,
  SERVINGS_RANGE,
} from '../../lib/recipes'

const foodFilter = createFilterOptions({ stringify: (food) => `${food.nameEs} ${food.nameEn}`, ignoreAccents: true })

/**
 * Elegir una receta del catálogo para cambiar una comida (`mode="swap"`) o añadir una extra
 * (`mode="add"`). Filtros: texto (nombre en es/en), tipo de comida e ingredientes (las recetas
 * deben contener todos los elegidos). Por defecto oculta las que tienen alimentos rechazados.
 */
export default function RecipePickerDialog({ open, mode, slot, initialMealType, initialServings = 1, onClose, onConfirm }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const fullScreen = useMediaQuery((theme) => theme.breakpoints.down('sm'))
  const { recipes, foods, preferences } = useDiet()

  const [query, setQuery] = useState('')
  const [mealType, setMealType] = useState('all')
  const [ingredients, setIngredients] = useState([])
  const [hideRejected, setHideRejected] = useState(true)
  const [onlyPreferred, setOnlyPreferred] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [servingsText, setServingsText] = useState('1') // lo que escribe el usuario; admite decimales
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setQuery('')
      setMealType(initialMealType ?? 'all')
      setIngredients([])
      setHideRejected(true)
      setOnlyPreferred(false)
      setSelectedId(null)
      setServingsText(servingsToInput(initialServings, language))
      setSaving(false)
      setError('')
    }
    // El idioma solo da formato al valor inicial; cambiarlo no debe reiniciar el diálogo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMealType, initialServings])

  const servings = parseServingsInput(servingsText)

  const foodOptions = useMemo(() => sortFoods(foods, language), [foods, language])

  const results = useMemo(() => {
    const text = normalizeText(query.trim())
    const required = ingredients.map((food) => food.id)
    return recipes
      .filter((recipe) => mealType === 'all' || recipe.mealTypes.includes(mealType))
      .filter((recipe) => !text || normalizeText(`${recipe.nameEs} ${recipe.nameEn}`).includes(text))
      .filter((recipe) => required.every((id) => recipe.ingredients.some((ingredient) => ingredient.foodId === id)))
      .filter((recipe) => !hideRejected || !recipeContains(recipe, preferences.rejected))
      .filter((recipe) => !onlyPreferred || recipeContains(recipe, preferences.preferred))
      .sort((a, b) => recipeName(a, language).localeCompare(recipeName(b, language), language))
  }, [recipes, query, mealType, ingredients, hideRejected, onlyPreferred, preferences, language])

  const hasPreferred = preferences.preferred.size > 0

  const selected = results.find((recipe) => recipe.id === selectedId) ?? null

  const handleConfirm = async () => {
    if (!selected || servings === null) return
    setSaving(true)
    setError('')
    try {
      await onConfirm(selected.id, servings)
    } catch (confirmError) {
      setError(apiErrorMessage(confirmError, t))
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) onClose()
  }

  const title = mode === 'swap' ? t('picker.swapTitle', { slot: t(`diet.slots.${slot}`).toLowerCase() }) : t('picker.addTitle')

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md" fullScreen={fullScreen} scroll="paper">
      <DialogTitle sx={{ fontWeight: 800, pb: 0.5 }}>{title}</DialogTitle>
      <Typography color="text.secondary" variant="body2" sx={{ px: 3, pb: 2 }}>
        {mode === 'swap' ? t('picker.swapHint') : t('picker.addHint')}
      </Typography>

      <Box sx={{ px: 3, pb: 2, display: 'grid', gap: 1.5 }}>
        <TextField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('picker.search')}
          size="small"
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> },
            htmlInput: { 'aria-label': t('picker.search') },
          }}
        />
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          value={mealType}
          onChange={(_event, value) => value && setMealType(value)}
          aria-label={t('picker.mealTypeAria')}
          sx={{ flexWrap: 'wrap' }}
        >
          <ToggleButton value="all">{t('picker.all')}</ToggleButton>
          {MEAL_TYPES.map((type) => (
            <ToggleButton key={type} value={type}>
              {t(`picker.mealTypes.${type}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Autocomplete
          multiple
          size="small"
          options={foodOptions}
          value={ingredients}
          onChange={(_event, next) => setIngredients(next)}
          getOptionLabel={(food) => foodName(food, language)}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          groupBy={(food) => t(`foods.categories.${food.category}`)}
          filterOptions={foodFilter}
          filterSelectedOptions
          autoHighlight
          renderInput={(params) => (
            <TextField {...params} label={t('picker.ingredients')} placeholder={t('picker.ingredientsPlaceholder')} />
          )}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ columnGap: 2 }}>
          <FormControlLabel
            control={<Checkbox size="small" checked={hideRejected} onChange={(event) => setHideRejected(event.target.checked)} />}
            label={<Typography variant="body2">{t('picker.hideRejected')}</Typography>}
          />
          <FormControlLabel
            disabled={!hasPreferred}
            control={
              <Checkbox
                size="small"
                color="success"
                checked={onlyPreferred && hasPreferred}
                onChange={(event) => setOnlyPreferred(event.target.checked)}
              />
            }
            label={
              <Typography variant="body2">
                {hasPreferred ? t('picker.onlyPreferred') : t('picker.onlyPreferredNone')}
              </Typography>
            }
          />
        </Stack>
      </Box>

      <DialogContent dividers sx={{ p: 0 }}>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ px: 3, pt: 1.5 }} aria-live="polite">
          {t('picker.count', { count: results.length })}
        </Typography>
        {results.length === 0 ? (
          <Typography color="text.secondary" sx={{ px: 3, py: 4, textAlign: 'center' }}>
            {t('picker.noResults')}
          </Typography>
        ) : (
          <List sx={{ px: 1.5 }} aria-label={t('picker.count', { count: results.length })}>
            {results.map((recipe) => {
              const isSelected = recipe.id === selectedId
              return (
                <ListItemButton
                  key={recipe.id}
                  selected={isSelected}
                  onClick={() => setSelectedId(recipe.id)}
                  aria-pressed={isSelected}
                  sx={{ borderRadius: 3, mb: 0.5, alignItems: 'flex-start', gap: 1.5 }}
                >
                  <CheckCircleIcon
                    color={isSelected ? 'primary' : 'disabled'}
                    sx={{ mt: 0.25, opacity: isSelected ? 1 : 0.35 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{recipeName(recipe, language)}</Typography>
                    <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap', mt: 0.5, alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('picker.perServing', { kcal: formatNumber(recipe.calories, language, 0) })}
                      </Typography>
                      {recipe.waterMl > 0 && (
                        <Chip size="small" variant="outlined" color="primary" icon={<WaterDropIcon />}
                          label={t('diet.water', { value: recipe.waterMl })} />
                      )}
                      {recipeContains(recipe, preferences.preferred) && (
                        <Chip size="small" variant="outlined" color="success" icon={<FavoriteIcon />}
                          label={t('diet.includesPreferred')} />
                      )}
                      {recipeContains(recipe, preferences.rejected) && (
                        <Chip size="small" variant="outlined" color="error" icon={<WarningAmberIcon />}
                          label={t('diet.includesRejected')} />
                      )}
                    </Stack>
                  </Box>
                </ListItemButton>
              )
            })}
          </List>
        )}
      </DialogContent>

      {error && (
        <Alert severity="error" sx={{ mx: 3, mt: 2 }}>
          {error}
        </Alert>
      )}

      <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label={t('picker.servings')}
          value={servingsText}
          onChange={(event) => setServingsText(event.target.value)}
          error={servings === null}
          helperText={
            servings === null
              ? t('picker.servingsInvalid', {
                  min: formatNumber(SERVINGS_RANGE.min, language, 2),
                  max: formatNumber(SERVINGS_RANGE.max, language, 2),
                })
              : t('picker.servingsHint')
          }
          slotProps={{ htmlInput: { inputMode: 'decimal', autoComplete: 'off' } }}
          sx={{ width: 170 }}
        />
        <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1, alignSelf: 'center' }}>
          {selected &&
            servings !== null &&
            t('picker.total', { kcal: formatNumber(Math.round(selected.calories * servings), language, 0) })}
        </Typography>
        <Button onClick={handleClose} disabled={saving} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!selected || servings === null} loading={saving}>
          {mode === 'swap' ? t('picker.confirmSwap') : t('picker.confirmAdd')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
