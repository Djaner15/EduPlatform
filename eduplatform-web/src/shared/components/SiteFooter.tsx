import { Link } from 'react-router-dom'
import { useTranslation } from '../../app/AppSettingsContext'

export function SiteFooter() {
  const year = new Date().getFullYear()
  const { t } = useTranslation()

  return (
    <footer className="site-footer-card mt-10 w-full rounded-[28px] border border-blue-100/90 bg-gradient-to-r from-white/96 via-blue-50/94 to-cyan-50/88 shadow-[0_18px_40px_rgba(36,104,160,0.12)]">
      <div className="grid w-full gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr_0.7fr] lg:items-start lg:text-left">
        <div className="text-center lg:text-left">
          <p className="font-display text-lg font-semibold text-slate-900">{t('appName')}</p>
          <Link className="site-footer-presentation-link mt-2 inline-block text-[0.85rem] font-medium" to="/about">
            {t('siteDescription')}
          </Link>
        </div>

        <div className="text-center lg:text-left">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.2em] text-blue-400">
            {t('footerOffice')}
          </p>
          <p className="mt-2 text-[0.85rem] leading-6 text-slate-600">
            {t('footerAddressLine1')}
            <br />
            {t('footerAddressLine2')}
          </p>
        </div>

        <div className="text-center lg:text-left">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.2em] text-blue-400">
            {t('footerContact')}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[0.85rem] font-medium lg:justify-start">
            <Link className="site-footer-link" to="/privacy">
              {t('privacyPolicy')}
            </Link>
            <Link className="site-footer-link" to="/contact">
              {t('contact')}
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-blue-100/80 px-4 py-3 text-center sm:px-6">
        <p className="text-[0.75rem] text-blue-400">{t('copyright', { year })}</p>
      </div>
    </footer>
  )
}
