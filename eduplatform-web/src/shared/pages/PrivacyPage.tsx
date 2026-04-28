import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../app/AppSettingsContext'
import { BrandLogo } from '../components/BrandLogo'

export function PrivacyPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const sections = [
    {
      title: t('privacyPage.sections.collect.title'),
      body: t('privacyPage.sections.collect.body'),
    },
    {
      title: t('privacyPage.sections.use.title'),
      body: t('privacyPage.sections.use.body'),
    },
    {
      title: t('privacyPage.sections.storage.title'),
      body: t('privacyPage.sections.storage.body'),
    },
    {
      title: t('privacyPage.sections.rights.title'),
      body: t('privacyPage.sections.rights.body'),
    },
    {
      title: t('privacyPage.sections.contact.title'),
      body: t('privacyPage.sections.contact.body'),
    },
  ]

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-blue-100/90 bg-white/85 p-8 shadow-[0_28px_70px_rgba(37,99,235,0.12)] backdrop-blur-md sm:p-10">
        <div className="mb-10">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="shrink-0 self-start translate-y-1 [&_.brand-logo-mark]:h-[6.75rem] [&_.brand-logo-mark]:w-[6.75rem] [&_.brand-logo-mark]:rounded-[28px] sm:[&_.brand-logo-mark]:h-[7.5rem] sm:[&_.brand-logo-mark]:w-[7.5rem] sm:[&_.brand-logo-mark]:rounded-[32px]">
              <BrandLogo
                showCopy={false}
                size="header"
                title="EduPlatform"
                variant="photo"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
                {t('appName')}
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold text-slate-900 sm:text-4xl">
                {t('privacyPage.title')}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                {t('privacyPage.description')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-3xl border border-blue-100/80 bg-gradient-to-r from-white to-blue-50/65 p-6"
            >
              <h2 className="font-display text-2xl font-bold text-slate-900">{section.title}</h2>
              <p className="mt-3 text-base leading-8 text-slate-600">{section.body}</p>
            </section>
          ))}

          <div className="border-t border-blue-100 pt-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-400">
              {t('privacyPage.supportLabel')}
            </p>
            <a
              className="mt-3 inline-block text-base font-semibold text-blue-800 transition hover:text-blue-950"
              href="mailto:eduplatform.support@gmail.com"
            >
              eduplatform.support@gmail.com
            </a>
          </div>

          <div className="mt-10">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-slate-900"
              onClick={() => navigate(-1)}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
