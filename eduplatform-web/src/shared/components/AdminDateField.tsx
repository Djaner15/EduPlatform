import TextField from '@mui/material/TextField'

type AdminDateFieldProps = {
  value: string
  onChange: (value: string) => void
  fullWidth?: boolean
  minWidth?: number
  width?: number | string
  placeholder?: string
  ariaLabel?: string
}

export function AdminDateField({
  value,
  onChange,
  fullWidth = true,
  minWidth,
  width,
  placeholder = 'dd.mm.yyyy',
  ariaLabel,
}: AdminDateFieldProps) {
  return (
    <TextField
      fullWidth={fullWidth}
      size="small"
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      inputProps={{ 'aria-label': ariaLabel ?? placeholder }}
      sx={{
        minWidth,
        width,
        '& .MuiOutlinedInput-root': {
          borderRadius: '1rem',
          background: 'rgba(240, 249, 255, 0.7)',
          fontFamily: 'var(--font-sans)',
          color: '#082f49',
          transition: '180ms ease',
        },
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgb(186 230 253)',
        },
        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgb(125 211 252)',
        },
        '& .MuiOutlinedInput-root.Mui-focused': {
          background: '#fff',
        },
        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: '#38bdf8',
          boxShadow: '0 0 0 4px rgba(186, 230, 253, 0.45)',
        },
        '& .MuiOutlinedInput-input': {
          py: '0.55rem',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.92rem',
        },
        '& .MuiOutlinedInput-input::placeholder': {
          color: 'rgba(8, 47, 73, 0.6)',
          opacity: 1,
        },
      }}
    />
  )
}
