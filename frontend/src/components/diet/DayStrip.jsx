import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import { daySummary } from '../../context/DietContext'
import { formatDay } from '../../lib/dates'
import { formatNumber } from '../../lib/recipes'

/** Los 7 días de la semana como bloques seleccionables, con el progreso de calorías de cada uno. */
export default function DayStrip({ days, selectedDate, today, targetCalories, onSelect }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage

  return (
    <Box
      role="tablist"
      aria-label={t('diet.daysAria')}
      sx={{
        display: 'grid',
        gridAutoFlow: { xs: 'column', md: 'row' },
        gridAutoColumns: { xs: 'minmax(108px, 1fr)' },
        gridTemplateColumns: { md: 'repeat(7, 1fr)' },
        gap: 1.25,
        overflowX: { xs: 'auto', md: 'visible' },
        pb: { xs: 1, md: 0 },
        scrollSnapType: 'x mandatory',
      }}
    >
      {days.map((day) => {
        const { plannedCalories, consumedCalories } = daySummary(day)
        const isSelected = day.date === selectedDate
        const isToday = day.date === today
        const weekday = formatDay(day.date, language, { weekday: 'short' })
        const longDay = formatDay(day.date, language, { weekday: 'long', day: 'numeric', month: 'long' })
        const progress = Math.min(100, (consumedCalories / targetCalories) * 100)

        return (
          <ButtonBase
            key={day.date}
            role="tab"
            id={`day-tab-${day.date}`}
            aria-selected={isSelected}
            aria-controls="day-panel"
            aria-label={t('diet.dayButtonAria', {
              day: longDay,
              consumed: formatNumber(consumedCalories, language, 0),
              planned: formatNumber(plannedCalories, language, 0),
            })}
            onClick={() => onSelect(day.date)}
            sx={(theme) => ({
              scrollSnapAlign: 'start',
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
              transition: 'border-color 150ms, background-color 150ms',
              '&:hover': { borderColor: 'primary.light' },
              '&.Mui-focusVisible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 },
            })}
          >
            <Typography
              variant="overline"
              sx={{ lineHeight: 1.4, color: isToday ? 'secondary.main' : 'text.secondary' }}
            >
              {isToday ? t('diet.today') : weekday}
            </Typography>
            <Typography variant="h5" component="span" sx={{ lineHeight: 1.1 }}>
              {formatDay(day.date, language, { day: 'numeric' })}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {formatNumber(consumedCalories, language, 0)} / {formatNumber(plannedCalories, language, 0)} kcal
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progress}
              color="secondary"
              sx={{ height: 5, borderRadius: 3, mt: 0.25 }}
              aria-hidden
            />
          </ButtonBase>
        )
      })}
    </Box>
  )
}
