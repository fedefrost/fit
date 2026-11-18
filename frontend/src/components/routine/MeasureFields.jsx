import { useTranslation } from 'react-i18next'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { measureFields, parseMeasureInput } from '../../lib/exercise'

const WIDTH = { minutes: 112, sets: 84, reps: 84, weightKg: 96 }

/**
 * Campos de medida según el tipo de ejercicio (minutos | series + reps | + kg).
 * `values` son textos (admiten coma decimal). `onCommit` se llama al salir del campo o con Enter.
 */
export default function MeasureFields({ measure, values, onChange, onCommit, disabled, idPrefix }) {
  const { t } = useTranslation()

  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {measureFields(measure).map((field) => {
        const invalid = parseMeasureInput(field, values[field]) === null
        return (
          <TextField
            key={field}
            id={idPrefix ? `${idPrefix}-${field}` : undefined}
            size="small"
            label={t(`routine.measures.${field}`)}
            value={values[field] ?? ''}
            onChange={(event) => onChange({ ...values, [field]: event.target.value })}
            onBlur={onCommit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onCommit?.()
            }}
            error={invalid}
            disabled={disabled}
            slotProps={{
              htmlInput: {
                inputMode: field === 'sets' || field === 'reps' ? 'numeric' : 'decimal',
                autoComplete: 'off',
                'aria-invalid': invalid,
              },
            }}
            sx={{ width: WIDTH[field] }}
          />
        )
      })}
    </Stack>
  )
}
