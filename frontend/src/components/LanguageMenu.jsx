import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@mui/material/Button'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import CheckIcon from '@mui/icons-material/Check'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import TranslateIcon from '@mui/icons-material/Translate'
import { LANGUAGES } from '../i18n'

export default function LanguageMenu() {
  const { t, i18n } = useTranslation()
  const [anchor, setAnchor] = useState(null)
  const current = i18n.resolvedLanguage

  const choose = (language) => {
    setAnchor(null)
    if (language !== current) i18n.changeLanguage(language)
  }

  return (
    <>
      <Button
        color="inherit"
        startIcon={<TranslateIcon />}
        endIcon={<ExpandMoreIcon />}
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-label={`${t('nav.language')}: ${t(`languages.${current}`)}`}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-controls={anchor ? 'language-menu' : undefined}
        sx={{ px: 1.5, minWidth: 0, '& .MuiButton-startIcon': { mr: 0.75 }, '& .MuiButton-endIcon': { ml: 0.25 } }}
      >
        {current.toUpperCase()}
      </Button>
      <Menu
        id="language-menu"
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 180, borderRadius: 3 } } }}
      >
        {LANGUAGES.map((language) => (
          <MenuItem
            key={language}
            selected={language === current}
            onClick={() => choose(language)}
            lang={language}
          >
            <ListItemIcon>{language === current && <CheckIcon fontSize="small" />}</ListItemIcon>
            <ListItemText>{t(`languages.${language}`)}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
