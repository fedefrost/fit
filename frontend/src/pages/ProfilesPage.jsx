import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import { apiErrorMessage, createProfile, deleteProfile, listProfiles, updateProfile } from '../api/profiles'
import { useSelectedProfile } from '../context/SelectedProfileContext'
import { MAX_PROFILES, profileLabel } from '../lib/profile'
import DeleteProfileDialog from '../components/profiles/DeleteProfileDialog'
import EmptySlotCard from '../components/profiles/EmptySlotCard'
import FoodPreferencesDialog from '../components/profiles/FoodPreferencesDialog'
import ProfileCard from '../components/profiles/ProfileCard'
import ProfileFormDialog from '../components/profiles/ProfileFormDialog'

const gridItem = { xs: 12, sm: 6, md: 4 }

function LoadingCards() {
  return Array.from({ length: 3 }, (_, index) => (
    <Grid key={index} size={gridItem}>
      <Card sx={{ height: 320 }}>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 3 }}>
            <Skeleton variant="circular" width={44} height={44} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="50%" />
              <Skeleton width="30%" />
            </Box>
          </Stack>
          <Skeleton variant="rounded" height={64} sx={{ mb: 2 }} />
          <Skeleton width="60%" height={40} />
          <Skeleton variant="rounded" height={40} sx={{ mt: 3, borderRadius: 999 }} />
        </CardContent>
      </Card>
    </Grid>
  ))
}

