'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export function ResetPasswordForm() {
  const router = useRouter();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [recoveryAccessToken, setRecoveryAccessToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const establishRecoverySession = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      const code = queryParams.get('code');

      try {
        let session = null;

        if (accessToken && refreshToken && type === 'recovery') {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          session = data.session;
        } else if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          session = data.session;
        }

        if (!session?.access_token) {
          throw new Error('Invalid or missing recovery session');
        }

        if (active) {
          setRecoveryAccessToken(session.access_token);
          setTokenValid(true);
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch {
        if (active) {
          setTokenValid(false);
          setError('Invalid or missing reset token. Please request a new password reset link.');
        }
      }
    };

    void establishRecoverySession();
    return () => { active = false; };
  }, []);

  // Password validation helpers
  const passwordStrength = newPassword.length >= 8;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isFormValid = passwordStrength && passwordsMatch && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !recoveryAccessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.resetPassword(recoveryAccessToken, newPassword);
      if (!result.success) {
        setError(result.error?.message ?? 'Failed to reset password. Please request a new reset link.');
        setIsLoading(false);
        return;
      }

      await supabase.auth.signOut();
      setSuccess(true);
      toast.success('Password reset successfully!');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
      setError(message);
      setIsLoading(false);
    }
  };

  // Invalid token state
  if (tokenValid === false) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Invalid reset link</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <Link href="/auth/forgot-password">
          <Button className="mt-6 w-full gap-2">
            <ArrowLeft className="h-4 w-4" />
            Request new reset link
          </Button>
        </Link>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Password reset successful</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Your password has been reset. You can now sign in with your new password.
        </p>
        <div className="mt-6 text-xs text-muted-foreground">
          Redirecting to sign in...
        </div>
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

      {/* New Password Field */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          New password
        </Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNewPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
            disabled={isLoading || tokenValid !== true}
            required
            autoComplete="new-password"
            className="h-12 rounded-2xl border-slate-200 bg-white/[0.08]0 px-4 pr-10 dark:border-white/[0.1] dark:bg-white/[0.08]"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label={showNewPassword ? 'Hide password' : 'Show password'}
          >
            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className={`text-[10px] transition-colors ${passwordStrength ? 'text-emerald-400' : 'text-muted-foreground'}`}>
          {passwordStrength ? '✓' : '○'} At least 8 characters
        </p>
      </div>

      {/* Confirm Password Field */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Confirm password
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
            disabled={isLoading || tokenValid !== true}
            required
            autoComplete="new-password"
            className="h-12 rounded-2xl border-slate-200 bg-white/[0.08]0 px-4 pr-10 dark:border-white/[0.1] dark:bg-white/[0.08]"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className={`text-[10px] transition-colors ${passwordsMatch ? 'text-emerald-400' : 'text-muted-foreground'}`}>
          {passwordsMatch ? '✓' : '○'} Passwords match
        </p>
      </div>

      <Button
        type="submit"
        disabled={!isFormValid}
        className="mt-2 h-12 rounded-2xl bg-blue-600 font-semibold text-white shadow-lg shadow-blue-600/[0.22] hover:bg-blue-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Resetting…
          </>
        ) : (
          'Reset password'
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
