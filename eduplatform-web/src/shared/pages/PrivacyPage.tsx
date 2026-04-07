import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function PrivacyPage() {
  const navigate = useNavigate()
  const sections = [
    {
      title: 'Information We Collect',
      body:
        'We collect basic account information such as your username, email address, and user role to create and manage your access to EduPlatform. We may also store learning-related data such as progress, submitted tests, and lesson activity within the platform.',
    },
    {
      title: 'How We Use Information',
      body:
        'Your information is used to authenticate your account, provide access to educational content, manage approvals, and send important platform notifications. We use this data only to support the educational experience and platform administration.',
    },
    {
      title: 'Data Storage',
      body:
        'Account and learning data are stored securely in the platform database and are used only for operational, academic, and support purposes. We take reasonable steps to limit access to authorized administrators and system processes.',
    },
    {
      title: 'User Rights',
      body:
        'Users have the right to ask questions about their stored data, request correction of inaccurate account information, and contact the platform administrators if they believe their data is being handled improperly. Access-related changes are also communicated through the platform and email notifications.',
    },
    {
      title: 'Contact Information',
      body:
        'If you have questions about privacy, account access, or data handling on EduPlatform, you can contact the support team for clarification and assistance.',
    },
  ]

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-blue-100/90 bg-white/85 p-8 shadow-[0_28px_70px_rgba(37,99,235,0.12)] backdrop-blur-md sm:p-10">
        <div className="mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
              EduPlatform
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold text-slate-900 sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              This page explains what information EduPlatform collects, how it is used, and how we
              protect user data across the platform.
            </p>
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
              Support Contact
            </p>
            <a
              className="mt-3 inline-block text-base font-semibold text-blue-800 transition hover:text-blue-950"
              href="mailto:support@eduplatform.com"
            >
              support@eduplatform.com
            </a>
          </div>

          <div className="mt-10">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-slate-900"
              onClick={() => navigate(-1)}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
