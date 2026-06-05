import {
  BookOpenCheck,
  CheckCircle2,
  FlaskConical,
  GraduationCap,
  MessageSquare,
  Video,
} from 'lucide-react';
import { MerakiLogo } from '@/components/common/MerakiLogo';

interface AuthBrandPanelProps {
  variant: 'login' | 'signup';
}

const modeFeatures = [
  {
    icon: MessageSquare,
    title: 'Learn',
    desc: 'Ask concept questions and get clear text or avatar video explanations.',
  },
  {
    icon: FlaskConical,
    title: 'Practice',
    desc: 'Work through guided practice sessions with scored feedback.',
  },
  {
    icon: BookOpenCheck,
    title: 'Review',
    desc: 'Check retention with focused questions before assessments.',
  },
];

const signupFeatures = [
  'Learn-mode tutoring for focused explanations',
  'Practice sessions for active recall and reasoning',
  'Review questions for exam readiness',
  'Avatar video responses with subtitles',
  'Saved learning history across sessions',
];

export function AuthBrandPanel({ variant }: AuthBrandPanelProps) {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#edf6fb] text-slate-950 dark:bg-slate-950 dark:text-white lg:flex lg:w-1/2">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.24),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(237,232,176,0.42),transparent_26%),linear-gradient(145deg,#f8fcff_0%,#dff3fb_48%,#f8fbff_100%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.34),transparent_26%),radial-gradient(circle_at_88%_12%,rgba(237,232,176,0.3),transparent_24%),linear-gradient(145deg,#061224_0%,#104a9f_48%,#04101f_100%)]" />
      <div className="absolute -right-36 top-28 h-96 w-[36rem] rotate-[-16deg] rounded-[50%] border border-blue-200/70 bg-white/70 blur-sm dark:border-white/[0.15] dark:bg-white/[0.18]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.76),rgba(255,255,255,0.24))] dark:bg-[linear-gradient(90deg,rgba(2,6,23,0.72),rgba(2,6,23,0.28))]" />

      <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-200 bg-white/80 shadow-lg shadow-blue-600/[0.12] backdrop-blur dark:border-cyan-200/[0.5] dark:bg-white/[0.12] dark:shadow-cyan-500/[0.2]">
            <MerakiLogo variant="color" className="h-7 w-7 dark:hidden" decorative />
            <MerakiLogo variant="white" className="hidden h-7 w-7 dark:block" decorative />
          </div>
          <div>
            <p className="text-xl font-semibold">Meraki</p>
            <p className="text-xs text-blue-700 dark:text-cyan-100/[0.8]">AI learning workspace</p>
          </div>
        </div>

        <div className="w-full">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-950 shadow-sm shadow-blue-950/[0.06] dark:border-cyan-200/[0.3] dark:bg-cyan-100/10 dark:text-cyan-50 dark:shadow-none">
            <GraduationCap className="h-4 w-4 text-blue-700 dark:text-cyan-200" />
            {variant === 'login' ? 'Continue your learning flow' : 'Start with a smarter study space'}
          </span>

          <h1 className="mt-6 max-w-3xl text-balance text-5xl font-semibold leading-tight">
            Learn, Practice, and Review with one AI workspace.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600 dark:text-slate-200">
            {variant === 'login'
              ? 'Jump back into conversations, guided practice, avatar video explanations, and review sessions built around your learning flow.'
              : 'Create an account to move from concept questions to guided practice and assessment review without switching tools.'}
          </p>

          {variant === 'login' ? (
            <div className="mt-8 grid gap-3 xl:grid-cols-3">
              {modeFeatures.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-2xl border border-blue-200/80 bg-white/72 p-4 shadow-sm shadow-blue-950/[0.04] backdrop-blur dark:border-white/[0.12] dark:bg-white/[0.1] dark:shadow-none">
                  <div className="flex gap-3 xl:flex-col">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-cyan-300/[0.15] dark:text-cyan-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-blue-200/80 bg-white/72 p-5 shadow-sm shadow-blue-950/[0.04] backdrop-blur dark:border-white/[0.12] dark:bg-white/[0.1] dark:shadow-none">
              <div className="flex items-center gap-3 border-b border-slate-200/80 pb-4 dark:border-white/[0.1]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-cyan-300/[0.15] dark:text-cyan-100">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">What you get</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">A richer way to study.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {signupFeatures.map((item) => (
                  <div key={item} className="flex gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-200" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            ['3', 'Modes'],
            ['Video', 'Tutor'],
            ['AI', 'Feedback'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-blue-200/80 bg-white/72 p-4 shadow-sm shadow-blue-950/[0.04] dark:border-white/[0.1] dark:bg-white/[0.1] dark:shadow-none">
              <p className="text-lg font-semibold">{value}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
