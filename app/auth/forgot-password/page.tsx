import { GraduationCap } from 'lucide-react';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export const metadata = {
  title: 'Forgot Password | Meraki',
  description: 'Request a password reset link for your Meraki account.',
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">

      {/* Theme toggle - fixed top-right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground">Meraki</span>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            Did you forget your password?
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <ForgotPasswordForm />
      </div>
    </div>
  );
}