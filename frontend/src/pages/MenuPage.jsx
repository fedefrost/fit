import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import SelectedProfileGate from '../components/SelectedProfileGate'
import { ProfileAvatar } from '../components/profiles/ProfileCard'
import { bmi, formatBmi, profileLabel } from '../lib/profile'
import { SECTIONS } from '../lib/sections'

function SectionTile({ section }) {
  const { t } = useTranslation()
  const { key, path, Icon, color } = section

  return (
    <Card
      sx={(theme) => ({
        height: '100%',
        borderRadius: { xs: '20px', sm: '28px' },
        borderColor: `rgba(${theme.vars.palette[color].mainChannel} / 0.35)`,
        background: `linear-gradient(150deg, rgba(${theme.vars.palette[color].mainChannel} / 0.2), rgba(${theme.vars.palette[color].mainChannel} / 0.03) 75%)`,
        transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: theme.vars.palette[color].main,
          boxShadow: `0 14px 32px -16px rgba(${theme.vars.palette[color].mainChannel} / 0.6)`,
        },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } },
      })}
    >
      <CardActionArea
        component={RouterLink}
        to={path}
        sx={{
          height: '100%',
          minHeight: { xs: 180, sm: 240, md: 260 },
          p: { xs: 2, sm: 3.5 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Stack direction="row" sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Avatar
            sx={{
              width: { xs: 52, sm: 76 },
              height: { xs: 52, sm: 76 },
              borderRadius: { xs: '14px', sm: '20px' },
              bgcolor: `${color}.main`,
              color: `${color}.contrastText`,
            }}
          >
            <Icon sx={{ fontSize: { xs: 28, sm: 42 } }} />
          </Avatar>
          <ArrowForwardIcon sx={{ color: `${color}.main`, display: { xs: 'none', sm: 'block' } }} />
        </Stack>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontSize: { xs: '1.2rem', sm: '1.75rem', md: '2rem' } }}>
            {t(`menu.${key}.title`)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: { sm: '1rem' } }}>
            {t(`menu.${key}.description`)}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  )
}

export default function MenuPage() {
  const { t } = useTranslation()

  return (
    <SelectedProfileGate>
      {({ profile, index }) => (
        <>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: { xs: 3, md: 4 } }}
          >
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <ProfileAvatar sex={profile.sex} size={64} />
              <Box>
                <Typography variant="overline" color="secondary" component="p">
                  {t('menu.eyebrow')}
                </Typography>
                <Typography variant="h4" component="h1">
                  {profileLabel(t, index)}
                </Typography>
                <Typography color="text.secondary">
                  {t('menu.summary', {
                    sex: t(`sex.${profile.sex}`),
                    age: profile.age,
                    bmi: formatBmi(bmi(profile.weight, profile.height)),
                  })}
                </Typography>
              </Box>
            </Stack>
            <Button
              component={RouterLink}
              to="/profiles"
              variant="outlined"
              startIcon={<SwapHorizIcon />}
              sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
            >
              {t('nav.changeProfile')}
            </Button>
          </Stack>

          <Typography variant="h6" component="p" sx={{ mb: 2 }}>
            {t('menu.sectionsTitle')}
          </Typography>

          <Grid container spacing={{ xs: 1.5, sm: 2.5 }}>
            {SECTIONS.map((section) => (
              <Grid key={section.key} size={6}>
                <SectionTile section={section} />
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </SelectedProfileGate>
  )
}
