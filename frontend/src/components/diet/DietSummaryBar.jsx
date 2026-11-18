import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Container from '@mui/material/Container'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun'
import { useDiet } from '../../context/DietContext'
import { useWorkout } from '../../context/WorkoutContext'
import { formatLiters, formatNumber } from '../../lib/recipes'

function Meter({ icon, color, text, ratio }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Box sx={{ display: 'flex', color: `${color}.main` }}>{icon}</Box>
      <Typography variant="body2" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
        {text}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, ratio * 100)}
        color={ratio > 1.1 ? 'warning' : color}
        aria-hidden
        sx={{ width: { xs: 0, sm: 90, md: 140 }, display: { xs: 'none', sm: 'block' }, height: 6, borderRadius: 3 }}
      />
    </Stack>
  )
}

/** Resumen de hoy en la barra superior: calorías e hidratación consumidas sobre lo recomendado. */
export default function DietSummaryBar() {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const { todaySummary, status } = useDiet()
  const { todayBurned, workout, status: workoutStatus } = useWorkout()
  const dietReady = status === 'ready' && todaySummary
  const workoutReady = workoutStatus === 'ready' && todayBurned !== null
  if (!dietReady && !workoutReady) return null

  const linkSx = {
    justifyContent: 'flex-start',
    gap: { xs: 2, sm: 3 },
    py: 0.75,
    px: 0.5,
    borderRadius: 2,
    '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' },
  }

  let dietLink = null
  if (dietReady) {
    const { consumedCalories, consumedWaterMl, targets } = todaySummary
    const kcal = formatNumber(consumedCalories, language, 0)
    const kcalTarget = formatNumber(targets.calories, language, 0)
    const water = formatLiters(consumedWaterMl, language)
    const waterTarget = formatLiters(targets.waterMl, language)
    dietLink = (
      <ButtonBase
        component={RouterLink}
        to="/diet"
        aria-label={t('summaryBar.aria', { consumed: kcal, target: kcalTarget, water, waterTarget })}
        sx={linkSx}
      >
        <Meter
          icon={<LocalFireDepartmentIcon fontSize="small" />}
          color="secondary"
          text={t('summaryBar.calories', { consumed: kcal, target: kcalTarget })}
          ratio={consumedCalories / targets.calories}
        />
        <Meter
          icon={<WaterDropIcon fontSize="small" />}
          color="primary"
          text={t('summaryBar.water', { consumed: water, target: waterTarget })}
          ratio={consumedWaterMl / targets.waterMl}
        />
      </ButtonBase>
    )
  }

  // Gasto de hoy = rutina diaria (sin ejercicio) + ejercicio hecho.
  const burned = workoutReady ? formatNumber(workout.baselineBurn + todayBurned, language, 0) : null
  const burnedParts = workoutReady
    ? { base: formatNumber(workout.baselineBurn, language, 0), exercise: formatNumber(todayBurned, language, 0) }
    : null

  return (
    <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
      <Container maxWidth="lg">
        <Stack direction="row" useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', columnGap: { xs: 2, sm: 3 } }}>
          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
            {t('summaryBar.today')}
          </Typography>
          {dietLink}
          {burned !== null && (
            <ButtonBase component={RouterLink} to="/routine" aria-label={t('summaryBar.burnedAria', { value: burned, ...burnedParts })} sx={linkSx}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Box sx={{ display: 'flex', color: 'warning.main' }}>
                  <DirectionsRunIcon fontSize="small" />
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
                  {t('summaryBar.burned', { value: burned })}
                </Typography>
              </Stack>
            </ButtonBase>
          )}
        </Stack>
      </Container>
    </Box>
  )
}
