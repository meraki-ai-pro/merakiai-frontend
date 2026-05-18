'use client'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  CirclePlay,
  FlaskConical,
  GraduationCap,
  MessageSquare,
  Mic,
  Sparkles,
  Video,
  WandSparkles,
  Waves,
  Zap,
} from 'lucide-react'

const modeCards = [
  {
    icon: MessageSquare,
    label: 'Learn',
    accent: 'text-cyan-200',
    bg: 'bg-cyan-400/[0.15]',
    title: 'Ask anything and get clear explanations',
    copy: 'Learn mode is the open conversation space. Students can ask about froth stability, reagent action, pulp chemistry, recovery, grade, entrainment, or any concept that needs a simpler explanation.',
    bullets: ['Plain-language tutoring', 'Text or avatar video responses', 'Voice questions and saved chats'],
  },
  {
    icon: FlaskConical,
    label: 'Practice',
    accent: 'text-emerald-200',
    bg: 'bg-emerald-400/[0.15]',
    title: 'Work through realistic plant scenarios',
    copy: 'Practice mode turns theory into decisions. The tutor gives guided cases, asks what you would change, then scores your reasoning with feedback so you can improve step by step.',
    bullets: ['Guided troubleshooting cases', 'Step-by-step scored feedback', 'Reagent, recovery, froth, and grade problems'],
  },
  {
    icon: BookOpenCheck,
    label: 'Review',
    accent: 'text-amber-200',
    bg: 'bg-amber-400/[0.15]',
    title: 'Check readiness before assessments',
    copy: 'Review mode helps you test understanding with focused questions. It is built for revision, quick recall, and finding weak areas before quizzes, labs, or exams.',
    bullets: ['Adaptive review questions', 'Progress-focused assessment', 'Text-first exam preparation'],
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
    copy: 'Ask naturally by speaking, useful when you are thinking through a plant problem or studying hands-free.',
  },
  {
    icon: Waves,
    title: 'Froth flotation focus',
    copy: 'The learning flow is tuned around mineral processing concepts, not a generic chatbot experience.',
  },
  {
    icon: Brain,
    title: 'AI reasoning support',
    copy: 'Responses are structured to explain why an answer matters, not just state a short result.',
  },
  {
    icon: GraduationCap,
    title: 'Learning history',
    copy: 'Conversations are kept together so students can return to earlier explanations and practice sessions.',
  },
  {
    icon: Zap,
    title: 'Fast mode switching',
    copy: 'Move from explanation to practice to review without leaving the dashboard workflow.',
  },
]

const workflowItems = [
  'Ask a concept question in Learn mode',
  'Switch to Practice for a plant scenario',
  'Get scored feedback on your decision',
  'Use Review mode to test retention',
]

