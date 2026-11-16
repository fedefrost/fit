import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SelectedProfileGate from '../components/SelectedProfileGate'
import { profileLabel } from '../lib/profile'
import { SECTIONS } from '../lib/sections'

/** Página provisoria de cada sección del menú hasta que tenga contenido propio. */
export default function SectionPage({ sectionKey }) {
  const { t } = useTranslation()
  const { Icon, color } = SECTIONS.find((section) => section.key === sectionKey)

  return (
    <SelectedProfileGate>
      {({ index }) => (
        <>
          <Button component={RouterLink} to="/menu" startIcon={<ArrowBackIcon />} color="inherit" sx={{ mb: 3 }}>
            {t('common.backToMenu')}
          </Button>
          <Card sx={{ maxWidth: 640 }}>
            <CardContent sx={{ p: { xs: 3, sm: 5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Avatar
                sx={{ width: 72, height: 72, borderRadius: '20px', bgcolor: `${color}.main`, color: `${color}.contrastText` }}
              >
                <Icon sx={{ fontSize: 40 }} />
              </Avatar>
              <div>
                <Typography variant="overline" color="secondary" component="p">
                  {t('comingSoon.eyebrow')}
                </Typography>
                <Typography variant="h4" component="h1" gutterBottom>
                  {t(`menu.${sectionKey}.title`)}
                </Typography>
                <Typography color="text.secondary">
                  {t('comingSoon.body', { label: profileLabel(t, index) })}
                </Typography>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </SelectedProfileGate>
  )
}
