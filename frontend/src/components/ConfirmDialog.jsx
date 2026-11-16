import { useTranslation } from 'react-i18next'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

export default function ConfirmDialog({ open, title, body, confirmLabel, busy, onClose, onConfirm }) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{body}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={busy} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button onClick={onConfirm} variant="contained" loading={busy}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
