'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { apiClient } from '@/services/api';
import { hydrateSupabaseSession, loginMfaRequired, verifyLoginChallenge } from '@/lib/mfa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export function LoginForm() {
  const router = useRouter();
  const setAuth = useUserStore((s) => s.setAuth);
  const setUser = useUserStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── MFA step-up ──────────────────────────────────────────────────────────
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [verifyingMfa, setVerifyingMfa] = useState(false);

  // Fetch role + route once authentication (and any MFA step-up) is complete.
  const finishLogin = async () => {
    const profileRes = await apiClient.getUserProfile();
    if (profileRes.success && profileRes.data) {
      setUser(profileRes.data);
      toast.success('Welcome back!');
      const role = profileRes.data.role;
      if (role === 'admin' || role === 'super_admin') {
        router.replace('/admin');
      } else if (role === 'lecturer') {
        router.replace('/lecturer');
      } else {
        router.replace('/dashboard');
      }
    } else {
      toast.success('Welcome back!');
      router.replace('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setError(null);

    // Step 1 — authenticate against the backend
    const res = await apiClient.login(email.trim(), password);

    if (!res.success || !res.data) {
      setError(res.error?.message ?? 'Login failed. Please check your credentials.');
      setIsLoading(false);
      return;
    }

    // apiClient.login() already wrote the token to the cookie.
    setAuth(
      { id: res.data.user.id, email: res.data.user.email },
      res.data.access_token
    );

    // Step 2 — hydrate the supabase-js session so we can check/step-up MFA.
    await hydrateSupabaseSession(res.data.access_token, res.data.refresh_token);
    if (await loginMfaRequired()) {
      setMfaStep(true);
      setMfaCode('');
      setMfaError(null);
      setIsLoading(false);
      return;
    }

    // Step 3 — no MFA required: finish login.
    await finishLogin();
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6 || verifyingMfa) return;
    setVerifyingMfa(true);
    setMfaError(null);
    try {
      await verifyLoginChallenge(mfaCode);
      await finishLogin();
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : 'Verification failed. Try again.');
      setMfaCode('');
      setVerifyingMfa(false);
    }
  };

  if (mfaStep) {
    return (
      <form onSubmit={handleMfaSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-cyan-300/[0.14] dark:text-cyan-200">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Two-factor verification</h2>
          <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
            Enter the 6-digit code from your authenticator app to finish signing in.
          </p>
        </div>

        {mfaError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-destructive mt-0.5" />
            <p className="text-xs text-destructive">{mfaError}</p>
          </div>
        )}

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={mfaCode}
            onChange={(v) => { setMfaCode(v); setMfaError(null); }}
            disabled={verifyingMfa}
            autoFocus
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} className="h-12 w-11 text-base" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          type="submit"
          disabled={mfaCode.length !== 6 || verifyingMfa}
          className="h-12 rounded-2xl bg-blue-600 font-semibold text-white shadow-lg shadow-blue-600/[0.22] hover:bg-blue-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
        >
          {verifyingMfa ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</>
          ) : (
            'Verify & continue'
          )}
        </Button>

        <button
          type="button"
          onClick={() => { setMfaStep(false); setMfaError(null); apiClient.logout(); }}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </button>
      </form>
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
        <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
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
          className="h-12 rounded-2xl border-slate-200 bg-white/[0.08]0 px-4 dark:border-white/[0.1] dark:bg-white/[0.08]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Password
          </Label>
          <Link href="/auth/forgot-password" className="text-xs font-semibold text-blue-700 hover:underline dark:text-cyan-200">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            disabled={isLoading}
            required
            autoComplete="current-password"
            className="h-12 rounded-2xl border-slate-200 bg-white/[0.08]0 px-4 pr-10 dark:border-white/[0.1] dark:bg-white/[0.08]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading || !email || !password}
        className="mt-2 h-12 rounded-2xl bg-blue-600 font-semibold text-white shadow-lg shadow-blue-600/[0.22] hover:bg-blue-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  );
}
