import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { MerakiLogo } from '@/components/common/MerakiLogo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { ArrowLeft, BookOpenCheck, FlaskConical, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Forgot Password | Meraki',
  description: 'Request a password reset link for your Meraki account.',
};

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#edf6fb] px-5 py-12 dark:bg-slate-950 sm:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(56,189,248,0.3),transparent_30%),radial-gradient(circle_at_82%_76%,rgba(237,232,176,0.32),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.75),rgba(126,200,227,0.18))] dark:bg-[radial-gradient(circle_at_20%_16%,rgba(56,189,248,0.2),transparent_30%),radial-gradient(circle_at_82%_76%,rgba(245,197,163,0.14),transparent_28%)]" />

      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/[0.7] bg-white/[0.08]0 shadow-2xl shadow-blue-950/[0.1] backdrop-blur-xl dark:border-white/[0.1] dark:bg-white/[0.06] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="hidden items-center justify-center bg-[#edf6fb] p-10 dark:bg-slate-950 lg:flex">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-blue-200/80 bg-white/75 shadow-xl shadow-blue-900/[0.1] backdrop-blur-md dark:border-cyan-100/[0.25] dark:bg-white/[0.1] dark:shadow-cyan-500/[0.12]">
                  <MerakiLogo variant="color" className="h-9 w-9 dark:hidden" decorative />
                  <MerakiLogo variant="white" className="hidden h-9 w-9 dark:block" decorative />
                </span>
                <span className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Meraki</span>
              </div>
              <p className="mt-10 text-center text-2xl font-semibold text-slate-900 dark:text-white">
                Your space to learn better.
              </p>
              <div className="mt-8 flex items-center gap-4">
                {[
                  { icon: MessageSquare, label: 'Learn' },
                  { icon: FlaskConical, label: 'Practice' },
                  { icon: BookOpenCheck, label: 'Review' },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="flex min-w-24 flex-col items-center gap-3 rounded-2xl border border-blue-200/80 bg-white/65 px-5 py-4 text-blue-700 shadow-sm backdrop-blur-md dark:border-white/[0.15] dark:bg-white/[0.08] dark:text-cyan-100"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-12">
            <Link
              href="/auth/login"
              className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>

            <div className="mb-8">
              <div className="mb-5 flex items-center gap-3 lg:hidden">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/[0.25]">
                  <MerakiLogo variant="white" className="h-6 w-6" decorative />
                </span>
                <span className="text-xl font-semibold text-slate-950 dark:text-white">Meraki</span>
              </div>
              <p className="text-sm font-semibold text-blue-700 dark:text-cyan-200">Password help</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                Reset access to your account
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Enter your email and we&apos;ll send a reset link.
              </p>
            </div>

            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
