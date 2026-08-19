'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ShieldCheck, ShieldAlert, Loader2, AlertCircle } from 'lucide-react';
import {
  hasSupabaseSession,
  listVerifiedTotpFactors,
  enrollTotp,
  verifyTotpEnrollment,
  unenrollTotp,
  type TotpEnrollment,
} from '@/lib/mfa';

type View = 'loading' | 'no-session' | 'idle' | 'enrolling';

/**
 * Two-factor (TOTP) management. Enroll an authenticator app, verify it, or
 * remove it. Requires a live supabase-js session (established at login); if
 * absent, prompts the user to re-authenticate.
 */
export function MfaSettings() {
  const [view, setView] = useState<View>('loading');
  const [enabled, setEnabled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!(await hasSupabaseSession())) {
      setView('no-session');
      return;
    }
    const factors = await listVerifiedTotpFactors();
    setEnabled(factors.length > 0);
    setFactorId(factors[0]?.id ?? null);
    setView('idle');
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startEnroll = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await enrollTotp();
      setEnrollment(data);
      setCode('');
      setView('enrolling');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start setup.');
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async () => {
    if (!enrollment || code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await verifyTotpEnrollment(enrollment.factorId, code);
      toast.success('Two-factor authentication enabled.');
      setEnrollment(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code. Try again.');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const cancelEnroll = async () => {
    // Drop the pending (unverified) factor so it doesn't linger.
    if (enrollment) {
      try {
        await unenrollTotp(enrollment.factorId);
      } catch {
        /* best-effort cleanup */
      }
    }
    setEnrollment(null);
    setError(null);
    await refresh();
  };

  const remove = async () => {
    if (!factorId || busy) return;
    setBusy(true);
    try {
      await unenrollTotp(factorId);
      toast.success('Two-factor authentication removed.');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove 2FA.');
    } finally {
      setBusy(false);
    }
  };

  if (view === 'loading') {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking status…
      </div>
    );
  }

  if (view === 'no-session') {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-amber-300/40 bg-amber-50/70 px-3 py-2.5 dark:border-amber-300/20 dark:bg-amber-300/[0.06]">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-300" />
        <p className="text-xs text-amber-800 dark:text-amber-200">
          Sign out and sign back in to manage two-factor authentication.
        </p>
      </div>
    );
  }

  if (view === 'enrolling' && enrollment) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          Scan this QR code with your authenticator app (or enter the key manually), then enter the 6-digit code.
        </p>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
          {/* supabase returns an SVG data URI */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrollment.qrCode} alt="Two-factor QR code" className="h-40 w-40 rounded bg-white p-1" />
          <code className="select-all break-all rounded bg-background px-2 py-1 text-[11px] text-muted-foreground">
            {enrollment.secret}
          </code>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <div className="flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={(v) => { setCode(v); setError(null); }} disabled={busy} autoFocus>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={cancelEnroll} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={confirmEnroll} disabled={code.length !== 6 || busy}>
            {busy ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Verifying…</> : 'Verify & enable'}
          </Button>
        </div>
      </div>
    );
  }

  // idle
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <ShieldCheck className={`mt-0.5 h-4 w-4 flex-shrink-0 ${enabled ? 'text-emerald-600 dark:text-emerald-300' : 'text-muted-foreground'}`} />
        <div>
          <p className="text-xs font-medium">
            {enabled ? 'Two-factor authentication is on' : 'Two-factor authentication is off'}
          </p>
          <p className="text-xs text-muted-foreground">
            {enabled
              ? 'A code from your authenticator app is required at sign-in.'
              : 'Add an extra layer of security with an authenticator app.'}
          </p>
        </div>
      </div>
      {enabled ? (
        <Button variant="outline" size="sm" onClick={remove} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Remove'}
        </Button>
      ) : (
        <Button size="sm" onClick={startEnroll} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enable'}
        </Button>
      )}
    </div>
  );
}
