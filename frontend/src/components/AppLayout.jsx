import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, NavLink, Outlet, useLocation } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import Toolbar from '@mui/material/Toolbar'
import GroupIcon from '@mui/icons-material/Group'
import { useSelectedProfile } from '../context/SelectedProfileContext'
import { profileLabel, sexIcon } from '../lib/profile'
import LanguageMenu from './LanguageMenu'
import Logo from './Logo'

function SelectedProfileChip() {
  const { t } = useTranslation()
  const { selected } = useSelectedProfile()
  if (!selected) return null

  const label = profileLabel(t, selected.index)
  const SexIcon = sexIcon(selected.profile.sex)

  return (
    <Chip
      component={RouterLink}
      to="/menu"
      clickable
      color="secondary"
      variant="outlined"
      icon={<SexIcon />}
      label={label}
      aria-label={t('nav.selectedProfile', { label })}
      sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
    />
  )
}

export default function AppLayout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  // Cada vista nueva empieza arriba (el router no restaura el scroll por sí solo).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        backgroundImage:
          'radial-gradient(900px 380px at 8% -12%, rgba(56, 189, 248, 0.18), transparent 70%),' +
          'radial-gradient(700px 320px at 96% -8%, rgba(52, 211, 153, 0.16), transparent 70%)',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={(theme) => ({
          backdropFilter: 'blur(12px)',
          backgroundColor: `rgba(${theme.vars.palette.background.defaultChannel} / 0.78)`,
          borderBottom: 1,
          borderColor: 'divider',
        })}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: { xs: 1, sm: 2 } }}>
            <Box component={RouterLink} to="/" aria-label={t('nav.home')} sx={{ display: 'flex', borderRadius: 2 }}>
              <Logo height={34} />
            </Box>
            <SelectedProfileChip />
            <Box sx={{ flexGrow: 1 }} />
            <LanguageMenu />
            {/* Ir a /profiles reinicia la selección (ver ProfilesPage). */}
            <Button
              component={NavLink}
              to="/profiles"
              startIcon={<GroupIcon />}
              color="inherit"
              sx={{ '&.active': { color: 'primary.main', bgcolor: 'action.selected' } }}
            >
              {t('nav.profiles')}
            </Button>
          </Toolbar>
        </Container>
      </AppBar>

      <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Outlet />
      </Container>
    </Box>
  )
}
