import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import type { SelectChangeEvent } from '@mui/material/Select'

export type AdminSelectOption = {
  value: string
  label: string
}

type AdminSelectFieldProps = {
  label: string
  value: string
  options: AdminSelectOption[]
  onChange: (value: string) => void
  fullWidth?: boolean
  minWidth?: number
  width?: number | string
}

const menuPaperSx = {
  mt: 1,
  zIndex: 3000,
  borderRadius: '1.25rem',
  border: '1px solid rgba(191, 219, 254, 0.9)',
  background: 'rgba(255,255,255,0.98)',
  boxShadow: '0 18px 40px rgba(36, 104, 160, 0.16)',
  overflow: 'hidden',
}

export function AdminSelectField({
  label,
  value,
  options,
  onChange,
  fullWidth = true,
  minWidth,
  width,
}: AdminSelectFieldProps) {
  return (
    <FormControl
      fullWidth={fullWidth}
      size="small"
      sx={{
        minWidth,
        width,
        '& .MuiInputLabel-root': {
          fontFamily: 'var(--font-sans)',
          fontSize: '0.88rem',
          color: '#475569',
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: '#2468a0',
        },
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
        '& .MuiSelect-select': {
          py: '0.55rem',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.92rem',
        },
        '& .MuiSvgIcon-root': {
          color: '#2468a0',
        },
      }}
    >
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={value}
        onChange={(event: SelectChangeEvent) => onChange(event.target.value)}
        MenuProps={{
          disablePortal: false,
          style: { zIndex: 3000 },
          PaperProps: { sx: menuPaperSx },
          MenuListProps: {
            sx: {
              py: 1,
              '& .MuiMenuItem-root': {
                mx: 1,
                my: 0.25,
                borderRadius: '0.9rem',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.95rem',
                color: '#0f172a',
              },
              '& .MuiMenuItem-root:hover': {
                backgroundColor: 'rgba(236, 254, 255, 0.95)',
              },
              '& .MuiMenuItem-root.Mui-selected': {
                background: 'linear-gradient(90deg, rgba(36,104,160,0.16), rgba(15,139,141,0.18))',
                color: '#0f3f61',
                fontWeight: 700,
              },
              '& .MuiMenuItem-root.Mui-selected:hover': {
                background: 'linear-gradient(90deg, rgba(36,104,160,0.18), rgba(15,139,141,0.22))',
              },
            },
          },
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
