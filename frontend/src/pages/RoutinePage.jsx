import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import HomeIcon from '@mui/icons-material/Home'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import { apiErrorMessage } from '../api/client'
import ConfirmDialog from '../components/ConfirmDialog'
import SelectedProfileGate from '../components/SelectedProfileGate'
import EquipmentDialog from '../components/profiles/EquipmentDialog'
import ExerciseAnimationDialog from '../components/routine/ExerciseAnimationDialog'
import ExerciseCard from '../components/routine/ExerciseCard'
import ExercisePickerDialog from '../components/routine/ExercisePickerDialog'
import { useWorkout, workoutDaySummary } from '../context/WorkoutContext'
import { addDaysIso, capitalizeFirst, formatDay } from '../lib/dates'
import { LOCATIONS, MAX_MUSCLES, TRAINABLE_MUSCLES } from '../lib/exercise'
import { profileLabel } from '../lib/profile'
import { formatNumber } from '../lib/recipes'

const LOCATION_ICON = { home: HomeIcon, gym: FitnessCenterIcon }

function WorkoutDayStrip({ days, selectedDate, today, onSelect }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  return (
    <Box
      role="tablist"
      aria-label={t('diet.daysAria')}
      sx={{
        display: 'grid',
        gridAutoFlow: { xs: 'column', md: 'row' },
        gridAutoColumns: { xs: 'minmax(104px, 1fr)' },
        gridTemplateColumns: { md: 'repeat(7, 1fr)' },
        gap: 1.25,
        overflowX: { xs: 'auto', md: 'visible' },
        pb: { xs: 1, md: 0 },
      }}
    >
      {days.map((day) => {
        const { burned } = workoutDaySummary(day)
        const isSelected = day.date === selectedDate
        const isToday = day.date === today
        const LocationIcon = day.location ? LOCATION_ICON[day.location] : null
        return (
          <ButtonBase
            key={day.date}
            role="tab"
            id={`workout-tab-${day.date}`}
            aria-selected={isSelected}
            aria-controls="workout-panel"
            aria-label={t('routine.dayButtonAria', {
              day: formatDay(day.date, language, { weekday: 'long', day: 'numeric', month: 'long' }),
              kcal: burned,
            })}
            onClick={() => onSelect(day.date)}
            sx={(theme) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              textAlign: 'left',
              gap: 0.5,
              p: 1.5,
              borderRadius: '18px',
              border: 2,
              borderColor: isSelected ? 'primary.main' : 'divider',
              bgcolor: isSelected ? `rgba(${theme.vars.palette.primary.mainChannel} / 0.1)` : 'background.paper',
              '&:hover': { borderColor: 'primary.light' },
              '&.Mui-focusVisible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 },
            })}
          >
            <Typography variant="overline" sx={{ lineHeight: 1.4, color: isToday ? 'secondary.main' : 'text.secondary' }}>
              {isToday ? t('diet.today') : formatDay(day.date, language, { weekday: 'short' })}
            </Typography>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h5" component="span" sx={{ lineHeight: 1.1 }}>
                {formatDay(day.date, language, { day: 'numeric' })}
              </Typography>
              {LocationIcon && <LocationIcon fontSize="small" color="primary" />}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {day.location ? `${formatNumber(burned, language, 0)} kcal` : t('routine.noLocation')}
            </Typography>
          </ButtonBase>
        )
      })}
    </Box>
  )
}

function LocationChooser({ dayLabel, equipment, busy, onChoose, onEditEquipment }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Typography variant="h5" component="h2" gutterBottom>
          {t('routine.where.title', { day: dayLabel })}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2.5 }}>
          {t('routine.where.body')}
        </Typography>
        <Grid container spacing={2}>
          {LOCATIONS.map((location) => {
            const Icon = LOCATION_ICON[location]
            const count = equipment[location].length
            return (
              <Grid key={location} size={{ xs: 12, sm: 6 }}>
                <Card sx={{ height: '100%' }}>
                  <CardActionArea
                    onClick={() => onChoose(location)}
                    disabled={busy}
                    sx={{ p: 2.5, display: 'flex', justifyContent: 'flex-start', gap: 2, height: '100%' }}
                  >
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '16px',
                        bgcolor: location === 'home' ? 'primary.main' : 'secondary.main',
                        color: location === 'home' ? 'primary.contrastText' : 'secondary.contrastText',
                      }}
                    >
                      <Icon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" component="span" sx={{ display: 'block' }}>
                        {t(`equipment.${location}.title`)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {count ? t('routine.where.items', { count }) : t('routine.where.none')}
                      </Typography>
                    </Box>
                  </CardActionArea>
                </Card>
              </Grid>
            )
          })}
        </Grid>
        <Button onClick={onEditEquipment} startIcon={<FitnessCenterIcon />} sx={{ mt: 2 }}>
          {t('routine.where.editEquipment')}
        </Button>
      </CardContent>
    </Card>
  )
}

