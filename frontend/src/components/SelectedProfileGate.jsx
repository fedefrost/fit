import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import { apiErrorMessage, ApiError } from '../api/profiles'
import { useSelectedProfile } from '../context/SelectedProfileContext'

/**
 * Muestra a `children(selected)` cuando los datos del perfil elegido están listos;
 * mientras tanto, un esqueleto, o un aviso si el perfil ya no existe o la API falla.
 */
export default function SelectedProfileGate({ children }) {
  const { t } = useTranslation()
  const { selected, status, refresh } = useSelectedProfile()

  if (status === 'missing') {
    return (
      <Alert
        severity="warning"
        action={
          <Button component={RouterLink} to="/profiles" color="inherit" size="small">
            {t('nav.profiles')}
          </Button>
        }
      >
        {t('menu.notFound')}
      </Alert>
    )
  }

  if (status === 'error') {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={refresh}>
            {t('common.retry')}
          </Button>
        }
      >
        {apiErrorMessage(new ApiError(0), t)}
      </Alert>
    )
  }

  if (!selected) {
    return (
      <Box>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 4 }}>
          <Skeleton variant="circular" width={64} height={64} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width={120} />
            <Skeleton width={220} height={44} />
          </Box>
        </Stack>
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: '28px' }} />
      </Box>
    )
  }

  return children(selected)
}
