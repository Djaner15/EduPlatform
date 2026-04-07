import { ArrowLeft, Mail, Send } from 'lucide-react'
import axios from 'axios'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/axiosInstance'

type ContactFormState = {
  name: string
  email: string
  message: string
}

const initialFormState: ContactFormState = {
  name: '',
  email: '',
  message: '',
}

export function ContactPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<ContactFormState>(initialFormState)
  const [errors, setErrors] = useState<Partial<ContactFormState>>({})
  const [successMessage, setSuccessMessage] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = form.name.trim()
    const trimmedEmail = form.email.trim()
    const trimmedMessage = form.message.trim()
    const nextErrors: Partial<ContactFormState> = {}

    if (!trimmedName) {
      nextErrors.name = 'Please enter your name.'
    }

    if (!trimmedEmail) {
      nextErrors.email = 'Please enter your email address.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address.'
    }

    if (!trimmedMessage) {
      nextErrors.message = 'Please enter your message.'
    } else if (trimmedMessage.length < 10) {
      nextErrors.message = 'Your message should be at least 10 characters long.'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setSuccessMessage('')
      setSubmitError('')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try
    {
      const { data } = await apiClient.post<{ message?: string }>('/contact', {
        name: trimmedName,
        email: trimmedEmail,
        message: trimmedMessage,
      })

      setSuccessMessage(
        data.message ?? 'Your message has been sent successfully. We will review it shortly.',
      )
      setForm(initialFormState)
    }
    catch (error)
    {
      if (axios.isAxiosError(error))
      {
        const payload = error.response?.data

        if (payload && typeof payload === 'object' && 'title' in payload && typeof payload.title === 'string')
        {
          setSubmitError(payload.title)
        }
        else if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string')
        {
          setSubmitError(payload.error)
        }
        else
        {
          setSubmitError('Failed to send your message. Please try again.')
        }
      }
      else
      {
        setSubmitError('Failed to send your message. Please try again.')
      }
    }
    finally
    {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-[32px] border border-blue-100/90 bg-white/85 p-8 shadow-[0_28px_70px_rgba(37,99,235,0.12)] backdrop-blur-md sm:p-10">
        <div className="mb-10 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
            EduPlatform
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-900 sm:text-4xl">
            Contact
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            Reach out if you need help with approvals, account access, or anything related to the
            platform. We are here to support students, teachers, and administrators.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[28px] border border-blue-100/80 bg-gradient-to-br from-white to-blue-50/70 p-6 shadow-[0_18px_40px_rgba(36,104,160,0.1)] sm:p-7">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-slate-900">Send us a message</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Fill out the form below and we will get back to you as soon as possible.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="contact-name">
                  Name
                </label>
                <input
                  className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                  id="contact-name"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, name: event.target.value }))
                    setErrors((current) => ({ ...current, name: undefined }))
                  }}
                />
                {errors.name ? <p className="text-sm text-rose-600">{errors.name}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="contact-email">
                  Email
                </label>
                <input
                  className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                  id="contact-email"
                  placeholder="you@example.com"
                  type="email"
                  value={form.email}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, email: event.target.value }))
                    setErrors((current) => ({ ...current, email: undefined }))
                  }}
                />
                {errors.email ? <p className="text-sm text-rose-600">{errors.email}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="contact-message">
                  Message
                </label>
                <textarea
                  className="min-h-40 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                  id="contact-message"
                  placeholder="Tell us how we can help you."
                  value={form.message}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, message: event.target.value }))
                    setErrors((current) => ({ ...current, message: undefined }))
                  }}
                />
                {errors.message ? <p className="text-sm text-rose-600">{errors.message}</p> : null}
              </div>

              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button className="button-primary inline-flex items-center gap-2" disabled={isSubmitting} type="submit">
                  <Send className="h-4 w-4" />
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
                <p className="text-sm text-slate-500">We usually respond within 24 hours.</p>
              </div>

              {submitError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {submitError}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {successMessage}
                </div>
              ) : null}
            </form>
          </section>

          <aside className="rounded-[28px] border border-blue-100/80 bg-gradient-to-br from-[#123d5b] via-[#2468a0] to-[#0f8b8d] p-6 text-white shadow-[0_22px_48px_rgba(36,104,160,0.22)] sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
              Contact information
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold">Support email</h2>
            <p className="mt-3 text-sm leading-7 text-white/80">
              For account approvals, login problems, or general help with the platform, contact the
              EduPlatform support inbox directly.
            </p>

            <a
              className="mt-6 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-base font-semibold text-white transition hover:bg-white/16"
              href="mailto:eduplatform.support@gmail.com"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/16">
                <Mail className="h-5 w-5" />
              </span>
              <span>eduplatform.support@gmail.com</span>
            </a>

            <div className="mt-6 rounded-2xl border border-white/12 bg-white/8 p-4">
              <p className="text-sm leading-7 text-white/80">
                You can use the form for a quick message or open your email client directly using
                the address above.
              </p>
            </div>
          </aside>
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
    </main>
  )
}
