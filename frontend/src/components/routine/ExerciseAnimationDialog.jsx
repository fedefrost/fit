import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useWorkout } from '../../context/WorkoutContext'
import { equipmentName, exerciseAnimation, exerciseInstructions, exerciseName } from '../../lib/exercise'

/** Animación (GIF) e instrucciones de un ejercicio. */
export default function ExerciseAnimationDialog({ exercise, onClose }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const { equipmentById } = useWorkout()
  const open = Boolean(exercise)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {exercise && (
        <>
          <DialogTitle sx={{ fontWeight: 800 }}>{t('routine.howTitle', { name: exerciseName(exercise, language) })}</DialogTitle>
          <DialogContent>
            <Box
              component="img"
              src={exerciseAnimation(exercise)}
              alt={t('routine.howTitle', { name: exerciseName(exercise, language) })}
              width={240}
              height={240}
              sx={{ display: 'block', width: '100%', maxWidth: 320, height: 'auto', mx: 'auto', borderRadius: '20px', mb: 2 }}
            />
            <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap', mb: 1.5 }}>
              <Chip size="small" color="primary" label={t(`muscles.${exercise.muscle}`)} />
              {exercise.equipmentIds.length === 0 ? (
                <Chip size="small" variant="outlined" label={t('routine.bodyweight')} />
              ) : (
                exercise.equipmentIds.map((id) => (
                  <Chip key={id} size="small" variant="outlined" label={equipmentName(equipmentById.get(id) ?? { nameEs: '—', nameEn: '—' }, language)} />
                ))
              )}
              {exercise.highImpact && <Chip size="small" color="warning" variant="outlined" label={t('routine.highImpact')} />}
            </Stack>
            <Typography color="text.secondary">{exerciseInstructions(exercise, language)}</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} variant="contained">
              OK
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
