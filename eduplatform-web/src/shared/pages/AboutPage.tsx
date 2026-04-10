import { Award, BookOpen, GraduationCap, MapPin, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../app/AuthContext'

const highlights = [
  {
    icon: GraduationCap,
    title: 'Educational focus',
    description:
      'The school provides advanced education in mathematics, computer science, information technology, and STEM, helping students build strong analytical and practical skills.',
  },
  {
    icon: BookOpen,
    title: 'Why choose this school',
    description:
      'Students benefit from high academic standards, modern and creative teaching methods, strong participation in national and international competitions, and excellent preparation for future careers.',
  },
  {
    icon: Users,
    title: 'Student development',
    description:
      'Students are encouraged to be proactive, creative, and adaptable. Graduates continue in areas such as IT, science, medicine, law, and economics, and many go on to work in international companies.',
  },
]

const statistics = [
  { label: 'Graduated Students', value: '9710', icon: GraduationCap },
  { label: 'Students Enrolled', value: '1199', icon: Users },
  { label: 'Graduating Classes', value: '52', icon: BookOpen },
  { label: 'Awards Won', value: '1871', icon: Award },
]

const galleryItems = [
  {
    image: '/about-hero.jpeg',
    title: 'Technology in learning',
    subtitle: 'Students build digital skills through modern teaching and practical classroom work.',
  },
  {
    image: '/about-gallery-classroom.jpeg',
    title: 'Classroom engagement',
    subtitle: 'Interactive teaching creates a focused and motivating academic environment.',
  },
  {
    image: '/about-hero.jpeg',
    title: 'School atmosphere',
    subtitle: 'The learning environment supports concentration, collaboration, and long-term growth.',
  },
]

export function AboutPage() {
  const { isAuthenticated, user } = useAuth()
  const isLoggedIn = isAuthenticated()
  const dashboardRoute =
    user?.role === 'Admin' ? '/admin' : user?.role === 'Teacher' ? '/teacher' : '/student'

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="relative overflow-hidden rounded-[36px] border border-blue-100/80 shadow-[0_30px_80px_rgba(36,104,160,0.18)]">
          <img
            alt='Mathematics High School "Academic Kiril Popov" presentation'
            className="h-[420px] w-full object-cover sm:h-[460px]"
            src="/about-hero.jpeg"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#102133]/85 via-[#123d5b]/65 to-[#0f8b8d]/45" />
          <div className="absolute inset-x-0 bottom-0 p-8 sm:p-10 lg:p-12">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/80 backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                EduPlatform school presentation
              </p>
              <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                Mathematics High School &quot;Academic Kiril Popov&quot;
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/82 sm:text-lg">
                A tradition of excellence and growth
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-blue-100/90 bg-white/88 p-7 shadow-[0_24px_56px_rgba(37,99,235,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
              About the school
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-slate-900">
              A place for ambition, structure, and growth
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              The Mathematics High School &quot;Academician Kiril Popov&quot; in Plovdiv is one of
              the leading specialized high schools in Bulgaria, focused on mathematics, computer
              science, and STEM education. Founded in 1971, the school has built a strong tradition
              of academic excellence and innovation.
            </p>
          </div>

          <div className="grid gap-4">
            {highlights.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-[28px] border border-blue-100/90 bg-gradient-to-r from-white to-blue-50/70 p-6 shadow-[0_16px_34px_rgba(36,104,160,0.08)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#123d5b] to-[#0f8b8d] text-white shadow-[0_12px_26px_rgba(15,139,141,0.22)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-slate-900">{title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-blue-100/90 bg-white/88 p-7 shadow-[0_24px_56px_rgba(37,99,235,0.12)]">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
              Gallery
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-slate-900">
              Life inside the learning environment
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {galleryItems.map((item) => (
              <article
                key={`${item.title}-${item.subtitle}`}
                className="group overflow-hidden rounded-[28px] border border-blue-100/80 bg-white shadow-[0_18px_42px_rgba(36,104,160,0.1)]"
              >
                <div className="overflow-hidden">
                  <img
                    alt={item.title}
                    className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
                    src={item.image}
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-xl font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.subtitle}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-blue-100/90 bg-gradient-to-r from-white/94 via-blue-50/86 to-cyan-50/82 p-7 shadow-[0_24px_56px_rgba(37,99,235,0.12)]">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
              School in numbers
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-slate-900">
              Academic community highlights
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statistics.map(({ label, value, icon: Icon }) => (
              <article
                key={label}
                className="rounded-[28px] border border-white/80 bg-white/88 p-6 shadow-[0_16px_34px_rgba(36,104,160,0.08)]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {label}
                  </p>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#2468a0]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-5 font-display text-5xl font-bold text-slate-900">{value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{label}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-[32px] border border-blue-100/90 bg-white/88 p-7 shadow-[0_24px_56px_rgba(37,99,235,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
              Location
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-slate-900">
              Visit the school
            </h2>
            <div className="mt-6 flex items-start gap-4 rounded-[28px] border border-blue-100/80 bg-gradient-to-r from-white to-blue-50/65 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#123d5b] to-[#0f8b8d] text-white">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">School address</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  11 Chemshir St.
                  <br />
                  Plovdiv 4001, Bulgaria
                </p>
              </div>
            </div>
          </article>

          <article className="overflow-hidden rounded-[32px] border border-blue-100/90 bg-white/88 shadow-[0_24px_56px_rgba(37,99,235,0.12)]">
            <div className="aspect-[16/10] w-full">
              <iframe
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps?q=11%20Chemshir%20St.,%20Plovdiv%204001,%20Bulgaria&output=embed"
                title='Map of Mathematics High School "Academic Kiril Popov"'
              />
            </div>
          </article>
        </section>

        <div className="pb-2">
          <Link
            className="inline-flex items-center text-sm font-semibold text-blue-700 transition hover:text-blue-900"
            to={isLoggedIn ? dashboardRoute : '/login'}
          >
            {isLoggedIn ? '← Back to Dashboard' : '← Back to Login'}
          </Link>
        </div>
      </div>
    </main>
  )
}
