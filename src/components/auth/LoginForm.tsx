'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { apiClient } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setError(null);

    // Step 1 — authenticate
    const res = await apiClient.login(email.trim(), password);

    if (!res.success || !res.data) {
      setError(res.error?.message ?? 'Login failed. Please check your credentials.');
      setIsLoading(false);
      return;
    }

    // apiClient.login() already wrote the token to the cookie.
    // Set partial user from login response so the store is not empty.
    setAuth(
      { id: res.data.user.id, email: res.data.user.email },
      res.data.access_token
    );

    // Step 2 — fetch full profile to get role (login endpoint does not return role)
    const profileRes = await apiClient.getUserProfile();

    if (profileRes.success && profileRes.data) {
      // Hydrate full user object (role, avatar_id, voice_id, voice_gender, etc.)
      setUser(profileRes.data);
      toast.success('Welcome back!');
      // Step 3 — route based on role
      router.push(profileRes.data.role === 'admin' ? '/admin' : '/dashboard');
    } else {
      // Profile fetch failed — proceed to dashboard as a fallback
      toast.success('Welcome back!');
      router.push('/dashboard');
    }
  };

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

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-xs font-medium text-foreground">
            Password
          </Label>
          <Link href="/auth/forgot-password" className="text-[11px] text-primary hover:underline">
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
            className="h-10 pr-10"
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
        className="h-10 mt-1"
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
