import { Link } from 'react-router-dom'
import { useTranslation } from '../../app/AppSettingsContext'

export function SiteFooter() {
  const year = new Date().getFullYear()
  const { t } = useTranslation()

  return (
    <footer className="site-footer-card mt-10 w-full rounded-[28px] border border-blue-100/90 bg-gradient-to-r from-white/96 via-blue-50/94 to-cyan-50/88 shadow-[0_18px_40px_rgba(36,104,160,0.12)]">
      <div className="flex w-full flex-col items-center justify-center gap-3 px-4 py-6 text-center sm:px-6">
        <div className="space-y-1">
          <p className="font-display text-lg font-semibold text-slate-900">{t('appName')}</p>
          <p className="text-sm text-slate-500">{t('siteDescription')}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-[#2468a0]">
          <Link className="underline underline-offset-4 transition hover:text-[#0f8b8d]" to="/privacy">
            {t('privacyPolicy')}
          </Link>
          <Link className="underline underline-offset-4 transition hover:text-[#0f8b8d]" to="/contact">
            {t('contact')}
          </Link>
        </div>

        <p className="text-xs text-blue-400">{t('copyright', { year })}</p>
      </div>
    </footer>
  )
}
