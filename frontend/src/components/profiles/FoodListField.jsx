import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import LinearProgress from '@mui/material/LinearProgress'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import BlockIcon from '@mui/icons-material/Block'
import FavoriteIcon from '@mui/icons-material/Favorite'
import { foodName } from '../../lib/foods'

export const FOOD_LIST_STYLE = {
  preferred: { Icon: FavoriteIcon, color: 'success' },
  rejected: { Icon: BlockIcon, color: 'error' },
}

// Busca en español e inglés a la vez, sin distinguir mayúsculas ni tildes
// (p. ej. "palta", "aguacate" o "avocado" encuentran el mismo alimento).
const filterOptions = createFilterOptions({
  stringify: (food) => `${food.nameEs} ${food.nameEn}`,
  ignoreAccents: true,
  ignoreCase: true,
})

/**
 * Selección múltiple con búsqueda para una de las dos listas de alimentos.
 * Los alimentos que ya están en la otra lista se muestran deshabilitados.
 * Cada lista tiene su propio máximo (`max`); al llegar, no se puede agregar más.
 */
export default function FoodListField({ kind, otherKind, options, value, otherIds, max, limitHit, onChange }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const { Icon, color } = FOOD_LIST_STYLE[kind]
  const titleId = `foods-${kind}-title`
  const selectedIds = useMemo(() => new Set(value.map((food) => food.id)), [value])
  const full = value.length >= max

  return (
    <Box component="section" aria-labelledby={titleId}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: `${color}.main`, color: `${color}.contrastText` }}>
          <Icon fontSize="small" />
        </Avatar>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography id={titleId} variant="subtitle1" component="h3" sx={{ lineHeight: 1.3 }}>
            {t(`foods.${kind}.title`)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(`foods.${kind}.description`)}
          </Typography>
        </Box>
        <Box sx={{ minWidth: { xs: 72, sm: 120 }, textAlign: 'right' }}>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            {t('foods.listCount', { count: value.length, max })}
          </Typography>
          <LinearProgress
            variant="determinate"
            color={full ? 'warning' : color}
            value={(value.length / max) * 100}
            aria-label={`${t(`foods.${kind}.title`)}: ${t('foods.listCount', { count: value.length, max })}`}
            sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
          />
        </Box>
      </Stack>

      {(full || limitHit) && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          {t('foods.limitReached', { max })}
        </Alert>
      )}

      <Autocomplete
        multiple
        id={`foods-${kind}`}
        options={options}
        value={value}
        onChange={(_event, next) => onChange(next)}
        getOptionLabel={(food) => foodName(food, language)}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        groupBy={(food) => t(`foods.categories.${food.category}`)}
        filterOptions={filterOptions}
        getOptionDisabled={(food) => otherIds.has(food.id) || (full && !selectedIds.has(food.id))}
        filterSelectedOptions
        disableCloseOnSelect
        autoHighlight
        noOptionsText={t('foods.noResults')}
        renderOption={(props, food) => {
          const { key, ...optionProps } = props
          return (
            <li key={key} {...optionProps}>
              <Box component="span" sx={{ flexGrow: 1 }}>
                {foodName(food, language)}
              </Box>
              {otherIds.has(food.id) && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {t(`foods.${otherKind}.inList`)}
                </Typography>
              )}
            </li>
          )
        }}
        renderValue={(foods, getItemProps) =>
          foods.map((food, index) => {
            const { key, ...itemProps } = getItemProps({ index })
            return (
              <Chip key={key} size="small" color={color} variant="outlined" label={foodName(food, language)} {...itemProps} />
            )
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={t('foods.searchPlaceholder')}
            inputProps={{ ...params.inputProps, 'aria-labelledby': titleId }}
          />
        )}
        sx={{
          // Con muchos alimentos elegidos, los chips hacen scroll en vez de agrandar el diálogo.
          '& .MuiAutocomplete-inputRoot': { maxHeight: 220, overflowY: 'auto', alignContent: 'flex-start' },
        }}
      />
    </Box>
  )
}
