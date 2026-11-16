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
import { useDiet } from '../../context/DietContext'
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
  if (status !== 'ready' || !todaySummary) return null

  const { consumedCalories, consumedWaterMl, targets } = todaySummary
  const kcal = formatNumber(consumedCalories, language, 0)
  const kcalTarget = formatNumber(targets.calories, language, 0)
  const water = formatLiters(consumedWaterMl, language)
  const waterTarget = formatLiters(targets.waterMl, language)

  return (
    <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
      <Container maxWidth="lg">
        <ButtonBase
          component={RouterLink}
          to="/diet"
          aria-label={t('summaryBar.aria', { consumed: kcal, target: kcalTarget, water, waterTarget })}
          sx={{
            width: '100%',
            justifyContent: 'flex-start',
            gap: { xs: 2, sm: 3 },
            py: 0.75,
            borderRadius: 2,
            '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' },
          }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
            {t('summaryBar.today')}
          </Typography>
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
      </Container>
    </Box>
  )
}
