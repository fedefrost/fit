import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import InsightsIcon from '@mui/icons-material/Insights'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'

/**
 * Secciones del menú principal. `color` es la paleta del tema que usa cada ventana;
 * se alternan en diagonal (verde / celeste / celeste / verde) para formar el 2x2.
 * Los textos se traducen con t(`menu.${key}.title`) y t(`menu.${key}.description`).
 */
export const SECTIONS = [
  { key: 'diet', path: '/diet', Icon: RestaurantIcon, color: 'secondary' },
  { key: 'routine', path: '/routine', Icon: FitnessCenterIcon, color: 'primary' },
  { key: 'history', path: '/history', Icon: InsightsIcon, color: 'primary' },
  { key: 'shopping', path: '/shopping', Icon: ShoppingCartIcon, color: 'secondary' },
]
