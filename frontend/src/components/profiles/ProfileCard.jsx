import { useTranslation } from 'react-i18next'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import BlockIcon from '@mui/icons-material/Block'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import HomeIcon from '@mui/icons-material/Home'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { brand } from '../../theme'
import { bmi, bmiCategory, formatBmi, formatDate, formatNumber, sexIcon } from '../../lib/profile'

function Stat({ label, value, unit }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, py: 1.25, px: 1, borderRadius: 3, bgcolor: 'action.hover', textAlign: 'center' }}>
      <Typography variant="overline" component="p" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: 11 }}>
        {label}
      </Typography>
      <Typography variant="h6" component="p" sx={{ lineHeight: 1.2 }}>
        {value}
        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5, fontWeight: 700 }}>
          {unit}
        </Typography>
      </Typography>
    </Box>
  )
}

export function ProfileAvatar({ sex, size = 44 }) {
  const SexIcon = sexIcon(sex)
  return (
    <Avatar sx={{ width: size, height: size, color: '#FFFFFF', background: `linear-gradient(135deg, ${brand.sky}, ${brand.green})` }}>
      <SexIcon fontSize={size > 50 ? 'large' : 'medium'} />
    </Avatar>
  )
}

const NO_FOODS = { preferred: 0, rejected: 0 }
const NO_EQUIPMENT = { home: 0, gym: 0 }

/** Fila clicable de la tarjeta (alimentos, equipamiento) con contadores e icono. */
function SettingsRow({ icon, title, onClick, ariaLabel, counts }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-label={ariaLabel}
      sx={{
        width: '100%',
        justifyContent: 'space-between',
        gap: 1,
        px: 1.5,
        py: 1.25,
        borderRadius: 3,
        bgcolor: 'action.hover',
        transition: 'background-color 150ms',
        '&:hover': { bgcolor: 'action.selected' },
        '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        {icon}
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        {counts.map(({ Icon, color, value, hint }) => (
          <Tooltip key={hint} title={hint}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color }}>
              <Icon sx={{ fontSize: 16 }} />
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {value}
              </Typography>
            </Stack>
          </Tooltip>
        ))}
        <ChevronRightIcon color="action" fontSize="small" />
      </Stack>
    </ButtonBase>
  )
}

export default function ProfileCard({ profile, label, onSelect, onEdit, onDelete, onEditFoods, onEditEquipment }) {
  const { t } = useTranslation()
  const foodCounts = profile.foodCounts ?? NO_FOODS
  const equipmentCounts = profile.equipmentCounts ?? NO_EQUIPMENT
  const bmiValue = bmi(profile.weight, profile.height)
  const category = bmiCategory(bmiValue, profile.age)

  return (
    <Card component="article" aria-label={label} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        avatar={<ProfileAvatar sex={profile.sex} />}
        title={label}
        subheader={`${t(`sex.${profile.sex}`)} · ${t(`activity.${profile.activityLevel ?? 'sedentary'}.short`)}`}
        slotProps={{ title: { variant: 'subtitle1', component: 'h2' }, subheader: { variant: 'body2' } }}
        action={
          <Stack direction="row">
            <Tooltip title={t('profiles.edit')}>
              <IconButton aria-label={t('profiles.editAria', { label })} onClick={onEdit}>
                <EditOutlinedIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('profiles.delete')}>
              <IconButton
                aria-label={t('profiles.deleteAria', { label })}
                onClick={onDelete}
                sx={{ '&:hover': { color: 'error.main' } }}
              >
                <DeleteOutlineIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        }
        sx={{ pb: 1 }}
      />

      <CardContent sx={{ pt: 1, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Stack direction="row" spacing={1}>
          <Stat label={t('profiles.weight')} value={formatNumber(profile.weight)} unit="kg" />
          <Stat label={t('profiles.height')} value={formatNumber(profile.height)} unit="cm" />
          <Stat label={t('profiles.age')} value={profile.age} unit={t('profiles.years')} />
        </Stack>

        <Divider />

        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('profiles.bmi')}
            </Typography>
            <Typography variant="h5" component="p">
              {formatBmi(bmiValue)}
            </Typography>
          </Box>
          <Chip label={t(category.key)} color={category.color} size="small" variant="outlined" />
        </Stack>

        <Stack spacing={1}>
          <SettingsRow
            icon={<RestaurantMenuIcon color="primary" fontSize="small" />}
            title={t('foods.cardTitle')}
            onClick={onEditFoods}
            ariaLabel={t('foods.cardAria', { label, preferred: foodCounts.preferred, rejected: foodCounts.rejected })}
            counts={[
              { Icon: FavoriteIcon, color: 'success.main', value: foodCounts.preferred, hint: t('foods.preferredShort', { count: foodCounts.preferred }) },
              { Icon: BlockIcon, color: 'error.main', value: foodCounts.rejected, hint: t('foods.rejectedShort', { count: foodCounts.rejected }) },
            ]}
          />
          <SettingsRow
            icon={<FitnessCenterIcon color="primary" fontSize="small" />}
            title={t('equipment.cardTitle')}
            onClick={onEditEquipment}
            ariaLabel={t('equipment.cardAria', { label, home: equipmentCounts.home, gym: equipmentCounts.gym })}
            counts={[
              { Icon: HomeIcon, color: 'primary.main', value: equipmentCounts.home, hint: t('equipment.homeShort', { count: equipmentCounts.home }) },
              { Icon: FitnessCenterIcon, color: 'secondary.main', value: equipmentCounts.gym, hint: t('equipment.gymShort', { count: equipmentCounts.gym }) },
            ]}
          />
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto' }}>
          {t('profiles.updatedAt', { date: formatDate(profile.updatedAt) })}
        </Typography>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
        <Button
          variant="contained"
          fullWidth
          endIcon={<ArrowForwardIcon />}
          onClick={onSelect}
          aria-label={t('profiles.selectAria', { label })}
        >
          {t('profiles.select')}
        </Button>
      </CardActions>
    </Card>
  )
}
