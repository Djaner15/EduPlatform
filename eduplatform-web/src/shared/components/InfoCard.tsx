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
      <div className={`grid gap-4 ${visual ? 'grid-cols-[auto_1fr] items-start' : ''}`}>
        {visual ? (
          <div className="flex h-full min-h-[5.5rem] items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-sky-100 via-cyan-50 to-white px-4 py-3 text-5xl shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:text-6xl">
            <span aria-hidden="true" className="leading-none">
              {visual}
            </span>
          </div>
        ) : null}
        <div className="space-y-2">
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
