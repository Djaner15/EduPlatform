import WarningAmber from '@mui/icons-material/WarningAmber'
import Fade from '@mui/material/Fade'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'

type DeleteConfirmationModalProps = {
  open: boolean
  title?: string
  description?: string
  isDeleting?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteConfirmationModal({
  open,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  isDeleting = false,
  onCancel,
  onConfirm,
}: DeleteConfirmationModalProps) {
  return (
    <Dialog
      open={open}
      onClose={isDeleting ? undefined : onCancel}
      disableScrollLock={false}
      slots={{ transition: Fade }}
      sx={{ zIndex: 1700 }}
      slotProps={{
        backdrop: {
          className: 'glass-dialog-backdrop',
          sx: {
            width: '100vw',
            height: '100vh',
            transition: 'backdrop-filter 220ms ease, background-color 220ms ease',
          },
        },
        paper: {
          className: 'glass-dialog-paper',
          sx: {
            width: '100%',
            maxWidth: 460,
            borderRadius: '1.75rem',
            overflow: 'hidden',
            color: '#0f172a',
          },
        },
      }}
    >
      <DialogTitle sx={{ px: 3, pt: 3, pb: 1.5 }}>
        <div className="flex items-center gap-3">
          <span className="delete-modal-icon">
            <WarningAmber sx={{ fontSize: 24 }} />
          </span>
          <div>
            <p className="glass-dialog-title-heading delete-modal-title text-xl">{title}</p>
            <div className="delete-modal-title-line" />
          </div>
        </div>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 2, pt: 0 }}>
        <p className="delete-modal-description text-sm leading-6">{description}</p>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 0, gap: 1.5 }}>
        <button
          className="modal-outline-button px-4 py-2.5 text-sm"
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
        >
          Cancel
        </button>
        <button
          className="delete-modal-confirm-button disabled:cursor-not-allowed disabled:opacity-70"
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </DialogActions>
    </Dialog>
  )
}
