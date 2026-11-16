import { useId } from 'react'
import Box from '@mui/material/Box'
import { brand } from '../theme'

/**
 * Logo de Fit: un símbolo con degradado celeste → verde y una línea de pulso,
 * seguido del nombre "Fit" dibujado con trazos redondeados (no depende de fuentes).
 * El nombre usa `currentColor`, así que toma el color de texto del tema.
 */
export default function Logo({ height = 36, showWordmark = true, sx }) {
  const gradientId = `fit-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const viewWidth = showWordmark ? 120 : 48

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${viewWidth} 48`}
      role="img"
      aria-label="Fit"
      sx={{ display: 'block', height, width: (height * viewWidth) / 48, color: 'text.primary', ...sx }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={brand.sky} />
          <stop offset="1" stopColor={brand.green} />
        </linearGradient>
      </defs>

      <rect width="48" height="48" rx="14" fill={`url(#${gradientId})`} />
      <path
        d="M9 26.5h7.5l3.5-8 6 15.5 4-11 2.5 3.5H39"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {showWordmark && (
        <>
          <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M64 37V12.5h14M64 24.5h11" />
            <path d="M89.5 23v14" />
            <path d="M107 13v19.5a4.5 4.5 0 0 0 4.5 4.5h2.5M101.5 22H114" />
          </g>
          <circle cx="89.5" cy="12.5" r="4.25" fill={brand.green} />
        </>
      )}
    </Box>
  )
}
