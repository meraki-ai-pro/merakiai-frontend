'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/store/userStore';
import { apiClient } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CountryOption {
  code: string;
  name: string;
  region: string;
}

const fallbackCountries: CountryOption[] = [
  { code: 'GH', name: 'Ghana', region: 'Africa' },
  { code: 'NG', name: 'Nigeria', region: 'Africa' },
  { code: 'ZA', name: 'South Africa', region: 'Africa' },
  { code: 'KE', name: 'Kenya', region: 'Africa' },
  { code: 'EG', name: 'Egypt', region: 'Africa' },
  { code: 'US', name: 'United States', region: 'Americas' },
  { code: 'CA', name: 'Canada', region: 'Americas' },
  { code: 'BR', name: 'Brazil', region: 'Americas' },
  { code: 'GB', name: 'United Kingdom', region: 'Europe' },
  { code: 'DE', name: 'Germany', region: 'Europe' },
  { code: 'FR', name: 'France', region: 'Europe' },
  { code: 'IN', name: 'India', region: 'Asia' },
  { code: 'CN', name: 'China', region: 'Asia' },
  { code: 'JP', name: 'Japan', region: 'Asia' },
  { code: 'AU', name: 'Australia', region: 'Oceania' },
];

const regionOptions = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];

export function SignupForm() {
  const router = useRouter();
  const setAuth = useUserStore((s) => s.setAuth);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [universityName, setUniversityName] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countries, setCountries] = useState<CountryOption[]>(fallbackCountries);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const passwordStrong = password.length >= 8;
  const requiredFieldsComplete = Boolean(
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    universityName.trim() &&
    country &&
    region &&
    password &&
    confirmPassword
  );

  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => a.name.localeCompare(b.name)),
    [countries]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCountries() {
      setIsLoadingCountries(true);

      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,region');
        if (!response.ok) throw new Error('Could not load country list.');

        const data = await response.json() as {
          cca2?: string;
          name?: { common?: string };
          region?: string;
        }[];

        const options = data
          .map((item) => ({
            code: item.cca2 ?? item.name?.common ?? '',
            name: item.name?.common ?? '',
            region: item.region ?? '',
          }))
          .filter((item) => item.code && item.name && item.region);

        if (!cancelled && options.length > 0) {
          setCountries(options);
        }
      } catch {
        if (!cancelled) setCountries(fallbackCountries);
      } finally {
        if (!cancelled) setIsLoadingCountries(false);
      }
    }

    loadCountries();
    return () => { cancelled = true; };
  }, []);

  const handleCountryChange = (value: string) => {
    const selectedCountry = sortedCountries.find((item) => item.name === value);
    setCountry(value);
    setRegion(selectedCountry?.region ?? '');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requiredFieldsComplete) { setError('Please complete all required fields.'); return; }
    if (!passwordsMatch) { setError('Passwords do not match.'); return; }
    if (!passwordStrong) { setError('Password must be at least 8 characters.'); return; }

    setIsLoading(true);
    setError(null);

    const res = await apiClient.signup({
      email: email.trim(),
      password,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      university_name: universityName.trim(),
      region,
      country,
    });

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-cyan-200">
            Your details
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName" className="text-xs font-semibold text-slate-700 dark:text-slate-200">First name</Label>
            <Input
              id="firstName" type="text" placeholder="Ama"
              value={firstName} onChange={(e) => { setFirstName(e.target.value); setError(null); }}
              disabled={isLoading} required autoComplete="given-name"
              className="h-12 rounded-2xl border-slate-200 bg-white/[0.08]0 px-4 dark:border-white/[0.1] dark:bg-white/[0.08]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName" className="text-xs font-semibold text-slate-700 dark:text-slate-200">Last name</Label>
            <Input
              id="lastName" type="text" placeholder="Mensah"
              value={lastName} onChange={(e) => { setLastName(e.target.value); setError(null); }}
              disabled={isLoading} required autoComplete="family-name"
              className="h-12 rounded-2xl border-slate-200 bg-white/[0.08]0 px-4 dark:border-white/[0.1] dark:bg-white/[0.08]"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-cyan-200">
          School
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="universityName" className="text-xs font-semibold text-slate-700 dark:text-slate-200">University name</Label>
          <Input
            id="universityName" type="text" placeholder="University of Ghana"
            value={universityName} onChange={(e) => { setUniversityName(e.target.value); setError(null); }}
            disabled={isLoading} required autoComplete="organization"
            className="h-12 rounded-2xl border-slate-200 bg-white/[0.08]0 px-4 dark:border-white/[0.1] dark:bg-white/[0.08]"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country" className="text-xs font-semibold text-slate-700 dark:text-slate-200">Country</Label>
            <Select value={country} onValueChange={handleCountryChange} disabled={isLoading || isLoadingCountries} required>
              <SelectTrigger
                id="country"
                className="h-12 rounded-2xl border-slate-200 bg-white/[0.08]0 px-4 dark:border-white/[0.1] dark:bg-white/[0.08]"
              >
                <SelectValue placeholder={isLoadingCountries ? 'Loading countries...' : 'Select country'} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {sortedCountries.map((item) => (
                  <SelectItem key={item.code} value={item.name}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="region" className="text-xs font-semibold text-slate-700 dark:text-slate-200">Region</Label>
            {region ? (
              <Input
                id="region" type="text"
                value={region}
                disabled
                className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-slate-600 disabled:opacity-100 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-slate-300"
              />
            ) : (
              <Select value={region} onValueChange={(value) => { setRegion(value); setError(null); }} disabled={isLoading} required>
                <SelectTrigger
                  id="region"
                  className="h-12 rounded-2xl border-slate-200 bg-white/[0.08]0 px-4 dark:border-white/[0.1] dark:bg-white/[0.08]"
                >
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regionOptions.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-cyan-200">
          Account
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email address</Label>
          <Input
            id="email" type="email" placeholder="you@example.com"
            value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }}
            disabled={isLoading} required autoComplete="email"
            className="h-12 rounded-2xl border-slate-200 bg-white/[0.08]0 px-4 dark:border-white/[0.1] dark:bg-white/[0.08]"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-200">Password</Label>
            <div className="relative">
              <Input
                id="password" type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters"
                value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }}
                disabled={isLoading} required autoComplete="new-password"
                className="h-12 rounded-2xl border-slate-200 bg-white/[0.08]0 px-4 pr-10 dark:border-white/[0.1] dark:bg-white/[0.08]"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && (
              <p className={`text-[11px] ${passwordStrong ? 'text-emerald-500' : 'text-muted-foreground/60'}`}>
                {passwordStrong ? 'Good length' : 'Use at least 8 characters'}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700 dark:text-slate-200">Confirm password</Label>
            <Input
              id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters"
              value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
              disabled={isLoading} required autoComplete="new-password"
              className={`h-12 rounded-2xl border-slate-200 bg-white/[0.08]0 px-4 dark:border-white/[0.1] dark:bg-white/[0.08] ${confirmPassword && !passwordsMatch ? 'border-destructive' : ''}`}
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-[11px] text-destructive">Passwords don&apos;t match</p>
            )}
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading || !requiredFieldsComplete || !passwordsMatch || !passwordStrong}
        className="mt-2 h-12 rounded-2xl bg-blue-600 font-semibold text-white shadow-lg shadow-blue-600/[0.22] hover:bg-blue-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
      >
        {isLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating account…</>
        ) : 'Create account'}
      </Button>
    </form>
  );
}
