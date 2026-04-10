import { Link } from 'react-router-dom'
import { useTranslation } from '../../app/AppSettingsContext'

export function SiteFooter() {
  const year = new Date().getFullYear()
  const { t } = useTranslation()

  return (
    <footer className="site-footer-card mt-10 w-full rounded-[28px] border border-blue-100/90 bg-gradient-to-r from-white/96 via-blue-50/94 to-cyan-50/88 shadow-[0_18px_40px_rgba(36,104,160,0.12)]">
      <div className="flex w-full flex-col items-center justify-center gap-2 px-4 py-5 text-center sm:px-6">
        <div className="flex flex-col items-center gap-2">
          <p className="font-display text-lg font-semibold text-slate-900">{t('appName')}</p>
          <Link className="site-footer-presentation-link text-[0.85rem] font-medium" to="/about">
            {t('siteDescription')}
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-[0.85rem] font-medium">
          <Link className="site-footer-link" to="/privacy">
            {t('privacyPolicy')}
          </Link>
          <Link className="site-footer-link" to="/contact">
            {t('contact')}
          </Link>
        </div>

        <p className="pt-1 text-[0.75rem] text-blue-400">{t('copyright', { year })}</p>
      </div>
    </footer>
  )
}
