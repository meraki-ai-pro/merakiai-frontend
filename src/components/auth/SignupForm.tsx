'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/store/userStore';
import { apiClient } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function SignupForm() {
  const router = useRouter();
  const setAuth = useUserStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const passwordStrong = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) { setError('Passwords do not match.'); return; }
    if (!passwordStrong) { setError('Password must be at least 8 characters.'); return; }

    setIsLoading(true);
    setError(null);

    const res = await apiClient.signup(email.trim(), password);

    if (res.success && res.data) {
      const { session, user } = res.data;
      if (session.access_token) {
        // Cookie-based: setAuth writes token to cookie, then navigate
        setAuth({ id: user.id!, email: user.email! }, session.access_token);
        toast.success('Account created!');
        router.push('/dashboard');
      } else {
        // Email confirmation required
        setAwaitingConfirmation(true);
        setIsLoading(false);
      }
    } else {
      setError(res.error?.message ?? 'Could not create account. Please try again.');
      setIsLoading(false);
    }
  };

  if (awaitingConfirmation) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Check your email</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          We sent a confirmation link to{' '}
          <span className="text-foreground font-medium">{email}</span>.
          Click it to activate your account, then sign in.
        </p>
        <Link href="/auth/login">
          <Button variant="outline" className="mt-6 w-full">Back to sign in</Button>
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
        <Label htmlFor="email" className="text-xs font-medium text-foreground">Email address</Label>
        <Input
          id="email" type="email" placeholder="you@example.com"
          value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }}
          disabled={isLoading} required autoComplete="email" className="h-10"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" className="text-xs font-medium text-foreground">Password</Label>
        <div className="relative">
          <Input
            id="password" type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters"
            value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }}
            disabled={isLoading} required autoComplete="new-password" className="h-10 pr-10"
          />
          <button type="button" onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password && (
          <p className={`text-[11px] ${passwordStrong ? 'text-emerald-500' : 'text-muted-foreground/60'}`}>
            {passwordStrong ? '✓ Good length' : 'Use at least 8 characters'}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground">Confirm password</Label>
        <Input
          id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
          value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
          disabled={isLoading} required autoComplete="new-password"
          className={`h-10 ${confirmPassword && !passwordsMatch ? 'border-destructive' : ''}`}
        />
        {confirmPassword && !passwordsMatch && (
          <p className="text-[11px] text-destructive">Passwords don&apos;t match</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading || !email || !password || !confirmPassword || !passwordsMatch || !passwordStrong}
        className="h-10 mt-1"
      >
        {isLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating account…</>
        ) : 'Create account'}
      </Button>
    </form>
  );
}