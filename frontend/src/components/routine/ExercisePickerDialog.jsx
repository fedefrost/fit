import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
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
import SearchIcon from '@mui/icons-material/Search'
import { apiErrorMessage } from '../../api/client'
import { useSelectedProfile } from '../../context/SelectedProfileContext'
import { useWorkout } from '../../context/WorkoutContext'
import {
  ALL_MUSCLES,
  canDoWith,
  equipmentName,
  estimateCalories,
  exerciseImage,
  exerciseName,
  measureToInput,
  parseMeasures,
} from '../../lib/exercise'
import { normalizeText } from '../../lib/recipes'
import MeasureFields from './MeasureFields'

/**
 * Elegir un ejercicio para cambiar uno del día (`mode="swap"`) o añadir uno hecho (`mode="add"`),
 * con las medidas de lo que se hizo (prellenadas con lo recomendado para el perfil).
 */
export default function ExercisePickerDialog({ open, mode, location, initialMuscle, onClose, onConfirm }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const fullScreen = useMediaQuery((theme) => theme.breakpoints.down('sm'))
  const { exercises, equipmentById, personalizedById, workout } = useWorkout()
  const { selected: selectedProfile } = useSelectedProfile()

  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState('all')
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [texts, setTexts] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setQuery('')
      setMuscle(initialMuscle ?? 'all')
      setOnlyAvailable(true)
      setSelectedId(null)
      setTexts({})
      setSaving(false)
      setError('')
    }
  }, [open, initialMuscle])

  const available = useMemo(() => workout?.equipment?.[location] ?? [], [workout, location])

  const results = useMemo(() => {
    const text = normalizeText(query.trim())
    return exercises
      .filter((exercise) => muscle === 'all' || exercise.muscle === muscle)
      .filter((exercise) => !text || normalizeText(`${exercise.nameEs} ${exercise.nameEn}`).includes(text))
      .filter((exercise) => !onlyAvailable || canDoWith(exercise, available))
      .sort((a, b) => exerciseName(a, language).localeCompare(exerciseName(b, language), language))
  }, [exercises, muscle, query, onlyAvailable, available, language])

  const selected = results.find((exercise) => exercise.id === selectedId) ?? null
  const measures = selected ? parseMeasures(selected.measure, texts) : null
  const estimate = selected && measures
    ? estimateCalories(selected, measures, personalizedById.get(selected.id), selectedProfile?.profile.weight ?? 70)
    : null

  const choose = (exercise) => {
    setSelectedId(exercise.id)
    const recommended = personalizedById.get(exercise.id)?.recommended ?? {}
    setTexts(Object.fromEntries(Object.entries(recommended).map(([field, value]) => [field, measureToInput(value, language)])))
  }

  const handleConfirm = async () => {
    if (!selected || !measures) return
    setSaving(true)
    setError('')
    try {
      await onConfirm(selected.id, measures)
    } catch (confirmError) {
      setError(apiErrorMessage(confirmError, t))
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="md" fullScreen={fullScreen} scroll="paper">
      <DialogTitle sx={{ fontWeight: 800, pb: 0.5 }}>
        {mode === 'swap' ? t('exercisePicker.swapTitle') : t('exercisePicker.addTitle')}
      </DialogTitle>
      <Typography color="text.secondary" variant="body2" sx={{ px: 3, pb: 2 }}>
        {mode === 'swap' ? t('exercisePicker.swapHint') : t('exercisePicker.addHint')}
      </Typography>

      <Box sx={{ px: 3, pb: 1.5, display: 'grid', gap: 1.5 }}>
        <TextField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('exercisePicker.search')}
          size="small"
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> },
            htmlInput: { 'aria-label': t('exercisePicker.search') },
          }}
        />
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          value={muscle}
          onChange={(_event, value) => value && setMuscle(value)}
          aria-label={t('exercisePicker.muscleAria')}
          sx={{ flexWrap: 'wrap' }}
        >
          <ToggleButton value="all">{t('exercisePicker.all')}</ToggleButton>
          {ALL_MUSCLES.map((item) => (
            <ToggleButton key={item} value={item}>
              {t(`muscles.${item}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <FormControlLabel
          control={<Checkbox size="small" checked={onlyAvailable} onChange={(event) => setOnlyAvailable(event.target.checked)} />}
          label={
            <Typography variant="body2">
              {t('exercisePicker.onlyAvailable', { place: t(`locations.${location}`).toLowerCase() })}
            </Typography>
          }
        />
      </Box>

      <DialogContent dividers sx={{ p: 0 }}>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ px: 3, pt: 1.5 }} aria-live="polite">
          {t('exercisePicker.count', { count: results.length })}
        </Typography>
        {results.length === 0 ? (
          <Typography color="text.secondary" sx={{ px: 3, py: 4, textAlign: 'center' }}>
            {t('exercisePicker.noResults')}
          </Typography>
        ) : (
          <List sx={{ px: 1.5 }}>
            {results.map((exercise) => {
              const isSelected = exercise.id === selectedId
              const needs = exercise.equipmentIds.map((id) => equipmentName(equipmentById.get(id) ?? { nameEs: '—', nameEn: '—' }, language))
              return (
                <ListItemButton
                  key={exercise.id}
                  selected={isSelected}
                  onClick={() => choose(exercise)}
                  aria-pressed={isSelected}
                  sx={{ borderRadius: 3, mb: 0.5, gap: 1.5 }}
                >
                  <Box component="img" src={exerciseImage(exercise)} alt="" width={56} height={56} sx={{ borderRadius: '10px', flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{exerciseName(exercise, language)}</Typography>
                    <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center', mt: 0.25 }}>
                      <Chip size="small" label={t(`muscles.${exercise.muscle}`)} />
                      <Typography variant="caption" color="text.secondary">
                        {needs.length ? needs.join(', ') : t('routine.bodyweight')}
                      </Typography>
                      {exercise.highImpact && <Chip size="small" color="warning" variant="outlined" label={t('routine.highImpact')} />}
                    </Stack>
                  </Box>
                  <CheckCircleIcon color={isSelected ? 'primary' : 'disabled'} sx={{ opacity: isSelected ? 1 : 0.35 }} />
                </ListItemButton>
              )
            })}
          </List>
        )}
      </DialogContent>

      {selected && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {t('exercisePicker.measuresTitle')}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1.5 }}>
            {t('exercisePicker.recommendedHint')}
          </Typography>
          <MeasureFields measure={selected.measure} values={texts} onChange={setTexts} idPrefix="picker" />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mx: 3, mt: 2 }}>
          {error}
        </Alert>
      )}

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1 }}>
          {estimate !== null && t('exercisePicker.estimate', { kcal: estimate })}
        </Typography>
        <Button onClick={onClose} disabled={saving} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!selected || !measures} loading={saving}>
          {mode === 'swap' ? t('exercisePicker.confirmSwap') : t('exercisePicker.confirmAdd')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
