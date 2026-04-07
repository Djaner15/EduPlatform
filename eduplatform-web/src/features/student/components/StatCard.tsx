type StatCardProps = {
  label: string
  value: string | number
  helper: string
}

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <article className="glass-panel p-6">
      <p className="text-sm text-slate-500">{label}</p>
      <h2 className="mt-3 font-display text-4xl font-bold text-slate-900">{value}</h2>
      <p className="mt-3 text-sm text-slate-500">{helper}</p>
    </article>
  )
}
