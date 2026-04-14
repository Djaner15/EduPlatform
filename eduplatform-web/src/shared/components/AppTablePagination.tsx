import TablePagination from '@mui/material/TablePagination'
import { useAppSettings } from '../../app/AppSettingsContext'

type AppTablePaginationProps = {
  count: number
  page: number
  rowsPerPage: number
  onPageChange: (page: number) => void
  onRowsPerPageChange: (rowsPerPage: number) => void
}

export function AppTablePagination({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: AppTablePaginationProps) {
  const { theme } = useAppSettings()
  const isDark = theme === 'dark'

  return (
    <TablePagination
      component="div"
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      rowsPerPageOptions={[10, 25, 50]}
      onPageChange={(_event, nextPage) => onPageChange(nextPage)}
      onRowsPerPageChange={(event) => onRowsPerPageChange(Number(event.target.value))}
      sx={{
        borderTop: '1px solid rgba(148, 163, 184, 0.2)',
        color: isDark ? 'rgba(226,232,240,0.92)' : '#334155',
        '.MuiToolbar-root': {
          minHeight: 56,
          fontFamily: 'inherit',
          paddingInline: 2,
        },
        '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
          fontSize: '0.875rem',
          fontWeight: 600,
          color: isDark ? 'rgba(226,232,240,0.88)' : '#475569',
        },
        '.MuiInputBase-root': {
          color: isDark ? 'rgba(248,250,252,0.96)' : '#0f172a',
          fontWeight: 600,
        },
        '.MuiSelect-icon, .MuiTablePagination-actions button': {
          color: isDark ? 'rgba(125,211,252,0.95)' : '#2468a0',
        },
        '.MuiTablePagination-actions button.Mui-disabled': {
          opacity: 0.35,
        },
      }}
    />
  )
}
