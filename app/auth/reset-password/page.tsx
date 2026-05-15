import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import Link from 'next/link';

export const metadata = {
  title: 'Reset password — Meraki',
  description: 'Reset your Meraki account password.',
};

export default function ResetPasswordPage() {
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
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your new password below to regain access to your account
            </p>
          </div>

          <ResetPasswordForm />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Remember your password?{' '}
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
