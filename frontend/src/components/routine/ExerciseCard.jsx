import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { useWorkout } from '../../context/WorkoutContext'
import { equipmentName, exerciseImage, exerciseName, measureFields, measureToInput, parseMeasures } from '../../lib/exercise'
import { formatNumber } from '../../lib/recipes'
import MeasureFields from './MeasureFields'

const toTexts = (entry, language) =>
  Object.fromEntries(['minutes', 'sets', 'reps', 'weightKg'].map((field) => [field, measureToInput(entry[field], language)]))

/**
 * Un ejercicio del día: miniatura (abre la animación), medidas editables, calorías,
 * tick de hecho, y cambiar/quitar.
 */
export default function ExerciseCard({ entry, busy, onShowHow, onToggleDone, onSaveMeasures, onSwap, onRemove }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const { exercisesById, equipmentById } = useWorkout()
  const exercise = exercisesById.get(entry.exerciseId)
  const [texts, setTexts] = useState(() => toTexts(entry, language))

  // Si el servidor devuelve otros valores (p. ej. al cambiar el ejercicio), se actualizan los campos.
  useEffect(() => {
    setTexts(toTexts(entry, language))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.exerciseId, entry.minutes, entry.sets, entry.reps, entry.weightKg])

  if (!exercise) return null
  const name = exerciseName(exercise, language)
  const needs = exercise.equipmentIds.map((id) => equipmentName(equipmentById.get(id) ?? { nameEs: '—', nameEn: '—' }, language))

  const commit = () => {
    const measures = parseMeasures(exercise.measure, texts)
    if (!measures) return
    const changed = measureFields(exercise.measure).some((field) => measures[field] !== entry[field])
    if (changed) onSaveMeasures(measures)
  }

  return (
    <Card
      component="article"
      aria-label={name}
      sx={(theme) => ({
        borderRadius: '20px',
        transition: 'border-color 150ms, background-color 150ms',
        ...(entry.done && {
          borderColor: theme.vars.palette.success.main,
          backgroundColor: `rgba(${theme.vars.palette.success.mainChannel} / 0.06)`,
        }),
      })}
    >
      <Stack direction="row" spacing={2} sx={{ p: { xs: 1.5, sm: 2 }, alignItems: 'flex-start' }}>
        <ButtonBase
          onClick={onShowHow}
          aria-label={t('routine.showHow', { name })}
          sx={{
            position: 'relative',
            flexShrink: 0,
            borderRadius: '14px',
            overflow: 'hidden',
            '&.Mui-focusVisible': { outline: '3px solid', outlineColor: 'primary.main' },
          }}
        >
          <Box
            component="img"
            src={exerciseImage(exercise)}
            alt=""
            width={96}
            height={96}
            sx={{ display: 'block', width: { xs: 76, sm: 96 }, height: { xs: 76, sm: 96 } }}
          />
          <PlayCircleIcon sx={{ position: 'absolute', right: 4, bottom: 4, color: '#FFFFFF', fontSize: 22, opacity: 0.9 }} />
        </ButtonBase>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary" component="p" sx={{ lineHeight: 1.6 }}>
            {t(`muscles.${exercise.muscle}`)}
          </Typography>
          <Typography variant="subtitle1" component="h3" sx={{ lineHeight: 1.3, mb: 0.75 }}>
            {name}
          </Typography>
          <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              size="small"
              icon={<LocalFireDepartmentIcon />}
              label={t('routine.kcal', { value: formatNumber(entry.calories, language, 0) })}
              color="warning"
              variant="outlined"
            />
            <Typography variant="caption" color="text.secondary">
              {needs.length ? t('routine.needs', { items: needs.join(', ') }) : t('routine.bodyweight')}
            </Typography>
          </Stack>
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={entry.done}
              onChange={(event) => onToggleDone(event.target.checked)}
              disabled={busy}
              color="success"
              slotProps={{ input: { 'aria-label': t('routine.markDone', { name }) } }}
            />
          }
          label={t('routine.done')}
          labelPlacement="bottom"
          sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: 12, fontWeight: 700, color: 'text.secondary' } }}
        />
      </Stack>

      <Divider />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5, justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <MeasureFields
          measure={exercise.measure}
          values={texts}
          onChange={setTexts}
          onCommit={commit}
          disabled={busy}
          idPrefix={`entry-${entry.id}`}
        />
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button size="small" startIcon={<SwapHorizIcon />} onClick={onSwap} disabled={busy} aria-label={t('routine.swapAria', { name })}>
            {t('routine.swap')}
          </Button>
          <Button
            size="small"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={onRemove}
            disabled={busy}
            aria-label={t('routine.removeAria', { name })}
          >
            {t('routine.remove')}
          </Button>
        </Stack>
      </Stack>
    </Card>
  )
}