function RoutineContent({ profile, label }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const routine = useWorkout()
  const { status, error, reload, today, week, workout, exercisesById } = routine

  const [selectedDate, setSelectedDate] = useState(null)
  const [choosingLocation, setChoosingLocation] = useState(false)
  const [muscles, setMuscles] = useState([])
  const [busy, setBusy] = useState(false)
  const [busyEntryId, setBusyEntryId] = useState(null)
  const [picker, setPicker] = useState({ open: false, mode: 'add', entry: null })
  const [howTo, setHowTo] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [equipmentOpen, setEquipmentOpen] = useState(false)
  const [fewer, setFewer] = useState(null)
  const [toast, setToast] = useState(null)

  const activeDate = selectedDate ?? (workout?.days.some((day) => day.date === today) ? today : week)
  const day = workout?.days.find((item) => item.date === activeDate)

  // Al cambiar de día se recuperan los músculos con los que se generó.
  useEffect(() => {
    setMuscles(day?.muscles ?? [])
    setChoosingLocation(false)
    setFewer(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDate, day?.location])

  if (status === 'error') {
    return (
      <Alert severity="error" action={<Button color="inherit" size="small" onClick={reload}>{t('common.retry')}</Button>}>
        {apiErrorMessage(error, t)}
      </Alert>
    )
  }
  if (status !== 'ready' || !workout || !day) {
    return (
      <Stack spacing={2}>
        <Skeleton width={260} height={48} />
        <Skeleton variant="rounded" height={110} sx={{ borderRadius: '20px' }} />
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: '20px' }} />
      </Stack>
    )
  }

  const notify = (message, severity = 'success') => setToast({ message, severity, key: Date.now() })
  const dayLabel = formatDay(activeDate, language, { weekday: 'long' })
  const summary = workoutDaySummary(day)
  const planned = day.entries.filter((entry) => entry.source === 'planned')
  const { fitness } = workout

  const run = async (action, successMessage) => {
    setBusy(true)
    try {
      const result = await action()
      if (successMessage) notify(successMessage)
      return result
    } catch (actionError) {
      notify(apiErrorMessage(actionError, t), 'error')
      return null
    } finally {
      setBusy(false)
    }
  }

  const runOnEntry = async (entryId, action, successMessage) => {
    setBusyEntryId(entryId)
    try {
      await action()
      if (successMessage) notify(successMessage)
    } catch (actionError) {
      notify(apiErrorMessage(actionError, t), 'error')
    } finally {
      setBusyEntryId(null)
    }
  }

  const chooseLocation = (location) => run(() => routine.setLocation(activeDate, location))

  const toggleMuscle = (muscle) =>
    setMuscles((current) =>
      current.includes(muscle) ? current.filter((item) => item !== muscle) : current.length < MAX_MUSCLES ? [...current, muscle] : current,
    )

  const generate = async () => {
    setConfirmOpen(false)
    const next = await run(() => routine.generate(activeDate, muscles), t('routine.generated'))
    if (!next) return
    const generated = next.days.find((item) => item.date === activeDate).entries.filter((entry) => entry.source === 'planned')
    const forMuscles = generated.filter((entry) => exercisesById.get(entry.exerciseId)?.muscle !== 'general').length
    const expected = muscles.length === 1 ? 4 : 6
    setFewer(forMuscles < expected ? forMuscles : null)
  }

  const requestGenerate = () => {
    if (planned.some((entry) => entry.done)) setConfirmOpen(true)
    else generate()
  }

  const handlePickerConfirm = async (exerciseId, measures) => {
    if (picker.mode === 'swap') {
      await routine.updateEntry(picker.entry.id, { exerciseId, ...measures, done: true })
      notify(t('routine.swapped'))
    } else {
      await routine.addExercise(activeDate, exerciseId, measures)
      notify(t('routine.added'))
    }
    setPicker((current) => ({ ...current, open: false }))
  }

  const showLocation = !day.location || choosingLocation

  return (
    <>
      <Button component={RouterLink} to="/menu" startIcon={<ArrowBackIcon />} color="inherit" sx={{ mb: 2 }}>
        {t('common.backToMenu')}
      </Button>

      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="secondary" component="p">
          {t('routine.eyebrow', { label })}
        </Typography>
        <Typography variant="h4" component="h1">
          {t('routine.title')}
        </Typography>
        <Typography color="text.secondary">
          {t('diet.weekRange', {
            start: formatDay(week, language, { day: 'numeric', month: 'long' }),
            end: formatDay(addDaysIso(week, 6), language, { day: 'numeric', month: 'long' }),
          })}
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Chip
            color="secondary"
            variant="outlined"
            label={t('routine.level', { level: t(`fitnessLevel.${fitness.level}`) })}
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            {t('routine.levelHint')}
          </Typography>
          {fitness.restrictHighImpact && (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              {t('routine.restrictedHint', { max: fitness.maxMinutes })}
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5 }}>
            {t('routine.disclaimer')}
          </Typography>
        </CardContent>
      </Card>

      <WorkoutDayStrip days={workout.days} selectedDate={activeDate} today={today} onSelect={setSelectedDate} />

      <Box id="workout-panel" role="tabpanel" aria-labelledby={`workout-tab-${activeDate}`} sx={{ mt: 3 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2">
            {capitalizeFirst(formatDay(activeDate, language, { weekday: 'long', day: 'numeric', month: 'long' }))}
          </Typography>
          {activeDate === today && <Chip size="small" color="secondary" label={t('diet.today')} />}
        </Stack>

        {showLocation ? (
          <LocationChooser
            dayLabel={dayLabel}
            equipment={workout.equipment}
            busy={busy}
            onChoose={chooseLocation}
            onEditEquipment={() => setEquipmentOpen(true)}
          />
        ) : (
          <Stack spacing={2}>
            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <Chip
                  icon={day.location === 'home' ? <HomeIcon /> : <FitnessCenterIcon />}
                  label={t('routine.trainingAt', { place: t(`locations.${day.location}`) })}
                  color="primary"
                  variant="outlined"
                />
                <Button size="small" onClick={() => setChoosingLocation(true)}>
                  {t('routine.changeLocation')}
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <LocalFireDepartmentIcon color="warning" />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {t('routine.dayBurnTitle')}
                    </Typography>
                    <Typography variant="body2">
                      {t('routine.dayBurnValue', {
                        base: formatNumber(workout.baselineBurn, language, 0),
                        exercise: formatNumber(summary.burned, language, 0),
                        total: formatNumber(workout.baselineBurn + summary.burned, language, 0),
                      })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('routine.planned', { value: formatNumber(summary.planned, language, 0) })}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Typography variant="subtitle1" component="h3">
                  {t('routine.generate.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {t('routine.generate.hint', { max: MAX_MUSCLES })}
                </Typography>
                <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap', mb: 2 }} role="group" aria-label={t('routine.generate.title')}>
                  {TRAINABLE_MUSCLES.map((muscle) => {
                    const active = muscles.includes(muscle)
                    const disabled = !active && muscles.length >= MAX_MUSCLES
                    return (
                      <Chip
                        key={muscle}
                        label={t(`muscles.${muscle}`)}
                        color={active ? 'primary' : 'default'}
                        variant={active ? 'filled' : 'outlined'}
                        onClick={() => toggleMuscle(muscle)}
                        disabled={disabled}
                        aria-pressed={active}
                      />
                    )
                  })}
                </Stack>
                <Button
                  variant="contained"
                  startIcon={<AutorenewIcon />}
                  onClick={requestGenerate}
                  disabled={muscles.length === 0}
                  loading={busy}
                >
                  {planned.length ? t('routine.generate.regenerate') : t('routine.generate.button')}
                </Button>
                {fewer !== null && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {t('routine.generate.fewer', { count: fewer })}
                  </Alert>
                )}
              </CardContent>
            </Card>

            {day.entries.length === 0 && (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                {t('routine.empty')}
              </Typography>
            )}

            {day.entries.map((entry) => (
              <ExerciseCard
                key={entry.id}
                entry={entry}
                busy={busy || busyEntryId === entry.id}
                onShowHow={() => setHowTo(exercisesById.get(entry.exerciseId))}
                onToggleDone={(done) => runOnEntry(entry.id, () => routine.updateEntry(entry.id, { done }))}
                onSaveMeasures={(measures) => runOnEntry(entry.id, () => routine.updateEntry(entry.id, measures), t('routine.saved'))}
                onSwap={() => setPicker({ open: true, mode: 'swap', entry })}
                onRemove={() => runOnEntry(entry.id, () => routine.removeEntry(entry.id), t('routine.removed'))}
              />
            ))}

            <ButtonBase
              onClick={() => setPicker({ open: true, mode: 'add', entry: null })}
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
                '&:hover': { borderColor: 'primary.main' },
                '&.Mui-focusVisible': { outline: '3px solid', outlineColor: 'primary.main' },
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <AddIcon />
                <Typography sx={{ fontWeight: 800 }}>{t('routine.add')}</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {t('routine.addHint')}
              </Typography>
            </ButtonBase>
          </Stack>
        )}
      </Box>

      <ExercisePickerDialog
        open={picker.open}
        mode={picker.mode}
        location={day.location ?? 'home'}
        initialMuscle={picker.entry ? exercisesById.get(picker.entry.exerciseId)?.muscle : undefined}
        onClose={() => setPicker((current) => ({ ...current, open: false }))}
        onConfirm={handlePickerConfirm}
      />

      <ExerciseAnimationDialog exercise={howTo} onClose={() => setHowTo(null)} />

      <ConfirmDialog
        open={confirmOpen}
        busy={busy}
        title={t('routine.generate.confirmTitle')}
        body={t('routine.generate.confirmBody')}
        confirmLabel={t('routine.generate.regenerate')}
        onClose={() => setConfirmOpen(false)}
        onConfirm={generate}
      />

      <EquipmentDialog
        open={equipmentOpen}
        profile={profile}
        label={label}
        onClose={() => setEquipmentOpen(false)}
        onSaved={() => {
          setEquipmentOpen(false)
          notify(t('equipment.saved', { label }))
          reload()
        }}
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

export default function RoutinePage() {
  const { t } = useTranslation()
  return (
    <SelectedProfileGate>
      {({ profile, index }) => <RoutineContent profile={profile} label={profileLabel(t, index)} />}
    </SelectedProfileGate>
  )
}
