'use client'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { MerakiLogo } from '@/components/common/MerakiLogo'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  FileText,
  FlaskConical,
  GraduationCap,
  MessageSquare,
  Mic,
  Video,
  Zap,
} from 'lucide-react'

const modeCards = [
  {
    icon: MessageSquare,
    label: 'Learn',
    accent: 'text-cyan-200',
    bg: 'bg-cyan-400/[0.15]',
    title: 'Ask anything and get clear explanations',
    copy: 'Learn mode is the open conversation space. Ask questions from the current learning scope and get clear explanations that match the topic you are studying right now.',
    bullets: ['Plain-language tutoring', 'Text or avatar video responses', 'Voice questions and saved chats'],
  },
  {
    icon: FlaskConical,
    label: 'Assessment',
    accent: 'text-emerald-200',
    bg: 'bg-emerald-400/[0.15]',
    title: 'Turn lessons into guided assessments',
    copy: 'Assessment mode turns notes, documents, and course content into active exercises. Meraki asks, checks, and coaches you through the ideas until they start to stick.',
    bullets: ['Guided assessment scenarios', 'Step-by-step scored feedback', 'Course-aware questions'],
  },
  {
    icon: BookOpenCheck,
    label: 'Review',
    accent: 'text-amber-200',
    bg: 'bg-amber-400/[0.15]',
    title: 'Check what you actually know',
    copy: 'Review mode helps you test understanding with focused questions. It is built for revision, quick recall, and finding weak areas before quizzes, labs, or exams.',
    bullets: ['Adaptive review questions', 'Progress tracked per topic', 'Text-first exam preparation'],
  },
]

const featureCards = [
  {
    icon: Video,
    title: 'Avatar video responses',
    copy: 'Choose video delivery when you want a tutor-style explanation with subtitles instead of only reading text.',
  },
  {
    icon: Mic,
    title: 'Voice input',
    copy: 'Ask naturally by speaking, useful when you are working through a topic or studying hands-free.',
  },
  {
    icon: FileText,
    title: 'Material-aware learning',
    copy: 'Meraki can shift focus as the learning scope changes, so the same workspace can support different subjects and courses.',
  },
  {
    icon: Brain,
    title: 'AI reasoning support',
    copy: 'Responses are structured to explain why an answer matters, not just state a short result.',
  },
  {
    icon: GraduationCap,
    title: 'Learning history',
    copy: 'Conversations are kept together so students can return to earlier explanations and assessments.',
  },
  {
    icon: Zap,
    title: 'Fast mode switching',
    copy: 'Move from explanation to review to assessment without leaving the dashboard workflow.',
  },
]

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.merakiai.online/#organization',
      name: 'Meraki AI',
      url: 'https://www.merakiai.online',
      logo: 'https://www.merakiai.online/brand/meraki-logo-color.png',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.merakiai.online/#website',
      url: 'https://www.merakiai.online',
      name: 'Meraki AI',
      description:
        'An adaptive AI learning platform for course-grounded explanations, review, and assessments.',
      publisher: { '@id': 'https://www.merakiai.online/#organization' },
      inLanguage: 'en',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Meraki AI',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      url: 'https://www.merakiai.online',
      description:
        'Adaptive AI tutoring with Learn, Review, and Assessment modes, voice questions, and tutor-style video lessons.',
    },
  ],
}

