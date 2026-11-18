import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import HomeIcon from '@mui/icons-material/Home'
import { apiErrorMessage } from '../../api/client'
import { getProfileEquipment, listEquipment, updateProfileEquipment } from '../../api/workout'
import { equipmentName } from '../../lib/exercise'

const LOCATION_STYLE = { home: { Icon: HomeIcon, color: 'primary' }, gym: { Icon: FitnessCenterIcon, color: 'secondary' } }

function EquipmentField({ location, options, value, onChange }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const { Icon, color } = LOCATION_STYLE[location]
  const titleId = `equipment-${location}-title`

  return (
    <Box component="section" aria-labelledby={titleId}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: `${color}.main`, color: `${color}.contrastText` }}>
          <Icon fontSize="small" />
        </Avatar>
        <Box>
          <Typography id={titleId} variant="subtitle1" component="h3" sx={{ lineHeight: 1.3 }}>
            {t(`equipment.${location}.title`)}{' '}
            <Typography component="span" color="text.secondary" sx={{ fontWeight: 700 }}>
              ({value.length})
            </Typography>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(`equipment.${location}.description`)}
          </Typography>
        </Box>
      </Stack>
      <Autocomplete
        multiple
        options={options}
        value={value}
        onChange={(_event, next) => onChange(next)}
        getOptionLabel={(item) => equipmentName(item, language)}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        filterSelectedOptions
        disableCloseOnSelect
        autoHighlight
        noOptionsText={t('equipment.noResults')}
        renderValue={(items, getItemProps) =>
          items.map((item, index) => {
            const { key, ...itemProps } = getItemProps({ index })
            return <Chip key={key} size="small" color={color} variant="outlined" label={equipmentName(item, language)} {...itemProps} />
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={t('equipment.placeholder')}
            inputProps={{ ...params.inputProps, 'aria-labelledby': titleId }}
          />
        )}
      />
    </Box>
  )
}

/** Qué máquinas y herramientas tiene el perfil en casa y en el gimnasio. */
export default function EquipmentDialog({ open, profile, label, onClose, onSaved, onGone }) {
  const { t, i18n } = useTranslation()
  const fullScreen = useMediaQuery((theme) => theme.breakpoints.down('sm'))

  const [catalog, setCatalog] = useState([])
  const [home, setHome] = useState([])
  const [gym, setGym] = useState([])
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const load = useCallback(async () => {
    if (!profile) return
    setStatus('loading')
    try {
      const [items, lists] = await Promise.all([listEquipment(), getProfileEquipment(profile.id)])
      setCatalog(items)
      setHome(lists.home)
      setGym(lists.gym)
      setStatus('ready')
    } catch (error) {
      if (error.status === 404) return onGone?.()
      setLoadError(error)
      setStatus('error')
    }
  }, [profile, onGone])

  useEffect(() => {
    if (open) {
      setSaveError('')
      load()
    }
  }, [open, load])

  const language = i18n.resolvedLanguage
  const options = [...catalog].sort((a, b) => equipmentName(a, language).localeCompare(equipmentName(b, language), language))

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const saved = await updateProfileEquipment(profile.id, { home: home.map((item) => item.id), gym: gym.map((item) => item.id) })
      onSaved({ home: saved.home.length, gym: saved.gym.length })
    } catch (error) {
      if (error.status === 404) return onGone?.()
      setSaveError(apiErrorMessage(error, t))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="sm" fullScreen={fullScreen} scroll="paper">
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>{t('equipment.title', { label })}</DialogTitle>
      <DialogContent dividers>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          {t('equipment.intro')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {t('equipment.bodyweightNote')}
        </Typography>

        {status === 'loading' && (
          <Stack spacing={2} sx={{ alignItems: 'center', py: 5 }}>
            <CircularProgress />
            <Typography color="text.secondary">{t('equipment.loading')}</Typography>
          </Stack>
        )}
        {status === 'error' && (
          <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>{t('common.retry')}</Button>}>
            {apiErrorMessage(loadError, t)}
          </Alert>
        )}
        {status === 'ready' && (
          <Stack spacing={3}>
            <EquipmentField location="home" options={options} value={home} onChange={setHome} />
            <Divider />
            <EquipmentField location="gym" options={options} value={gym} onChange={setGym} />
            {saveError && <Alert severity="error">{saveError}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSave} variant="contained" loading={saving} disabled={status !== 'ready'}>
          {t('equipment.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
