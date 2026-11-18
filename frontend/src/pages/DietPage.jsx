import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import { apiErrorMessage } from '../api/client'
import ConfirmDialog from '../components/ConfirmDialog'
import SelectedProfileGate from '../components/SelectedProfileGate'
import DayStrip from '../components/diet/DayStrip'
import MealCard from '../components/diet/MealCard'
import NutrientProgress from '../components/diet/NutrientProgress'
import RecipePickerDialog from '../components/diet/RecipePickerDialog'
import { daySummary, useDiet } from '../context/DietContext'
import { useWorkout, workoutDaySummary } from '../context/WorkoutContext'
import { addDaysIso, capitalizeFirst, formatDay } from '../lib/dates'
import { profileLabel } from '../lib/profile'
import { formatLiters, formatNumber } from '../lib/recipes'

const GENERATED_SLOTS = ['breakfast', 'lunch', 'dinner']
// Tipo de comida que se preselecciona en el selector al cambiar cada comida.
const SLOT_MEAL_TYPE = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', extra: 'snack' }

function TargetsCard({ targets }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 4 }} sx={{ alignItems: { sm: 'center' } }}>
          <Box>
            <Typography variant="overline" color="text.secondary" component="p">
              {t('diet.targetsTitle')}
            </Typography>
            <Stack direction="row" spacing={3} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <LocalFireDepartmentIcon color="warning" />
                <Typography variant="h5" component="p">
                  {t('diet.caloriesTarget', { value: formatNumber(targets.calories, language, 0) })}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <WaterDropIcon color="primary" />
                <Typography variant="h5" component="p">
                  {t('diet.waterTarget', { value: formatLiters(targets.waterMl, language) })}
                </Typography>
              </Stack>
            </Stack>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Chip
              label={t(`diet.goal.${targets.goal}`)}
              color={targets.goal === 'maintain' ? 'primary' : 'secondary'}
              variant="outlined"
              sx={{ mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {t('diet.targetsDetail', {
                bmr: formatNumber(targets.bmr, language, 0),
                tdee: formatNumber(targets.tdee, language, 0),
              })}
            </Typography>
          </Box>
        </Stack>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 2 }}>
          {t('diet.disclaimer')}
        </Typography>
      </CardContent>
    </Card>
  )
}

