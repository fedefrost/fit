import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

/**
 * Barra "consumido de objetivo" con icono y textos ya formateados.
 * Pasado el 110 % del objetivo se pinta de naranja como aviso.
 */
export default function NutrientProgress({ icon, label, valueText, consumed, target, color }) {
  const ratio = target > 0 ? consumed / target : 0
  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
        <Box sx={{ display: 'flex', color: `${color}.main` }}>{icon}</Box>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto !important', fontWeight: 700 }}>
          {valueText}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, ratio * 100)}
        color={ratio > 1.1 ? 'warning' : color}
        aria-label={`${label}: ${valueText}`}
        sx={{ height: 10, borderRadius: 5 }}
      />
    </Box>
  )
}
