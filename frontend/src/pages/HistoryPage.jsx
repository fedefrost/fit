import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import { apiErrorMessage } from '../api/client'
import { getHistory } from '../api/history'
import SelectedProfileGate from '../components/SelectedProfileGate'
import HistoryDayDialog from '../components/history/HistoryDayDialog'
import { useSelectedProfile } from '../context/SelectedProfileContext'
import { addDaysIso, capitalizeFirst, formatDay, todayIso, toIsoDate } from '../lib/dates'
import { profileLabel } from '../lib/profile'
import { formatLiters, formatNumber } from '../lib/recipes'

const FIRST_YEAR = 2024

/** "YYYY-MM" desplazado `delta` meses. */
function shiftMonth(month, delta) {
  const [year, index] = month.split('-').map(Number)
  const date = new Date(year, index - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Celdas del mes empezando en lunes: null para los huecos antes del día 1 y después del último. */
function monthCells(month) {
  const [year, index] = month.split('-').map(Number)
  const first = new Date(year, index - 1, 1)
  const daysInMonth = new Date(year, index, 0).getDate()
  const offset = (first.getDay() + 6) % 7
  const cells = Array.from({ length: offset }, () => null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(toIsoDate(new Date(year, index - 1, day)))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** Color de la barra: verde dentro de ±10 % del objetivo, naranja si se pasa, celeste si falta. */
function ratioColor(ratio) {
  if (ratio > 1.1) return 'warning'
  return ratio >= 0.9 ? 'secondary' : 'primary'
}

function DayCell({ date, data, isToday, isFuture, onOpen, language, t }) {
  const dayNumber = Number(date.slice(8))
  const target = data?.targets?.calories ?? 0
  const ratio = target > 0 ? data.consumed.calories / target : 0
  const exercised = (data?.workout?.burned ?? 0) > 0
  const label = capitalizeFirst(formatDay(date, language, { weekday: 'long', day: 'numeric', month: 'long' }))

  const content = (
    <Box sx={{ width: '100%', height: '100%', p: { xs: 0.5, sm: 1 }, display: 'flex', flexDirection: 'column', gap: 0.5, textAlign: 'left' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Box
          component="span"
          sx={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            fontSize: 13,
            ...(isToday && { bgcolor: 'primary.main', color: 'primary.contrastText' }),
          }}
        >
          {dayNumber}
        </Box>
        {exercised && <FitnessCenterIcon sx={{ fontSize: 16, color: 'warning.main' }} aria-hidden />}
      </Stack>
      {data && (
        <>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: 11, sm: 13 }, lineHeight: 1.2 }}>
            {formatNumber(data.consumed.calories, language, 0)}
            <Box component="span" sx={{ display: { xs: 'none', md: 'inline' }, color: 'text.secondary', fontWeight: 600 }}>
              {target > 0 && ` / ${formatNumber(target, language, 0)}`} kcal
            </Box>
          </Typography>
          {target > 0 && (
            <LinearProgress
              variant="determinate"
              value={Math.min(100, ratio * 100)}
              color={ratioColor(ratio)}
              sx={{ height: 5, borderRadius: '5px' }}
            />
          )}
          <Typography
            variant="caption"
            color="primary.main"
            sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.25, fontWeight: 700, lineHeight: 1.2 }}
          >
            <WaterDropIcon sx={{ fontSize: 13 }} />
            {formatLiters(data.consumed.waterMl, language)}
            {data.targets && ` / ${formatLiters(data.targets.waterMl, language)}`} L
          </Typography>
        </>
      )}
    </Box>
  )

  const cellSx = {
    minHeight: { xs: 72, sm: 104 },
    borderRadius: '12px',
    border: 1,
    borderColor: isToday ? 'primary.main' : 'divider',
    bgcolor: data ? 'background.paper' : 'transparent',
    opacity: isFuture && !data ? 0.45 : 1,
    alignItems: 'stretch',
  }

  if (!data) {
    return (
      <Box sx={cellSx}>
        {content}
      </Box>
    )
  }
  return (
    <ButtonBase
      onClick={onOpen}
      aria-label={t('history.cellAria', {
        day: label,
        consumed: data.consumed.calories,
        target: target || '—',
        water: formatLiters(data.consumed.waterMl, language),
      })}
      sx={{
        ...cellSx,
        display: 'flex',
        transition: 'box-shadow 150ms, transform 150ms',
        '&:hover': { boxShadow: 3, transform: 'translateY(-1px)' },
        '&.Mui-focusVisible': { outline: '3px solid', outlineColor: 'primary.main' },
      }}
    >
      {content}
    </ButtonBase>
  )
}

