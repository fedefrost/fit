import { useTranslation } from 'react-i18next'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { formatNumber } from '../../lib/profile'

export default function DeleteProfileDialog({ open, profile, label, deleting, onClose, onConfirm }) {
  const { t } = useTranslation()

  const handleClose = () => {
    if (!deleting) onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{t('deleteDialog.title', { label })}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {profile &&
            `${t('deleteDialog.details', {
              weight: formatNumber(profile.weight),
              height: formatNumber(profile.height),
              age: profile.age,
            })} `}
          {t('deleteDialog.irreversible')}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={deleting} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button onClick={onConfirm} variant="contained" color="error" loading={deleting}>
          {t('deleteDialog.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
