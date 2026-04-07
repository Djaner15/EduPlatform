type InfoCardProps = {
  title: string
  description: string
  footer?: string
  action?: React.ReactNode
}

export function InfoCard({ title, description, footer, action }: InfoCardProps) {
  return (
    <article className="glass-panel flex h-full flex-col gap-5 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-4">
        {footer ? <span className="text-xs uppercase tracking-[0.25em] text-slate-500">{footer}</span> : <span />}
        {action}
      </div>
    </article>
  )
}