function DietContent({ label }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const diet = useDiet()
  const workout = useWorkout()
  const { status, error, reload, today, week } = diet

  const [selectedDate, setSelectedDate] = useState(null)
  const [busy, setBusy] = useState(false) // generación de semana/día
  const [busyMealId, setBusyMealId] = useState(null)
  const [picker, setPicker] = useState({ open: false, mode: 'add', meal: null })
  const [confirm, setConfirm] = useState({ open: false, kind: 'week', date: null })
  const [toast, setToast] = useState(null)

  const notify = (message, severity = 'success') => setToast({ message, severity, key: Date.now() })
  const fail = (actionError) => notify(apiErrorMessage(actionError, t), 'error')

  if (status === 'error') {
    return (
      <Alert severity="error" action={<Button color="inherit" size="small" onClick={reload}>{t('common.retry')}</Button>}>
        {apiErrorMessage(error, t)}
      </Alert>
    )
  }

  if (status !== 'ready' || !diet.diet) {
    return (
      <Stack spacing={2}>
        <Skeleton width={260} height={48} />
        <Skeleton variant="rounded" height={140} sx={{ borderRadius: '20px' }} />
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: '20px' }} />
      </Stack>
    )
  }

  const { targets, plan } = diet.diet
  const weekEnd = addDaysIso(week, 6)
  const activeDate = selectedDate ?? (plan?.days.some((day) => day.date === today) ? today : week)
  const day = plan?.days.find((item) => item.date === activeDate)
  const summary = daySummary(day)
  const junkCalories = (day?.meals ?? [])
    .filter((meal) => meal.consumed && diet.recipesById.get(meal.recipeId)?.mealTypes.includes('junk'))
    .reduce((total, meal) => total + meal.calories, 0)
  // Gastadas del día = rutina diaria + ejercicio hecho ese día (de la rutina).
  const workoutDay = workout.workout?.days.find((item) => item.date === activeDate)
  const burnedToday = workout.workout ? workout.workout.baselineBurn + workoutDaySummary(workoutDay).burned : null
  const balance = burnedToday === null ? 0 : summary.consumedCalories - burnedToday
  const dayName = formatDay(activeDate, language, { weekday: 'long' })

  const run = async (action, successMessage) => {
    setBusy(true)
    try {
      await action()
      if (successMessage) notify(successMessage)
    } catch (actionError) {
      fail(actionError)
    } finally {
      setBusy(false)
      setConfirm((current) => ({ ...current, open: false }))
    }
  }

  const runOnMeal = async (mealId, action, successMessage) => {
    setBusyMealId(mealId)
    try {
      await action()
      if (successMessage) notify(successMessage)
    } catch (actionError) {
      fail(actionError)
    } finally {
      setBusyMealId(null)
    }
  }

  const regenerateDay = () => {
    const consumedPlanned = day?.meals.some((meal) => meal.slot !== 'extra' && meal.consumed)
    if (consumedPlanned) setConfirm({ open: true, kind: 'day', date: activeDate })
    else run(() => diet.regenerateDay(activeDate), t('diet.dayRegenerated', { day: capitalize(dayName) }))
  }

  const handlePickerConfirm = async (recipeId, servings) => {
    if (picker.mode === 'swap') {
      await diet.swapMeal(picker.meal.id, recipeId, servings)
      notify(t('diet.swapped'))
    } else {
      await diet.addExtra(activeDate, recipeId, servings)
      notify(t('diet.added'))
    }
    setPicker((current) => ({ ...current, open: false }))
  }

  const meals = day?.meals ?? []
  const extras = meals.filter((meal) => meal.slot === 'extra')

  return (
    <>
      <Button component={RouterLink} to="/menu" startIcon={<ArrowBackIcon />} color="inherit" sx={{ mb: 2 }}>
        {t('common.backToMenu')}
      </Button>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-end' }, mb: 3 }}
      >
        <Box>
          <Typography variant="overline" color="secondary" component="p">
            {t('diet.eyebrow', { label })}
          </Typography>
          <Typography variant="h4" component="h1">
            {t('diet.title')}
          </Typography>
          <Typography color="text.secondary">
            {t('diet.weekRange', {
              start: formatDay(week, language, { day: 'numeric', month: 'long' }),
              end: formatDay(weekEnd, language, { day: 'numeric', month: 'long' }),
            })}
          </Typography>
        </Box>
        {plan && (
          <Button
            variant="outlined"
            startIcon={<AutorenewIcon />}
            onClick={() => setConfirm({ open: true, kind: 'week', date: null })}
            disabled={busy}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}
          >
            {t('diet.regenerateWeek')}
          </Button>
        )}
      </Stack>

      <TargetsCard targets={targets} />

      {!plan ? (
        <Card sx={{ textAlign: 'center' }}>
          <CardContent sx={{ py: 6, px: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <RestaurantIcon color="primary" sx={{ fontSize: 48 }} />
            <Typography variant="h5" component="h2">
              {t('diet.empty.title')}
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 480 }}>
              {t('diet.empty.body')}
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AutorenewIcon />}
              loading={busy}
              onClick={() => run(() => diet.generateWeek(), t('diet.generated'))}
            >
              {t('diet.generateWeek')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <DayStrip
            days={plan.days}
            selectedDate={activeDate}
            today={today}
            targetCalories={targets.calories}
            onSelect={setSelectedDate}
          />

          <Box
            id="day-panel"
            role="tabpanel"
            aria-labelledby={`day-tab-${activeDate}`}
            sx={{ mt: 3 }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2 }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="h5" component="h2">
                  {capitalizeFirst(formatDay(activeDate, language, { weekday: 'long', day: 'numeric', month: 'long' }))}
                </Typography>
                {activeDate === today && <Chip size="small" color="secondary" label={t('diet.today')} />}
              </Stack>
              <Button
                startIcon={<AutorenewIcon />}
                onClick={regenerateDay}
                loading={busy}
                sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}
              >
                {t('diet.regenerateDay')}
              </Button>
            </Stack>

            <Card sx={{ mb: 2.5 }}>
              <CardContent sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { md: '1fr 1fr' }, p: { xs: 2, sm: 3 } }}>
                <NutrientProgress
                  icon={<LocalFireDepartmentIcon />}
                  label={t('diet.caloriesLabel')}
                  color="secondary"
                  consumed={summary.consumedCalories}
                  target={targets.calories}
                  valueText={`${t('diet.progressValue', {
                    consumed: formatNumber(summary.consumedCalories, language, 0),
                    target: formatNumber(targets.calories, language, 0),
                  })} kcal`}
                />
                <NutrientProgress
                  icon={<WaterDropIcon />}
                  label={t('diet.waterLabel')}
                  color="primary"
                  consumed={summary.consumedWaterMl}
                  target={targets.waterMl}
                  valueText={`${t('diet.progressValue', {
                    consumed: formatLiters(summary.consumedWaterMl, language),
                    target: formatLiters(targets.waterMl, language),
                  })} L`}
                />
                <Box sx={{ gridColumn: { md: '1 / -1' }, display: 'grid', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('diet.planned', { value: formatNumber(summary.plannedCalories, language, 0) })}
                  </Typography>
                  {junkCalories > 0 && (
                    <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 700 }}>
                      {t('diet.junkTotal', { value: formatNumber(junkCalories, language, 0) })}
                    </Typography>
                  )}
                  {burnedToday !== null && (
                    <Box sx={{ mt: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {t('diet.balanceTitle')}
                        </Typography>
                        <Chip
                          size="small"
                          color={balance <= 0 ? 'success' : 'warning'}
                          variant="outlined"
                          label={balance <= 0 ? t('diet.balanceDeficit') : t('diet.balanceSurplus')}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {t('diet.balanceValue', {
                          consumed: formatNumber(summary.consumedCalories, language, 0),
                          burned: formatNumber(burnedToday, language, 0),
                          balance: `${balance > 0 ? '+' : ''}${formatNumber(balance, language, 0)}`,
                        })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('diet.balanceHint')}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>

            <Stack spacing={2}>
              {GENERATED_SLOTS.map((slot) => {
                const meal = meals.find((item) => item.slot === slot)
                if (!meal) {
                  return (
                    <Alert key={slot} severity="info">
                      <strong>{t(`diet.slots.${slot}`)}:</strong> {t('diet.noRecipe')}
                    </Alert>
                  )
                }
                return (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    busy={busyMealId === meal.id || busy}
                    onToggleConsumed={(consumed) => runOnMeal(meal.id, () => diet.setConsumed(meal.id, consumed))}
                    onSwap={() => setPicker({ open: true, mode: 'swap', meal })}
                  />
                )
              })}

              {extras.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  busy={busyMealId === meal.id || busy}
                  onToggleConsumed={(consumed) => runOnMeal(meal.id, () => diet.setConsumed(meal.id, consumed))}
                  onRemove={() => runOnMeal(meal.id, () => diet.removeExtra(meal.id), t('diet.removed'))}
                />
              ))}

              <ButtonBase
                onClick={() => setPicker({ open: true, mode: 'add', meal: null })}
                sx={{
                  width: '100%',
                  borderRadius: '20px',
                  border: 2,
                  borderStyle: 'dashed',
                  borderColor: 'divider',
                  p: 2.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  color: 'primary.main',
                  transition: 'border-color 150ms',
                  '&:hover': { borderColor: 'primary.main' },
                  '&.Mui-focusVisible': { outline: '3px solid', outlineColor: 'primary.main' },
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <AddIcon />
                  <Typography sx={{ fontWeight: 800 }}>{t('diet.add')}</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {t('diet.addHint')}
                </Typography>
              </ButtonBase>
            </Stack>
          </Box>
        </>
      )}

      <RecipePickerDialog
        open={picker.open}
        mode={picker.mode}
        slot={picker.meal?.slot ?? 'extra'}
        initialMealType={SLOT_MEAL_TYPE[picker.meal?.slot ?? 'extra']}
        onClose={() => setPicker((current) => ({ ...current, open: false }))}
        onConfirm={handlePickerConfirm}
      />

      <ConfirmDialog
        open={confirm.open}
        busy={busy}
        title={
          confirm.kind === 'week'
            ? t('diet.confirmWeek.title')
            : t('diet.confirmDay.title', { day: dayName })
        }
        body={confirm.kind === 'week' ? t('diet.confirmWeek.body') : t('diet.confirmDay.body')}
        confirmLabel={confirm.kind === 'week' ? t('diet.confirmWeek.confirm') : t('diet.confirmDay.confirm')}
        onClose={() => setConfirm((current) => ({ ...current, open: false }))}
        onConfirm={() =>
          confirm.kind === 'week'
            ? run(() => diet.generateWeek(), t('diet.weekRegenerated'))
            : run(() => diet.regenerateDay(confirm.date), t('diet.dayRegenerated', { day: capitalize(dayName) }))
        }
      />

      <Snackbar
        key={toast?.key}
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={(_event, reason) => reason !== 'clickaway' && setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  )
}

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

export default function DietPage() {
  const { t } = useTranslation()
  return <SelectedProfileGate>{({ index }) => <DietContent label={profileLabel(t, index)} />}</SelectedProfileGate>
}