export default function Home() {
  const router = useRouter()
  const goToDashboard = () => router.push('/dashboard')

  return (
    <main className="min-h-screen overflow-hidden bg-[#edf6fb] text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(56,189,248,0.34),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(237,232,176,0.34),transparent_26%),linear-gradient(135deg,#0b1b3a_0%,#1456b8_48%,#071329_100%)]" />
        <div className="absolute right-[-8rem] top-28 h-[28rem] w-[48rem] rotate-[-12deg] rounded-[50%] border border-white/[0.15] bg-[linear-gradient(95deg,rgba(255,255,255,0.42),rgba(126,200,227,0.12),rgba(18,69,161,0.44))] blur-sm" />
        <div className="absolute left-0 top-0 h-full w-full bg-[linear-gradient(90deg,rgba(2,6,23,0.82),rgba(15,23,42,0.28)_54%,rgba(2,6,23,0.72))]" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between gap-4">
            <button onClick={goToDashboard} className="flex items-center gap-3 rounded-full text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/60 bg-white/[0.12] shadow-lg shadow-cyan-500/[0.2] backdrop-blur">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="text-xl font-semibold">Meraki</span>
            </button>

            <div className="hidden items-center gap-6 rounded-full border border-white/[0.15] bg-white/[0.1] px-5 py-2 text-sm font-medium text-white/90 backdrop-blur md:flex">
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
                className="gap-2 rounded-full border border-cyan-300 bg-white px-5 text-slate-950 shadow-xl shadow-cyan-950/[0.3] hover:bg-cyan-50"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </nav>

          <div className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:py-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/[0.3] bg-cyan-100/10 px-4 py-2 text-sm font-semibold text-cyan-50 shadow-lg shadow-cyan-950/[0.2] backdrop-blur">
                <WandSparkles className="h-4 w-4 text-cyan-200" />
                AI tutor for Learn, Practice, and Review
              </div>

              <h1 className="mt-7 max-w-4xl text-balance text-5xl font-semibold leading-[1.03] text-white sm:text-6xl lg:text-7xl">
                Master froth flotation with a tutor that explains, drills, and tests.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-100">
                Meraki helps students move from confusion to confidence: ask questions in Learn mode, solve plant-style scenarios in Practice, then prove readiness in Review.
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
                  className="rounded-full border-white/[0.3] bg-white/[0.1] text-white hover:bg-white/[0.15] hover:text-white"
                >
                  Explore modes
                </Button>
              </div>

              <div className="mt-9 grid gap-3 sm:grid-cols-3">
                {modeCards.map((mode) => (
                  <div key={mode.label} className="rounded-2xl border border-white/[0.15] bg-white/[0.1] p-4 backdrop-blur">
                    <mode.icon className={`h-5 w-5 ${mode.accent}`} />
                    <p className="mt-3 text-base font-semibold">{mode.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-200">{mode.title}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/[0.2] bg-white/[0.12] p-4 shadow-2xl shadow-blue-950/[0.4] backdrop-blur-xl">
              <div className="rounded-[22px] border border-white/[0.15] bg-slate-950/70 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-cyan-100">Ask Meraki</p>
                    <p className="mt-1 text-xs text-slate-400">Learn mode preview</p>
                  </div>
                  <span className="rounded-full border border-emerald-300/[0.3] bg-emerald-300/[0.1] px-3 py-1 text-xs font-semibold text-emerald-100">
                    Video ready
                  </span>
                </div>

                <div className="mt-5 rounded-2xl border border-white/[0.1] bg-white/[0.06] p-4">
                  <p className="text-base leading-7 text-white">
                    Why does too much frother reduce concentrate grade?
                  </p>
                  <div className="mt-5 flex items-center gap-2">
                    <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.1] text-white" aria-label="Use voice input">
                      <Mic className="h-4 w-4" />
                    </button>
                    <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.1] text-white" aria-label="Play video preview">
                      <CirclePlay className="h-4 w-4" />
                    </button>
                    <Button onClick={goToDashboard} className="ml-auto rounded-full bg-white text-slate-950 hover:bg-cyan-50">
                      Ask
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
                  <div className="rounded-2xl border border-white/[0.1] bg-black p-3">
                    <div className="aspect-video overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_18%,#8be7ff_0%,#1d6ed1_26%,#07162e_58%,#000_100%)]">
                      <div className="flex h-full items-center justify-center">
                        <div className="relative h-20 w-20 rounded-full border border-cyan-100/70 bg-[radial-gradient(circle_at_35%_30%,#fff_0%,#6ee7ff_14%,#185ac8_42%,#07162e_75%)] shadow-2xl shadow-cyan-300/[0.4]">
                          <div className="absolute inset-3 rounded-full border border-white/[0.3]" />
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-300">Avatar explanation with subtitles</p>
                  </div>

                  <div className="space-y-3">
                    {workflowItems.map((item) => (
                      <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.06] p-3 text-sm font-medium text-slate-100">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
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
              More than a chat box: Meraki changes shape depending on how you want to learn.
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
              Built around the real study flow of froth flotation learners.
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

      <section id="workflow" className="bg-slate-950 px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.2] bg-white/[0.1] px-4 py-1.5 text-sm font-semibold">
              <Waves className="h-4 w-4 text-cyan-200" />
              From question to mastery
            </span>
            <h2 className="mt-5 text-balance text-4xl font-semibold leading-tight">
              Start with a question, end with stronger judgement.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Meraki is designed to help learners understand the science, make process decisions, and prepare for assessment in one connected workspace.
            </p>
            <Button onClick={goToDashboard} className="mt-7 gap-2 rounded-full bg-white text-slate-950 hover:bg-cyan-50">
              Open dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-[28px] border border-white/[0.1] bg-white/[0.06] p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: MessageSquare, label: 'Learn', value: 'Explain concepts and answer follow-ups' },
                { icon: FlaskConical, label: 'Practice', value: 'Solve guided operational scenarios' },
                { icon: BookOpenCheck, label: 'Review', value: 'Test recall and exam readiness' },
                { icon: Video, label: 'Video', value: 'Use avatar answers when visual delivery helps' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/[0.1] bg-slate-950/40 p-5">
                  <item.icon className="h-6 w-6 text-cyan-200" />
                  <p className="mt-5 text-sm text-slate-400">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold leading-snug">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
