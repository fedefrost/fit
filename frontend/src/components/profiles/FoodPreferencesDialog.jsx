import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { apiErrorMessage } from '../../api/client'
import { getProfileFoods, listFoods, updateProfileFoods } from '../../api/foods'
import { MAX_FOODS_PER_LIST, sortFoods } from '../../lib/foods'
import FoodListField from './FoodListField'

const idSet = (foods) => new Set(foods.map((food) => food.id))

export default function FoodPreferencesDialog({ open, profile, label, onClose, onSaved, onGone }) {
  const { t, i18n } = useTranslation()
  const fullScreen = useMediaQuery((theme) => theme.breakpoints.down('sm'))

  const [catalog, setCatalog] = useState([])
  const [preferred, setPreferred] = useState([])
  const [rejected, setRejected] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [limitHit, setLimitHit] = useState({ preferred: false, rejected: false })

  const load = useCallback(async () => {
    if (!profile) return
    setStatus('loading')
    try {
      const [foods, lists] = await Promise.all([listFoods(), getProfileFoods(profile.id)])
      setCatalog(foods)
      setPreferred(lists.preferred)
      setRejected(lists.rejected)
      setStatus('ready')
    } catch (error) {
      if (error.status === 404) return onGone()
      setLoadError(error)
      setStatus('error')
    }
  }, [profile, onGone])

  useEffect(() => {
    if (open) {
      setSaveError('')
      setLimitHit({ preferred: false, rejected: false })
      load()
    }
  }, [open, load])

  const options = useMemo(() => sortFoods(catalog, i18n.resolvedLanguage), [catalog, i18n.resolvedLanguage])
  const preferredIds = useMemo(() => idSet(preferred), [preferred])
  const rejectedIds = useMemo(() => idSet(rejected), [rejected])
  // Bloquea agregar si la lista superaría su máximo (quitar siempre está permitido).
  const changeList = (kind, setList) => (next) => {
    const exceeds = next.length > MAX_FOODS_PER_LIST
    setLimitHit((current) => ({ ...current, [kind]: exceeds }))
    if (!exceeds) setList(next)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const saved = await updateProfileFoods(profile.id, {
        preferred: preferred.map((food) => food.id),
        rejected: rejected.map((food) => food.id),
      })
      onSaved({ preferred: saved.preferred.length, rejected: saved.rejected.length })
    } catch (error) {
      if (error.status === 404) return onGone()
      setSaveError(error.status === 400 ? t('foods.invalid') : apiErrorMessage(error, t))
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md" fullScreen={fullScreen} scroll="paper">
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>{t('foods.title', { label })}</DialogTitle>

      <DialogContent dividers>
        <Typography color="text.secondary" sx={{ mb: 2.5 }}>
          {t('foods.intro')}
        </Typography>

        {status === 'loading' && (
          <Stack spacing={2} sx={{ alignItems: 'center', py: 6 }}>
            <CircularProgress />
            <Typography color="text.secondary">{t('foods.loading')}</Typography>
          </Stack>
        )}

        {status === 'error' && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={load}>
                {t('common.retry')}
              </Button>
            }
          >
            {apiErrorMessage(loadError, t)}
          </Alert>
        )}

        {status === 'ready' && (
          <Stack spacing={3}>
            <FoodListField
              kind="preferred"
              otherKind="rejected"
              options={options}
              value={preferred}
              otherIds={rejectedIds}
              max={MAX_FOODS_PER_LIST}
              limitHit={limitHit.preferred}
              onChange={changeList('preferred', setPreferred)}
            />

            <Divider />

            <FoodListField
              kind="rejected"
              otherKind="preferred"
              options={options}
              value={rejected}
              otherIds={preferredIds}
              max={MAX_FOODS_PER_LIST}
              limitHit={limitHit.rejected}
              onChange={changeList('rejected', setRejected)}
            />

            {saveError && <Alert severity="error">{saveError}</Alert>}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={saving} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSave} variant="contained" loading={saving} disabled={status !== 'ready'}>
          {t('foods.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
