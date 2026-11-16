import { createTheme } from '@mui/material/styles'

// Colores de marca de Fit: azul celeste + verde menta.
// Los tonos "brand" se usan en el logo y en acentos decorativos;
// los "main" de la paleta están oscurecidos para que el texto sobre ellos sea legible.
export const brand = {
  sky: '#38BDF8',
  green: '#34D399',
}

const fontFamily = '"Nunito Variable", "Nunito", system-ui, -apple-system, "Segoe UI", sans-serif'

const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: { light: '#4FC3F7', main: '#0277BD', dark: '#01579B', contrastText: '#FFFFFF' },
        secondary: { light: '#6EE7B7', main: '#059669', dark: '#047857', contrastText: '#FFFFFF' },
        background: { default: '#F3F9FC', paper: '#FFFFFF' },
        text: { primary: '#0B2534', secondary: '#4A6272' },
        divider: 'rgba(11, 37, 52, 0.1)',
      },
    },
    dark: {
      palette: {
        primary: { light: '#B3E5FC', main: '#4FC3F7', dark: '#0288D1', contrastText: '#04263A' },
        secondary: { light: '#A7F3D0', main: '#34D399', dark: '#059669', contrastText: '#03261A' },
        background: { default: '#0A1620', paper: '#11212E' },
        text: { primary: '#E6F3FA', secondary: '#9DB4C2' },
        divider: 'rgba(230, 243, 250, 0.12)',
      },
    },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily,
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 800, letterSpacing: '-0.01em' },
    h6: { fontWeight: 800 },
    subtitle1: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: 'none' },
    overline: { fontWeight: 700, letterSpacing: '0.08em' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999, paddingInline: 18 } },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderRadius: 20 } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 20 } },
    },
    MuiToggleButton: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 700, gap: 6 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 700 } },
    },
  },
})

export default theme
