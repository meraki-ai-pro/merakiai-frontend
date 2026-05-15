'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    const res = await apiClient.forgotPassword(email.trim());

    if (res.success) {
      setSent(true);
    } else {
      setError(res.error?.message ?? 'Failed to send reset email. Please try again.');
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
        <Label htmlFor="email" className="text-xs font-medium text-foreground">
          Email address
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          disabled={isLoading}
          required
          autoComplete="email"
          className="h-10"
        />
      </div>

      <Button type="submit" disabled={isLoading || !email} className="h-10 mt-1">
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