export default function Home() {
  const router = useRouter()
  const goToDashboard = () => router.push('/dashboard')

  useEffect(() => {
    const hash = window.location.hash
    const recoveryParams = new URLSearchParams(hash.substring(1))

    if (recoveryParams.get('type') === 'recovery') {
      window.location.replace(`/auth/reset-password${hash}`)
    }
  }, [])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
      <main className="min-h-screen overflow-hidden bg-[#edf6fb] text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="relative overflow-hidden bg-[#edf6fb] text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(56,189,248,0.24),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(237,232,176,0.44),transparent_28%),linear-gradient(135deg,#f8fcff_0%,#dff3fb_48%,#f8fbff_100%)] dark:bg-[radial-gradient(circle_at_16%_18%,rgba(56,189,248,0.34),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(237,232,176,0.34),transparent_26%),linear-gradient(135deg,#0b1b3a_0%,#1456b8_48%,#071329_100%)]" />
        <div className="absolute right-[-8rem] top-28 h-[28rem] w-[48rem] rotate-[-12deg] rounded-[50%] border border-blue-200/70 bg-[linear-gradient(95deg,rgba(255,255,255,0.8),rgba(126,200,227,0.2),rgba(42,113,220,0.16))] blur-sm dark:border-white/[0.15] dark:bg-[linear-gradient(95deg,rgba(255,255,255,0.42),rgba(126,200,227,0.12),rgba(18,69,161,0.44))]" />
        <div className="absolute left-0 top-0 h-full w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.84),rgba(237,246,251,0.3)_54%,rgba(255,255,255,0.72))] dark:bg-[linear-gradient(90deg,rgba(2,6,23,0.82),rgba(15,23,42,0.28)_54%,rgba(2,6,23,0.72))]" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between gap-4">
            <button onClick={goToDashboard} className="flex items-center gap-3 rounded-full text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-white/80 shadow-lg shadow-blue-600/[0.12] backdrop-blur dark:border-cyan-200/60 dark:bg-white/[0.12] dark:shadow-cyan-500/[0.2]">
                <MerakiLogo variant="color" className="h-6 w-6 dark:hidden" decorative />
                <MerakiLogo variant="white" className="hidden h-6 w-6 dark:block" decorative />
              </span>
              <span className="text-xl font-semibold">Meraki</span>
            </button>

            <div className="hidden items-center gap-6 rounded-full border border-blue-200/80 bg-white/70 px-5 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-blue-950/[0.06] backdrop-blur dark:border-white/[0.15] dark:bg-white/[0.1] dark:text-white/90 md:flex">
              <button onClick={() => document.getElementById('modes')?.scrollIntoView({ behavior: 'smooth' })}>
                Modes
              </button>
              <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                Features
              </button>
              <button onClick={() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' })}>
                Workflow
              </button>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                onClick={goToDashboard}
                className="gap-2 rounded-full border border-blue-200 bg-blue-600 px-5 text-white shadow-xl shadow-blue-600/[0.22] hover:bg-blue-700 dark:border-cyan-300 dark:bg-white dark:text-slate-950 dark:shadow-cyan-950/[0.3] dark:hover:bg-cyan-50"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </nav>

          <div className="flex flex-1 items-center py-14 lg:py-16">
            <div className="w-full">
              {/* <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-950 shadow-lg shadow-blue-950/[0.08] backdrop-blur dark:border-cyan-200/[0.3] dark:bg-cyan-100/10 dark:text-cyan-50 dark:shadow-cyan-950/[0.2]">
                <MerakiLogo variant="color" className="h-5 w-5 dark:hidden" decorative />
                <MerakiLogo variant="white" className="hidden h-5 w-5 dark:block" decorative />
                AI tutor for Learn, Review, and Assessment
              </div> */}

              <h1 className="mt-7 max-w-4xl text-balance text-5xl font-semibold leading-[1.03] text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
                Meet Meraki AI: your adaptive tutor for focused learning.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700 dark:text-slate-100">
                Meraki brings clear explanations, review questions, guided assessments, voice conversations, and avatar video lessons into one focused study workspace.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button onClick={goToDashboard} size="lg" className="gap-2 rounded-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                  Start learning
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => document.getElementById('modes')?.scrollIntoView({ behavior: 'smooth' })}
                  className="rounded-full border-blue-200 bg-white/70 text-slate-950 hover:bg-white hover:text-slate-950 dark:border-white/[0.3] dark:bg-white/[0.1] dark:text-white dark:hover:bg-white/[0.15] dark:hover:text-white"
                >
                  Explore modes
                </Button>
              </div>

              <div className="mt-9 grid max-w-5xl gap-3 sm:grid-cols-3">
                {modeCards.map((mode) => (
                  <div key={mode.label} className="rounded-2xl border border-blue-200/80 bg-white/72 p-4 shadow-sm shadow-blue-950/[0.04] backdrop-blur dark:border-white/[0.15] dark:bg-white/[0.1]">
                    <mode.icon className="h-5 w-5 text-blue-700 dark:text-cyan-200" />
                    <p className="mt-3 text-base font-semibold">{mode.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-200">{mode.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="modes" className="bg-white px-4 py-20 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-950 dark:border-blue-400/[0.3] dark:bg-blue-400/[0.1] dark:text-blue-100">
              The three learning modes
            </span>
            <h2 className="mt-5 text-balance text-4xl font-semibold leading-tight text-slate-950 dark:text-white">
              More than a chat box: Meraki changes shape around the subject and your study goal.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {modeCards.map((mode) => (
              <article key={mode.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-white/[0.1] dark:bg-white/[0.04]">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${mode.bg}`}>
                  <mode.icon className="h-6 w-6 text-blue-700 dark:text-cyan-200" />
                </div>
                <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-cyan-200">{mode.label} mode</p>
                <h3 className="mt-2 text-2xl font-semibold leading-tight text-slate-950 dark:text-white">{mode.title}</h3>
                <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{mode.copy}</p>
                <div className="mt-6 space-y-3">
                  {mode.bullets.map((bullet) => (
                    <div key={bullet} className="flex gap-3 text-sm text-slate-700 dark:text-slate-200">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {bullet}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-[#f4f9fc] px-4 py-20 dark:bg-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center rounded-full border border-cyan-200 bg-white px-4 py-1.5 text-sm font-semibold text-blue-950 dark:border-cyan-400/[0.3] dark:bg-white/[0.1] dark:text-cyan-100">
              Feature set
            </span>
            <h2 className="mt-5 text-balance text-4xl font-semibold leading-tight text-slate-950 dark:text-white">
              Built around the real study flow: explain it, practise it, review it, and remember it.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-950/[0.1] dark:border-white/[0.1] dark:bg-white/[0.05]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/[0.25]">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-slate-950 dark:text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{feature.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-white px-4 py-20 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-950 dark:border-white/[0.2] dark:bg-white/[0.1] dark:text-white">
              <FileText className="h-4 w-4 text-blue-700 dark:text-cyan-200" />
              From lesson to mastery
            </span>
            <h2 className="mt-5 text-balance text-4xl font-semibold leading-tight">
              Start with the lesson, end with stronger understanding.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              Meraki is designed to help learners understand new topics, practise actively, and prepare for assessments in one connected workspace.
            </p>
            <Button onClick={goToDashboard} className="mt-7 gap-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-50">
              Open dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm shadow-blue-950/[0.06] dark:border-white/[0.1] dark:bg-white/[0.06] dark:shadow-none">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: MessageSquare, label: 'Learn', value: 'Explain concepts and answer follow-ups' },
                { icon: FlaskConical, label: 'Assessment', value: 'Work through guided exercises' },
                { icon: BookOpenCheck, label: 'Review', value: 'Test recall and exam readiness' },
                { icon: Video, label: 'Video', value: 'Use avatar answers when visual delivery helps' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-blue-950/[0.04] dark:border-white/[0.1] dark:bg-slate-950/40 dark:shadow-none">
                  <item.icon className="h-6 w-6 text-blue-700 dark:text-cyan-200" />
                  <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold leading-snug">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      </main>
    </>
  )
}
