import {
  BookOpenCheck,
  FlaskConical,
  MessageSquare,
} from 'lucide-react';
import { MerakiLogo } from '@/components/common/MerakiLogo';

interface AuthBrandPanelProps {
  variant: 'login' | 'signup';
}

const modes = [
  { icon: MessageSquare, label: 'Learn' },
  { icon: FlaskConical, label: 'Practice' },
  { icon: BookOpenCheck, label: 'Review' },
];

export function AuthBrandPanel({ variant }: AuthBrandPanelProps) {
  return (
    <aside
      aria-label={variant === 'login' ? 'Meraki sign in' : 'Meraki sign up'}
      className="relative hidden min-h-screen overflow-hidden bg-[#edf6fb] dark:bg-slate-950 lg:flex lg:w-1/2"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.24),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(237,232,176,0.42),transparent_26%),linear-gradient(145deg,#f8fcff_0%,#dff3fb_48%,#f8fbff_100%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.34),transparent_26%),radial-gradient(circle_at_88%_12%,rgba(237,232,176,0.3),transparent_24%),linear-gradient(145deg,#061224_0%,#104a9f_48%,#04101f_100%)]" />
      <div className="absolute -right-36 top-28 h-96 w-[36rem] rotate-[-16deg] rounded-[50%] border border-blue-200/70 bg-white/70 blur-sm dark:border-white/[0.15] dark:bg-white/[0.18]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.76),rgba(255,255,255,0.24))] dark:bg-[linear-gradient(90deg,rgba(2,6,23,0.72),rgba(2,6,23,0.28))]" />

      <div className="relative z-10 flex w-full flex-col items-center justify-center">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-blue-200/80 bg-white/75 shadow-xl shadow-blue-900/[0.1] backdrop-blur-md dark:border-cyan-100/[0.25] dark:bg-white/[0.1] dark:shadow-cyan-500/[0.12]">
            <MerakiLogo variant="color" className="h-9 w-9 dark:hidden" decorative />
            <MerakiLogo variant="white" className="hidden h-9 w-9 dark:block" decorative />
          </div>
          <span className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Meraki</span>
        </div>

        <p className="mt-10 text-center text-2xl font-semibold text-slate-900 dark:text-white">
          Your space to learn better.
        </p>

        <div className="mt-8 flex items-center gap-4">
          {modes.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex min-w-24 flex-col items-center gap-3 rounded-2xl border border-blue-200/80 bg-white/65 px-5 py-4 text-blue-700 shadow-sm backdrop-blur-md dark:border-white/[0.15] dark:bg-white/[0.08] dark:text-cyan-100"
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
