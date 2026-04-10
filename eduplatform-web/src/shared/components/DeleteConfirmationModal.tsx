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
          sx: {
            width: '100vw',
            height: '100vh',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            transition: 'backdrop-filter 220ms ease, background-color 220ms ease',
          },
        },
        paper: {
          sx: {
            width: '100%',
            maxWidth: 460,
            borderRadius: '1.75rem',
            border: '1px solid rgba(191, 219, 254, 0.9)',
            background:
              'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(239,246,255,0.94), rgba(236,254,255,0.9))',
            boxShadow: '0 28px 64px rgba(15, 23, 42, 0.16)',
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle sx={{ px: 3, pt: 3, pb: 1.5 }}>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-[0_10px_24px_rgba(245,158,11,0.18)]">
            <WarningAmber sx={{ fontSize: 24 }} />
          </span>
          <p className="text-xl font-semibold text-slate-900">{title}</p>
        </div>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 2, pt: 0 }}>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 0, gap: 1.5 }}>
        <button
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
        >
          Cancel
        </button>
        <button
          className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(225,29,72,0.18)] transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
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
