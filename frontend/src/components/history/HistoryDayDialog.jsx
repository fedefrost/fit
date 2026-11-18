import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import { useDiet } from '../../context/DietContext'
import { useWorkout } from '../../context/WorkoutContext'
import { capitalizeFirst, formatDay } from '../../lib/dates'
import { exerciseImage, exerciseName, formatMeasures } from '../../lib/exercise'
import { formatLiters, formatNumber, recipeName, SLOT_ICONS } from '../../lib/recipes'
import NutrientProgress from '../diet/NutrientProgress'

function Stat({ icon, label, value, color }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: '14px', bgcolor: 'action.hover', minWidth: 0 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: `${color}.main` }}>
        {icon}
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
      </Stack>
      <Typography sx={{ fontWeight: 800, mt: 0.25 }}>{value}</Typography>
    </Box>
  )
}

/** Detalle de un día del historial: totales, lo que se consumió y el ejercicio realizado. */
export default function HistoryDayDialog({ day, onClose }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const fullScreen = useMediaQuery((theme) => theme.breakpoints.down('sm'))
  const { recipesById } = useDiet()
  const { exercisesById } = useWorkout()

  if (!day) return null

  const format = (value) => formatNumber(value, language, 1)
  const consumedMeals = day.meals.filter((meal) => meal.consumed)
  const pendingMeals = day.meals.length - consumedMeals.length
  const doneExercises = day.workout?.exercises.filter((entry) => entry.done) ?? []
  const pendingExercises = (day.workout?.exercises.length ?? 0) - doneExercises.length
  const exerciseBurned = day.workout?.burned ?? 0
  const burned = day.baselineBurn + exerciseBurned
  const title = capitalizeFirst(formatDay(day.date, language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen} scroll="paper">
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, mb: 2.5 }}>
          <Stat
            icon={<RestaurantIcon fontSize="small" />}
            color="primary"
            label={t('history.recommended')}
            value={day.targets ? t('diet.kcal', { value: formatNumber(day.targets.calories, language, 0) }) : '—'}
          />
          <Stat
            icon={<RestaurantIcon fontSize="small" />}
            color="secondary"
            label={t('history.consumed')}
            value={t('diet.kcal', { value: formatNumber(day.consumed.calories, language, 0) })}
          />
          <Stat
            icon={<WaterDropIcon fontSize="small" />}
            color="primary"
            label={t('history.hydration')}
            value={`${formatLiters(day.consumed.waterMl, language)} L`}
          />
          <Stat
            icon={<LocalFireDepartmentIcon fontSize="small" />}
            color="warning"
            label={t('history.burned')}
            value={t('diet.kcal', { value: formatNumber(burned, language, 0) })}
          />
        </Box>

        {day.targets && (
          <Stack spacing={1.5} sx={{ mb: 2.5 }}>
            <NutrientProgress
              icon={<RestaurantIcon fontSize="small" />}
              label={t('diet.caloriesLabel')}
              valueText={`${t('diet.progressValue', {
                consumed: formatNumber(day.consumed.calories, language, 0),
                target: formatNumber(day.targets.calories, language, 0),
              })} kcal`}
              consumed={day.consumed.calories}
              target={day.targets.calories}
              color="secondary"
            />
            <NutrientProgress
              icon={<WaterDropIcon fontSize="small" />}
              label={t('diet.waterLabel')}
              valueText={`${t('diet.progressValue', {
                consumed: formatLiters(day.consumed.waterMl, language),
                target: formatLiters(day.targets.waterMl, language),
              })} L`}
              consumed={day.consumed.waterMl}
              target={day.targets.waterMl}
              color="primary"
            />
            <Typography variant="caption" color="text.secondary">
              {t('history.burnedDetail', { base: formatNumber(day.baselineBurn, language, 0), exercise: formatNumber(exerciseBurned, language, 0) })}
            </Typography>
          </Stack>
        )}

        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 800, mb: 1 }}>
          {t('history.mealsTitle')}
        </Typography>
        {consumedMeals.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('history.noMeals')}
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={1}>
            {consumedMeals.map((meal) => {
              const recipe = recipesById.get(meal.recipeId)
              const SlotIcon = SLOT_ICONS[meal.slot]
              return (
                <Stack key={meal.id} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <SlotIcon color="secondary" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {t(`diet.slots.${meal.slot}`)}
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>{recipe ? recipeName(recipe, language) : '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('diet.servings', { count: meal.servings, value: formatNumber(meal.servings, language, 2) })}
                      {meal.waterMl > 0 && ` · ${t('diet.water', { value: meal.waterMl })}`}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{t('diet.kcal', { value: meal.calories })}</Typography>
                </Stack>
              )
            })}
          </Stack>
        )}
        {pendingMeals > 0 && (
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
            {t('history.pendingMeals', { count: pendingMeals })}
          </Typography>
        )}

        <Divider sx={{ my: 2.5 }} />

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1, flexWrap: 'wrap' }} useFlexGap>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 800 }}>
            {t('history.workoutTitle')}
          </Typography>
          {day.workout && <Chip size="small" label={t(`locations.${day.workout.location}`)} />}
          {day.workout?.muscles.map((muscle) => (
            <Chip key={muscle} size="small" variant="outlined" label={t(`muscles.${muscle}`)} />
          ))}
        </Stack>
        {doneExercises.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('history.noWorkout')}
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={1}>
            {doneExercises.map((entry) => {
              const exercise = exercisesById.get(entry.exerciseId)
              return (
                <Stack key={entry.id} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  {exercise ? (
                    <Box component="img" src={exerciseImage(exercise)} alt="" width={44} height={44} sx={{ borderRadius: '10px', flexShrink: 0 }} />
                  ) : (
                    <FitnessCenterIcon color="primary" />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{exercise ? exerciseName(exercise, language) : '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {exercise ? `${t(`muscles.${exercise.muscle}`)} · ${formatMeasures(exercise, entry, t, format)}` : ''}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{t('diet.kcal', { value: entry.calories })}</Typography>
                </Stack>
              )
            })}
          </Stack>
        )}
        {pendingExercises > 0 && (
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
            {t('history.pendingExercises', { count: pendingExercises })}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained">
          {t('history.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
