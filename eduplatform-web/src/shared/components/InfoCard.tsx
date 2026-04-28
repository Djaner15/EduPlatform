type InfoCardProps = {
  title: string
  description: string
  footer?: string
  action?: React.ReactNode
  visual?: React.ReactNode
}

export function InfoCard({ title, description, footer, action, visual }: InfoCardProps) {
  return (
    <article className="glass-panel flex h-full flex-col gap-5 p-6">
      <div className={`grid gap-5 ${visual ? 'grid-cols-[4.5rem_1fr] items-start' : ''}`}>
        {visual ? (
          <div className="flex items-start justify-center pt-1">
            {visual}
          </div>
        ) : null}
        <div className="space-y-2.5">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-4">
        {footer ? <span className="text-xs uppercase tracking-[0.25em] text-slate-500">{footer}</span> : <span />}
        {action}
      </div>
    </article>
  )
}
