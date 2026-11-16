import { useTranslation } from 'react-i18next'
import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import { MAX_PROFILES } from '../../lib/profile'

export default function EmptySlotCard({ slot, onClick, disabled }) {
  const { t } = useTranslation()

  return (
    <Card
      sx={{
        height: '100%',
        minHeight: 240,
        borderStyle: 'dashed',
        borderWidth: 2,
        bgcolor: 'transparent',
        transition: 'border-color 150ms',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <CardActionArea
        onClick={onClick}
        disabled={disabled}
        aria-label={t('profiles.addSlotAria', { slot })}
        sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column', gap: 1.25 }}
      >
        <Avatar
          sx={(theme) => ({
            width: 52,
            height: 52,
            color: 'primary.main',
            bgcolor: `rgba(${theme.vars.palette.primary.mainChannel} / 0.12)`,
          })}
        >
          <AddIcon />
        </Avatar>
        <Typography variant="subtitle1" component="span">
          {t('profiles.addSlot')}
        </Typography>
        <Typography variant="body2" color="text.secondary" component="span">
          {t('profiles.slotAvailable', { slot, max: MAX_PROFILES })}
        </Typography>
      </CardActionArea>
    </Card>
  )
}
