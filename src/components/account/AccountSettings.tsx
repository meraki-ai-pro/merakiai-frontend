'use client';

/**
 * Profile and password, for every role.
 *
 * One component, mounted from the student header, the lecturer workspace and
 * the admin shell. The client asked for this on all three sides; building it
 * three times would be three places for the current-password check to be
 * missing from one, and three sets of copy explaining what a student may and
 * may not change about themselves.
 *
 * What is deliberately NOT here:
 *
 *   - **Email.** It is the account's auth identity, and changing it needs the
 *     verification round trip Supabase owns. A field that silently failed
 *     would be worse than no field.
 *   - **Role.** Granted by an admin (see /admin/users). A self-service control
 *     would be a straight privilege escalation, so the API has no field for it
 *     either — this is not merely a hidden input.
 */

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, Loader2, UserRound } from 'lucide-react';
import { apiClient } from '@/services/api';
import { useUserStore } from '@/store/userStore';
import type { UpdateProfileRequest, UserProfileResponse } from '@/types';

const ROLE_LABELS: Record<string, string> = {
  user: 'Student',
  student: 'Student',
  lecturer: 'Lecturer',
  admin: 'Administrator',
  super_admin: 'Super administrator',
};

const FIELDS: { key: keyof UpdateProfileRequest; label: string; placeholder: string }[] = [
  { key: 'first_name', label: 'First name', placeholder: 'Ama' },
  { key: 'last_name', label: 'Last name', placeholder: 'Mensah' },
  { key: 'university_name', label: 'Institution', placeholder: 'University of Ghana' },
  { key: 'region', label: 'Region', placeholder: 'Greater Accra' },
  { key: 'country', label: 'Country', placeholder: 'Ghana' },
];

const MIN_PASSWORD_LENGTH = 8;

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 ' +
  'disabled:opacity-50 dark:border-white/15 dark:bg-slate-900 dark:text-white ' +
  'dark:focus:ring-cyan-300/30';

export function AccountSettings() {
  return (
    <div className="space-y-6">
      <ProfileSection />
      <PasswordSection />
    </div>
  );
}

function ProfileSection() {
  const storedUser = useUserStore((s) => s.user);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [form, setForm] = useState<UpdateProfileRequest>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void apiClient.getUserProfile().then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setProfile(res.data);
        setForm({
          first_name: res.data.first_name ?? '',
          last_name: res.data.last_name ?? '',
          university_name: res.data.university_name ?? '',
          region: res.data.region ?? '',
          country: res.data.country ?? '',
        });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = (key: keyof UpdateProfileRequest, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Only what actually changed. The API uses exclude_unset, so this is not
  // required for correctness — it just keeps the audit trail honest about
  // which fields a person edited.
  const changed = (): UpdateProfileRequest => {
    if (!profile) return {};
    const out: UpdateProfileRequest = {};
    for (const { key } of FIELDS) {
      const next = (form[key] ?? '').trim();
      const current = ((profile[key as keyof UserProfileResponse] as string) ?? '').trim();
      if (next && next !== current) out[key] = next;
    }
    return out;
  };

  const save = async () => {
    const updates = changed();
    if (Object.keys(updates).length === 0) {
      toast('Nothing has changed.');
      return;
    }

    setSaving(true);
    const res = await apiClient.updateProfile(updates);
    setSaving(false);

    if (!res.success || !res.data) {
      toast.error(res.error?.message ?? 'Could not save your profile.');
      return;
    }

    setProfile(res.data.profile);
    // The header and sidebar read the name from the store, so an update that
    // stopped at the server would leave the old name on screen until reload.
    if (storedUser) {
      useUserStore.setState({
        user: {
          ...storedUser,
          first_name: res.data.profile.first_name,
          last_name: res.data.profile.last_name,
          university_name: res.data.profile.university_name,
        },
      });
    }
    toast.success('Profile updated.');
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 p-5 dark:border-white/10">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <UserRound className="h-4 w-4" /> Profile
      </h3>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span>{profile?.email}</span>
        {profile?.role && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-white/10">
            {ROLE_LABELS[profile.role] ?? profile.role}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Your email address and role are set by your institution and cannot be changed here.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FIELDS.map(({ key, label, placeholder }) => (
          <label key={key} className="text-sm">
            <span className="text-slate-600 dark:text-slate-300">{label}</span>
            <input
              value={form[key] ?? ''}
              onChange={(e) => set(key, e.target.value)}
              placeholder={placeholder}
              disabled={saving}
              data-testid={`profile-${key}`}
              className={inputClass}
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        data-testid="profile-save"
        className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </section>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && next !== confirm;
  const ready = current && next.length >= MIN_PASSWORD_LENGTH && next === confirm;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    const res = await apiClient.changePassword({
      current_password: current,
      new_password: next,
    });
    setBusy(false);

    if (!res.success) {
      toast.error(res.error?.message ?? 'Could not change your password.');
      return;
    }

    setCurrent('');
    setNext('');
    setConfirm('');
    toast.success('Password changed.');
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <KeyRound className="h-4 w-4" /> Password
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        You need your current password to set a new one.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            disabled={busy}
            data-testid="password-current"
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">New password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            disabled={busy}
            data-testid="password-new"
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Confirm new password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={busy}
            data-testid="password-confirm"
            className={inputClass}
          />
        </label>
      </div>

      {/* Shown as you type rather than only on submit — a rejected password
          after a full round trip is the most annoying way to learn a rule. */}
      {tooShort && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Use at least {MIN_PASSWORD_LENGTH} characters.
        </p>
      )}
      {mismatch && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          The two new passwords do not match.
        </p>
      )}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={!ready || busy}
        data-testid="password-save"
        className="mt-4 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? 'Changing…' : 'Change password'}
      </button>
    </section>
  );
}
