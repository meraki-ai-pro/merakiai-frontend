import {
  BookOpenCheck,
  CheckCircle2,
  FlaskConical,
  GraduationCap,
  MessageSquare,
  Sparkles,
  Video,
} from 'lucide-react';

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
    desc: 'Work through realistic flotation scenarios with guided feedback.',
  },
  {
    icon: BookOpenCheck,
    title: 'Review',
    desc: 'Check retention with focused questions before assessments.',
  },
];

const signupFeatures = [
  'Learn-mode tutoring for froth flotation concepts',
  'Practice scenarios for plant-style decisions',
  'Review questions for exam readiness',
  'Avatar video responses with subtitles',
  'Saved learning history across sessions',
];

export function AuthBrandPanel({ variant }: AuthBrandPanelProps) {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-slate-950 text-white lg:flex lg:w-1/2">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.34),transparent_26%),radial-gradient(circle_at_88%_12%,rgba(237,232,176,0.3),transparent_24%),linear-gradient(145deg,#061224_0%,#104a9f_48%,#04101f_100%)]" />
      <div className="absolute -right-36 top-28 h-96 w-[36rem] rotate-[-16deg] rounded-[50%] border border-white/[0.15] bg-white/[0.18] blur-sm" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.72),rgba(2,6,23,0.28))]" />

      <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-200/[0.5] bg-white/[0.12] shadow-lg shadow-cyan-500/[0.2] backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-semibold">Meraki</p>
            <p className="text-xs text-cyan-100/[0.8]">AI froth flotation tutor</p>
          </div>
        </div>

        <div className="w-full">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/[0.3] bg-cyan-100/10 px-4 py-2 text-sm font-semibold text-cyan-50">
            <GraduationCap className="h-4 w-4 text-cyan-200" />
            {variant === 'login' ? 'Continue your learning flow' : 'Start with a smarter study space'}
          </span>

          <h1 className="mt-6 max-w-3xl text-balance text-5xl font-semibold leading-tight">
            Learn, Practice, and Review froth flotation with one AI workspace.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-200">
            {variant === 'login'
              ? 'Jump back into conversations, scenario practice, avatar video explanations, and review sessions built around mineral processing.'
              : 'Create an account to move from concept questions to plant-style practice and assessment review without switching tools.'}
          </p>

          {variant === 'login' ? (
            <div className="mt-8 grid gap-3 xl:grid-cols-3">
              {modeFeatures.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-2xl border border-white/[0.12] bg-white/[0.1] p-4 backdrop-blur">
                  <div className="flex gap-3 xl:flex-col">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300/[0.15] text-cyan-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-white/[0.12] bg-white/[0.1] p-5 backdrop-blur">
              <div className="flex items-center gap-3 border-b border-white/[0.1] pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/[0.15] text-cyan-100">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">What you get</p>
                  <p className="text-sm text-slate-300">A richer way to study flotation.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {signupFeatures.map((item) => (
                  <div key={item} className="flex gap-3 text-sm text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
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
            <div key={label} className="rounded-2xl border border-white/[0.1] bg-white/[0.1] p-4">
              <p className="text-lg font-semibold">{value}</p>
              <p className="mt-1 text-xs text-slate-300">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
