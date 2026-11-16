import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import FormLabel from '@mui/material/FormLabel'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { apiErrorMessage } from '../../api/profiles'
import { PROFILE_FIELDS, SEX_OPTIONS, toInputValue, validateProfile } from '../../lib/profile'

const EMPTY = { weight: '', height: '', age: '', sex: '' }

function toFormValues(profile) {
  if (!profile) return EMPTY
  return {
    weight: toInputValue(profile.weight),
    height: toInputValue(profile.height),
    age: String(profile.age),
    sex: profile.sex,
  }
}

// Los errores de validación del backend vienen en español; se usan los textos propios por campo.
function serverFieldErrors(fieldErrors) {
  return Object.fromEntries(
    Object.keys(fieldErrors)
      .filter((field) => PROFILE_FIELDS.includes(field))
      .map((field) => [field, `validation.${field}`]),
  )
}

export default function ProfileFormDialog({ open, profile, title, onClose, onSubmit }) {
  const { t } = useTranslation()
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({}) // campo -> clave de traducción
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setValues(toFormValues(profile))
      setErrors({})
      setFormError('')
      setSubmitting(false)
    }
  }, [open, profile])

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const { data, errors: nextErrors } = validateProfile(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setFormError('')
    try {
      await onSubmit(data)
    } catch (error) {
      if (error.fieldErrors) setErrors(serverFieldErrors(error.fieldErrors))
      setFormError(apiErrorMessage(error, t))
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) onClose()
  }

  const numberField = (field, unit, inputMode) => (
    <TextField
      label={t(`profiles.${field}`)}
      value={values[field]}
      onChange={(event) => setField(field, event.target.value)}
      error={Boolean(errors[field])}
      helperText={errors[field] ? t(errors[field]) : ' '}
      required
      fullWidth
      slotProps={{
        htmlInput: { inputMode, autoComplete: 'off' },
        input: { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> },
      }}
    />
  )

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { component: 'form', onSubmit: handleSubmit, noValidate: true } }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ pt: 1 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {formError}
            </Alert>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }}>
            {numberField('weight', 'kg', 'decimal')}
            {numberField('height', 'cm', 'decimal')}
          </Stack>
          {numberField('age', t('profiles.years'), 'numeric')}

          <FormControl error={Boolean(errors.sex)} required>
            <FormLabel id="profile-sex-label" sx={{ mb: 1, fontWeight: 700 }}>
              {t('profiles.sex')}
            </FormLabel>
            <ToggleButtonGroup
              aria-labelledby="profile-sex-label"
              exclusive
              fullWidth
              color="primary"
              value={values.sex}
              onChange={(_event, value) => value && setField('sex', value)}
            >
              {SEX_OPTIONS.map(({ value, Icon }) => (
                <ToggleButton key={value} value={value}>
                  <Icon fontSize="small" />
                  {t(`sex.${value}`)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <FormHelperText>{errors.sex ? t(errors.sex) : ' '}</FormHelperText>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={submitting} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="contained" loading={submitting}>
          {profile ? t('form.save') : t('form.create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
