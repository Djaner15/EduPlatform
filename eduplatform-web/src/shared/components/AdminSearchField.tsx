import Search from '@mui/icons-material/Search'
import InputAdornment from '@mui/material/InputAdornment'
import OutlinedInput from '@mui/material/OutlinedInput'

type AdminSearchFieldProps = {
  placeholder: string
  value: string
  onChange: (value: string) => void
  fullWidth?: boolean
  minWidth?: number
  width?: number | string
  maxWidth?: number | string
  flex?: number | string
}

export function AdminSearchField({
  placeholder,
  value,
  onChange,
  fullWidth = true,
  minWidth,
  width,
  maxWidth,
  flex,
}: AdminSearchFieldProps) {
  return (
    <OutlinedInput
      fullWidth={fullWidth}
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      startAdornment={
        <InputAdornment position="start">
          <Search sx={{ color: '#2468a0', fontSize: 20 }} />
        </InputAdornment>
      }
      sx={{
        flex,
        minWidth,
        width,
        maxWidth,
        ...(fullWidth ? { width: '100%' } : {}),
        borderRadius: '1rem',
        background: 'rgba(240, 249, 255, 0.7)',
        color: '#082f49',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.98rem',
        transition: '180ms ease',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgb(186 230 253)',
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgb(125 211 252)',
        },
        '&.Mui-focused': {
          background: '#fff',
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: '#38bdf8',
          boxShadow: '0 0 0 4px rgba(186, 230, 253, 0.45)',
        },
        '& .MuiOutlinedInput-input': {
          py: '0.55rem',
          px: 0,
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