export default function ProfilesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { select, clear } = useSelectedProfile()

  const [profiles, setProfiles] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [loadError, setLoadError] = useState('')

  // Se separa "abierto" de "objetivo" para que el contenido no desaparezca durante la animación de cierre.
  // Se guarda el índice (no la etiqueta) para que el nombre se traduzca si se cambia de idioma.
  const [formOpen, setFormOpen] = useState(false)
  const [formTarget, setFormTarget] = useState({ profile: null, index: 0 })
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState({ profile: null, index: 0 })
  const [deleting, setDeleting] = useState(false)
  const [foodsOpen, setFoodsOpen] = useState(false)
  const [foodsTarget, setFoodsTarget] = useState({ profile: null, index: 0 })
  const [toast, setToast] = useState(null)

  const count = profiles.length
  const isFull = count >= MAX_PROFILES
  const limitMessage = t('profiles.limit', { max: MAX_PROFILES })

  // Entrar en /profiles (p. ej. desde la barra superior) reinicia la selección para elegir otro perfil.
  useEffect(() => {
    clear()
  }, [clear])

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      setProfiles(await listProfiles())
      setStatus('ready')
    } catch (error) {
      setLoadError(error)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const notify = useCallback((message, severity = 'success') => setToast({ message, severity, key: Date.now() }), [])

  const openFoods = (profile, index) => {
    setFoodsTarget({ profile, index })
    setFoodsOpen(true)
  }

  const handleFoodsSaved = (foodCounts) => {
    const { profile, index } = foodsTarget
    setProfiles((current) => current.map((item) => (item.id === profile.id ? { ...item, foodCounts } : item)))
    setFoodsOpen(false)
    notify(t('foods.saved', { label: profileLabel(t, index) }))
  }

  // Estable (useCallback) porque el diálogo lo usa como dependencia al cargar.
  const handleFoodsGone = useCallback(() => {
    setFoodsOpen(false)
    notify(t('profiles.goneOnEdit'), 'warning')
    load()
  }, [load, notify, t])

  const handleSelect = (profile, index) => {
    select(profile, index)
    navigate('/menu')
  }

  const openCreate = () => {
    if (isFull) return notify(limitMessage, 'warning')
    setFormTarget({ profile: null, index: count })
    setFormOpen(true)
  }

  const openEdit = (profile, index) => {
    setFormTarget({ profile, index })
    setFormOpen(true)
  }

  const openDelete = (profile, index) => {
    setDeleteTarget({ profile, index })
    setDeleteOpen(true)
  }

  const handleSubmit = async (input) => {
    const editing = formTarget.profile

    if (editing) {
      try {
        const updated = await updateProfile(editing.id, input)
        // El PUT no devuelve foodCounts: se conservan los que ya había.
        setProfiles((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
      } catch (error) {
        if (error.status === 404) {
          setFormOpen(false)
          notify(t('profiles.goneOnEdit'), 'warning')
          load()
          return
        }
        throw error
      }
      setFormOpen(false)
      notify(t('profiles.updated', { label: profileLabel(t, formTarget.index) }))
      return
    }

    // Se vuelve a consultar antes de crear por si se agregaron perfiles desde otra pestaña.
    // El backend también aplica el límite y responde 409 si ya hay MAX_PROFILES.
    const latest = await listProfiles()
    if (latest.length >= MAX_PROFILES) {
      setProfiles(latest)
      setFormOpen(false)
      notify(limitMessage, 'warning')
      return
    }

    let created
    try {
      created = await createProfile(input)
    } catch (error) {
      if (error.status === 409) {
        setFormOpen(false)
        notify(limitMessage, 'warning')
        load()
        return
      }
      throw error
    }
    setProfiles([...latest, created])
    setFormOpen(false)
    notify(t('profiles.created', { label: profileLabel(t, latest.length) }))
  }

  const handleDelete = async () => {
    const { profile, index } = deleteTarget
    setDeleting(true)
    try {
      await deleteProfile(profile.id)
      setProfiles((current) => current.filter((item) => item.id !== profile.id))
      notify(t('profiles.deleted', { label: profileLabel(t, index) }))
    } catch (error) {
      if (error.status === 404) {
        setProfiles((current) => current.filter((item) => item.id !== profile.id))
        notify(t('profiles.alreadyDeleted'), 'info')
      } else {
        notify(apiErrorMessage(error, t), 'error')
      }
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const emptySlots = MAX_PROFILES - count

  return (
    <>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        sx={{ alignItems: { md: 'flex-end' }, justifyContent: 'space-between', mb: 4 }}
      >
        <Box>
          <Typography variant="overline" color="secondary" component="p">
            {t('profiles.eyebrow')}
          </Typography>
          <Typography variant="h4" component="h1" gutterBottom>
            {t('profiles.title')}
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 540 }}>
            {t('profiles.description', { max: MAX_PROFILES })}
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: { sm: 'center' } }}>
          {status === 'ready' && (
            <Box sx={{ minWidth: 180 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t('profiles.count', { count, max: MAX_PROFILES })}
              </Typography>
              <LinearProgress
                variant="determinate"
                color="secondary"
                value={(count / MAX_PROFILES) * 100}
                aria-label={t('profiles.countAria', { count, max: MAX_PROFILES })}
                sx={{ mt: 0.75, height: 8, borderRadius: 4 }}
              />
              {isFull && (
                <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
                  {t('profiles.limitHint')}
                </Typography>
              )}
            </Box>
          )}
          <Tooltip title={isFull ? limitMessage : ''}>
            <span>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={openCreate}
                disabled={status !== 'ready' || isFull}
                fullWidth
              >
                {t('profiles.new')}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

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

      {status !== 'error' && (
        <Grid container spacing={2.5}>
          {status === 'loading' && <LoadingCards />}

          {status === 'ready' &&
            profiles.map((profile, index) => (
              <Grid key={profile.id} size={gridItem}>
                <ProfileCard
                  profile={profile}
                  label={profileLabel(t, index)}
                  onSelect={() => handleSelect(profile, index)}
                  onEdit={() => openEdit(profile, index)}
                  onDelete={() => openDelete(profile, index)}
                  onEditFoods={() => openFoods(profile, index)}
                />
              </Grid>
            ))}

          {status === 'ready' &&
            Array.from({ length: emptySlots }, (_, index) => (
              <Grid key={`slot-${index}`} size={gridItem}>
                <EmptySlotCard slot={count + index + 1} onClick={openCreate} />
              </Grid>
            ))}
        </Grid>
      )}

      <ProfileFormDialog
        open={formOpen}
        profile={formTarget.profile}
        title={
          formTarget.profile
            ? t('form.editTitle', { label: profileLabel(t, formTarget.index) })
            : t('form.newTitle')
        }
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <DeleteProfileDialog
        open={deleteOpen}
        profile={deleteTarget.profile}
        label={profileLabel(t, deleteTarget.index)}
        deleting={deleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />

      <FoodPreferencesDialog
        open={foodsOpen}
        profile={foodsTarget.profile}
        label={profileLabel(t, foodsTarget.index)}
        onClose={() => setFoodsOpen(false)}
        onSaved={handleFoodsSaved}
        onGone={handleFoodsGone}
      />

      <Snackbar
        key={toast?.key}
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={(_event, reason) => reason !== 'clickaway' && setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  )
}
