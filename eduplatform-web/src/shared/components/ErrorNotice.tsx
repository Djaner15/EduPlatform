type ErrorNoticeProps = {
  message: string
  title?: string
  className?: string
  compact?: boolean
}

export function ErrorNotice({
  message,
  title = 'Something went wrong',
  className = '',
  compact = false,
}: ErrorNoticeProps) {
  return (
    <div className={`${compact ? 'app-error-inline' : 'app-error-panel'} ${className}`.trim()}>
      <h3 className="app-error-title">{title}</h3>
      <p className="app-error-text">{message}</p>
    </div>
  )
}
