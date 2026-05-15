// FILE PATH: app/auth/signup/page.tsx
// WITH theme toggle in top-right corner

import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { SignupForm } from '@/components/auth/SignupForm';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import Link from 'next/link';

export const metadata = {
  title: 'Create account | Meraki',
  description: 'Create your Meraki account to start learning.',
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Theme toggle - fixed in top-right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Left panel - branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2">
        <AuthBrandPanel variant="signup" />
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Start your AI-powered learning journey today
            </p>
          </div>

          <SignupForm />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}