import { supabase } from './supabase';
import { tokenStore } from '@/services/api';

/**
 * MFA (TOTP) helpers built on supabase-js.
 *
 * MerakiAI's login is backend-mediated (FastAPI → supabase-py), so the
 * supabase-js client has no session of its own after login. Before any MFA
 * call we hydrate that client with the tokens the backend returned
 * (`hydrateSupabaseSession`). supabase-js then persists + auto-refreshes the
 * session, so the settings page can manage factors on later visits.
 *
 * NOTE: TOTP must be enabled for the project (Supabase Dashboard → Auth → MFA).
 */

export type AssuranceLevel = 'aal1' | 'aal2' | null;

/** True when supabase-js currently holds a session (needed for MFA calls). */
export async function hasSupabaseSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

/** Hydrate the supabase-js session from backend-issued tokens so MFA APIs work. */
export async function hydrateSupabaseSession(
  accessToken: string,
  refreshToken?: string | null,
): Promise<void> {
  if (!refreshToken) return;
  try {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch {
    /* non-fatal — MFA calls will simply report "no session" */
  }
}

export interface AalState {
  currentLevel: AssuranceLevel;
  nextLevel: AssuranceLevel;
}

export async function getAssuranceLevel(): Promise<AalState> {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return {
    currentLevel: (data?.currentLevel ?? null) as AssuranceLevel,
    nextLevel: (data?.nextLevel ?? null) as AssuranceLevel,
  };
}

/**
 * True when the signed-in user has a verified factor and must step up from
 * aal1 to aal2 (i.e. present a TOTP code) to complete login.
 */
export async function loginMfaRequired(): Promise<boolean> {
  try {
    const { currentLevel, nextLevel } = await getAssuranceLevel();
    return nextLevel === 'aal2' && currentLevel === 'aal1';
  } catch {
    return false;
  }
}

export interface VerifiedFactor {
  id: string;
  friendlyName: string | null;
}

export async function listVerifiedTotpFactors(): Promise<VerifiedFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return [];
  return (data.totp ?? []).map((f) => ({
    id: f.id,
    friendlyName: f.friendly_name ?? null,
  }));
}

export interface TotpEnrollment {
  factorId: string;
  qrCode: string; // SVG data URI — usable directly as <img src>
  secret: string; // manual-entry key
  uri: string; // otpauth:// URI
}

export async function enrollTotp(
  friendlyName = 'Authenticator',
): Promise<TotpEnrollment> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName,
  });
  if (error || !data) {
    throw new Error(error?.message ?? 'Could not start two-factor setup.');
  }
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

/** Verify a freshly-enrolled factor with a TOTP code, then sync the token. */
export async function verifyTotpEnrollment(
  factorId: string,
  code: string,
): Promise<void> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) throw new Error(error.message);
  await syncAccessToken();
}

/** Complete the login step-up challenge with a TOTP code. */
export async function verifyLoginChallenge(code: string): Promise<void> {
  const factors = await listVerifiedTotpFactors();
  if (factors.length === 0) throw new Error('No authenticator is enrolled.');
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factors[0].id,
    code,
  });
  if (error) throw new Error(error.message);
  await syncAccessToken();
}

export async function unenrollTotp(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw new Error(error.message);
  await syncAccessToken();
}

/**
 * Copy the current supabase access token (which may have been upgraded to
 * aal2, or refreshed) into the app's cookie token store so subsequent
 * backend calls carry it.
 */
export async function syncAccessToken(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) tokenStore.set(token);
}