function HistoryContent({ label }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const { selected } = useSelectedProfile()
  const profileId = selected.profile.id
  const today = todayIso()
  const currentMonth = today.slice(0, 7)

  const [month, setMonth] = useState(currentMonth)
  const [history, setHistory] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [openDate, setOpenDate] = useState(null)
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const current = ++requestId.current
    setStatus('loading')
    try {
      const next = await getHistory(profileId, month)
      if (current !== requestId.current) return
      setHistory(next)
      setStatus('ready')
    } catch (loadError) {
      if (current !== requestId.current) return
      setError(loadError)
      setStatus('error')
    }
  }, [profileId, month])

  useEffect(() => {
    load()
  }, [load])

  const byDate = useMemo(() => new Map((history?.month === month ? history.days : []).map((day) => [day.date, day])), [history, month])
  const cells = useMemo(() => monthCells(month), [month])
  // Encabezados lun–dom a partir de un lunes cualquiera.
  const weekdays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => capitalizeFirst(formatDay(addDaysIso('2024-01-01', index), language, { weekday: 'short' }))),
    [language],
  )
  const monthNames = useMemo(
    () => Array.from({ length: 12 }, (_, index) => capitalizeFirst(new Intl.DateTimeFormat(language, { month: 'long' }).format(new Date(2024, index, 1)))),
    [language],
  )
  const [year, monthIndex] = month.split('-').map(Number)
  const lastYear = Number(currentMonth.slice(0, 4))
  const years = Array.from({ length: lastYear - FIRST_YEAR + 1 }, (_, index) => FIRST_YEAR + index)

  const days = [...byDate.values()]
  // Resumen del mes: solo días hasta hoy en los que se registró algo (comida consumida o ejercicio hecho).
  const logged = days.filter((day) => day.date <= today && (day.consumed.calories > 0 || (day.workout?.burned ?? 0) > 0))
  const ate = logged.filter((day) => day.consumed.calories > 0)
  const stats = {
    logged: logged.length,
    avgCalories: ate.length ? Math.round(ate.reduce((total, day) => total + day.consumed.calories, 0) / ate.length) : 0,
    avgWater: ate.length ? ate.reduce((total, day) => total + day.consumed.waterMl, 0) / ate.length : 0,
    exercise: logged.reduce((total, day) => total + (day.workout?.burned ?? 0), 0),
  }

  const goTo = (next) => setMonth(next > currentMonth ? currentMonth : next)

  return (
    <>
      <Button component={RouterLink} to="/menu" startIcon={<ArrowBackIcon />} color="inherit" sx={{ mb: 2 }}>
        {t('common.backToMenu')}
      </Button>

      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="primary" component="p">
          {t('history.eyebrow', { label })}
        </Typography>
        <Typography variant="h4" component="h1">
          {t('history.title')}
        </Typography>
        <Typography color="text.secondary">{t('history.subtitle')}</Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 3 } }}>
          <Stack
            direction="row"
            useFlexGap
            spacing={1}
            sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', mb: 2 }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <IconButton onClick={() => goTo(shiftMonth(month, -1))} aria-label={t('history.prevMonth')} disabled={month <= `${FIRST_YEAR}-01`}>
                <ChevronLeftIcon />
              </IconButton>
              <TextField
                select
                size="small"
                value={monthIndex}
                onChange={(event) => goTo(`${year}-${String(event.target.value).padStart(2, '0')}`)}
                slotProps={{ htmlInput: { 'aria-label': t('history.month') } }}
                sx={{ minWidth: 140 }}
              >
                {monthNames.map((name, index) => (
                  <MenuItem key={name} value={index + 1} disabled={`${year}-${String(index + 1).padStart(2, '0')}` > currentMonth}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                value={year}
                onChange={(event) => goTo(`${event.target.value}-${String(monthIndex).padStart(2, '0')}`)}
                slotProps={{ htmlInput: { 'aria-label': t('history.year') } }}
              >
                {years.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </TextField>
              <IconButton onClick={() => goTo(shiftMonth(month, 1))} aria-label={t('history.nextMonth')} disabled={month >= currentMonth}>
                <ChevronRightIcon />
              </IconButton>
            </Stack>
            {month !== currentMonth && (
              <Button onClick={() => setMonth(currentMonth)} size="small">
                {t('history.thisMonth')}
              </Button>
            )}
          </Stack>

          {status === 'error' ? (
            <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>{t('common.retry')}</Button>}>
              {apiErrorMessage(error, t)}
            </Alert>
          ) : (
            <>
              <Box
                sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, mb: 2 }}
                aria-live="polite"
              >
                {[
                  [t('history.statLogged'), stats.logged],
                  [t('history.statCalories'), stats.avgCalories ? t('diet.kcal', { value: formatNumber(stats.avgCalories, language, 0) }) : '—'],
                  [t('history.statWater'), stats.avgWater ? `${formatLiters(stats.avgWater, language)} L` : '—'],
                  [t('history.statExercise'), t('diet.kcal', { value: formatNumber(stats.exercise, language, 0) })],
                ].map(([name, value]) => (
                  <Box key={name} sx={{ p: 1.5, borderRadius: '14px', bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {name}
                    </Typography>
                    <Typography sx={{ fontWeight: 800 }}>{value}</Typography>
                  </Box>
                ))}
              </Box>

              <Box aria-busy={status === 'loading'}>
                <Box aria-hidden sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: { xs: 0.5, sm: 1 }, mb: 0.5 }}>
                  {weekdays.map((name) => (
                    <Typography
                      key={name}
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 800, textAlign: 'center', textTransform: 'uppercase' }}
                    >
                      {name}
                    </Typography>
                  ))}
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    gap: { xs: 0.5, sm: 1 },
                    opacity: status === 'loading' ? 0.5 : 1,
                    transition: 'opacity 150ms',
                  }}
                >
                  {cells.map((date, index) =>
                    date ? (
                      <DayCell
                        key={date}
                        date={date}
                        data={date <= today ? byDate.get(date) : undefined}
                        isToday={date === today}
                        isFuture={date > today}
                        onOpen={() => setOpenDate(date)}
                        language={language}
                        t={t}
                      />
                    ) : (
                      <Box key={`empty-${index}`} />
                    ),
                  )}
                </Box>
              </Box>

              {status === 'ready' && days.length === 0 && (
                <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                  {t('history.empty')}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 2 }}>
                {t('history.legend')}
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      <HistoryDayDialog day={openDate ? byDate.get(openDate) : null} onClose={() => setOpenDate(null)} />
    </>
  )
}

export default function HistoryPage() {
  const { t } = useTranslation()
  return <SelectedProfileGate>{({ index }) => <HistoryContent label={profileLabel(t, index)} />}</SelectedProfileGate>
}
