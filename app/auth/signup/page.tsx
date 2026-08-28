import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { SignupForm } from '@/components/auth/SignupForm';
import { MerakiLogo } from '@/components/common/MerakiLogo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import Link from 'next/link';

export const metadata = {
  title: 'Create account | Meraki',
  description: 'Create your Meraki account to start learning.',
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen bg-[#edf6fb] dark:bg-slate-950">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>

      <AuthBrandPanel variant="signup" />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-12 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_14%,rgba(126,200,227,0.3),transparent_30%),radial-gradient(circle_at_86%_84%,rgba(237,232,176,0.34),transparent_28%)]" />
        <div className="relative w-full max-w-md rounded-[28px] border border-white/[0.7] bg-white/[0.08]5 p-6 shadow-2xl shadow-blue-950/[0.1] backdrop-blur-xl dark:border-white/[0.1] dark:bg-white/[0.06] sm:p-8">
          <div className="mb-7 flex items-center justify-center lg:hidden">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/[0.25]">
                <MerakiLogo variant="white" className="h-6 w-6" decorative />
              </span>
              <span className="text-xl font-semibold text-slate-950 dark:text-white">Meraki</span>
            </div>
          </div>

          <div className="mb-8 text-center">
            <p className="text-sm font-semibold text-blue-700 dark:text-cyan-200">Create your workspace</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Start learning with Meraki
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Build your AI study space for Learn, Review, and Assessment.
            </p>
          </div>

          <SignupForm />

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-blue-700 hover:underline dark:text-cyan-200">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
