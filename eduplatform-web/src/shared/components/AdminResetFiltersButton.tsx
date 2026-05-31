import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined'
import IconButton from '@mui/material/IconButton'
import { useTranslation } from '../../app/AppSettingsContext'

type AdminResetFiltersButtonProps = {
  onClick: () => void
}

export function AdminResetFiltersButton({ onClick }: AdminResetFiltersButtonProps) {
  const { t } = useTranslation()

  return (
    <IconButton
      aria-label={t('adminPages.common.resetFilters')}
      size="small"
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: '50%',
        border: '1px solid rgba(186, 230, 253, 0.95)',
        backgroundColor: 'rgba(255,255,255,0.88)',
        color: '#2468a0',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&:hover': {
          backgroundColor: 'rgba(36, 104, 160, 0.08)',
          borderColor: 'rgba(125, 211, 252, 0.95)',
        },
      }}
      title={t('adminPages.common.resetFilters')}
      onClick={onClick}
    >
      <RestartAltOutlined fontSize="small" />
    </IconButton>
  )
}
