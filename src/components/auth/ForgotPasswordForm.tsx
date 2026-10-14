'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { HCaptcha, HCAPTCHA_SITE_KEY } from './HCaptcha';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const res = await apiClient.forgotPassword(email.trim(), redirectTo, captcha ?? undefined);

    if (res.success) {
      setSent(true);
    } else {
      setError(res.error?.message ?? 'Failed to send reset email. Please try again.');
      setCaptchaReset((n) => n + 1);
    }

    setIsLoading(false);
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Check your inbox</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          We sent a password reset link to{' '}
          <span className="text-foreground font-medium">{email}</span>.
          The link expires in 1 hour.
        </p>
        <Link href="/auth/login">
          <Button variant="outline" className="mt-6 w-full gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="leading-none text-xs font-semibold text-slate-700 dark:text-slate-200">
          Email address
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          disabled={isLoading}
          required
          autoComplete="email"
          className="h-12 rounded-2xl border-slate-200 bg-white/[0.08]0 px-4 dark:border-white/[0.1] dark:bg-white/[0.08]"
        />
      </div>

      <HCaptcha onToken={setCaptcha} resetKey={captchaReset} />

      <Button
        type="submit"
        disabled={isLoading || !email || (!!HCAPTCHA_SITE_KEY && !captcha)}
        className="mt-2 h-12 rounded-2xl bg-blue-600 font-semibold text-white shadow-lg shadow-blue-600/[0.22] hover:bg-blue-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
      >
        {isLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending…</>
        ) : (
          'Send reset link'
        )}
      </Button>

      <Link
        href="/auth/login"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>
    </form>
  );
}
