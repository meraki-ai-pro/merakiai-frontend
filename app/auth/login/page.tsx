// FILE PATH: app/auth/login/page.tsx
// WITH theme toggle in top-right corner

import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { LoginForm } from '@/components/auth/LoginForm';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import Link from 'next/link';

export const metadata = {
  title: 'Sign in | Meraki',
  description: 'Sign in to your Meraki account to continue learning.',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Theme toggle - fixed in top-right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Left panel - branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2">
        <AuthBrandPanel variant="login" />
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to continue your learning journey
            </p>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Don't have an account?{' '}
            <Link
              href="/auth/signup"
              className="font-medium text-primary hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}