import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined'
import IconButton from '@mui/material/IconButton'

type AdminResetFiltersButtonProps = {
  onClick: () => void
}

export function AdminResetFiltersButton({ onClick }: AdminResetFiltersButtonProps) {
  return (
    <IconButton
      aria-label="Reset filters"
      size="small"
      sx={{
        border: '1px solid rgba(186, 230, 253, 0.95)',
        backgroundColor: 'rgba(255,255,255,0.88)',
        color: '#2468a0',
        '&:hover': {
          backgroundColor: 'rgba(36, 104, 160, 0.08)',
          borderColor: 'rgba(125, 211, 252, 0.95)',
        },
      }}
      title="Reset filters"
      onClick={onClick}
    >
      <RestartAltOutlined fontSize="small" />
    </IconButton>
  )
}
