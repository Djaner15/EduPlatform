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
      <div className={`grid gap-5 ${visual ? 'grid-cols-[5.5rem_1fr] items-start' : ''}`}>
        {visual ? (
          <div className="flex min-h-[6.75rem] w-[5.5rem] items-center justify-center self-stretch rounded-[1.9rem] bg-gradient-to-br from-sky-100 via-cyan-50 to-white px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_24px_rgba(36,104,160,0.08)]">
            <span aria-hidden="true" className="text-[3rem] leading-none sm:text-[3.25rem]">
              {visual}
            </span>
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
