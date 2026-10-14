'use client';

/**
 * Create or edit an account — super admins only (the API enforces it too).
 *
 * One form for both: with no `user` it creates an account that can sign in
 * straight away with the password typed here; with a `user` it edits their
 * details, and a password is only sent when one is typed. Role is chosen on
 * create; afterwards it is changed in the table's role column, which keeps its
 * confirmation and its admin-grant rules in one place.
 */

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { adminApiClient, ROLE_LABELS } from '@/services/adminApi';
import type { AdminRole, AdminUser } from '@/services/adminApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ROLES: AdminRole[] = ['user', 'lecturer', 'admin', 'super_admin'];

const EMPTY = {
  email: '', password: '', role: 'user' as AdminRole, first_name: '', last_name: '',
  university_name: '', region: '', country: '',
};

const FIELD =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900 dark:text-white';

export function AccountDialog({
  open,
  user,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** The account being edited; omit to create one. */
  user?: AdminUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const editing = !!user;

  useEffect(() => {
    if (!open) return;
    setForm(
      user
        ? {
            ...EMPTY,
            email: user.email,
            role: user.role as AdminRole,
            first_name: user.first_name ?? '',
            last_name: user.last_name ?? '',
            university_name: user.university_name ?? '',
            region: user.region ?? '',
            country: user.country ?? '',
          }
        : EMPTY,
    );
  }, [open, user]);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const details = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      university_name: form.university_name.trim(),
      region: form.region.trim(),
      country: form.country.trim(),
    };
    const res = editing
      ? await adminApiClient.updateUser(user!.id, {
          ...details,
          ...(form.email.trim() !== user!.email ? { email: form.email.trim() } : {}),
          ...(form.password ? { password: form.password } : {}),
        })
      : await adminApiClient.createUser({
          ...details, email: form.email.trim(), password: form.password, role: form.role,
        });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error?.message ?? (editing ? 'Could not save changes' : 'Could not create the account'));
      return;
    }
    toast.success(editing ? `${form.email} updated` : `Account created for ${form.email}`);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" data-testid="account-dialog">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit account' : 'New account'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Leave the password empty to keep the current one.'
              : 'The account can sign in straight away. Share the password with them securely; they can change it from their account page.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              First name
              <input required maxLength={100} value={form.first_name} onChange={set('first_name')} className={`mt-1 ${FIELD}`} />
            </label>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Last name
              <input required maxLength={100} value={form.last_name} onChange={set('last_name')} className={`mt-1 ${FIELD}`} />
            </label>
          </div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Email
            <input required type="email" value={form.email} onChange={set('email')} className={`mt-1 ${FIELD}`} />
          </label>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            {editing ? 'New password (optional)' : 'Password'}
            <input
              type="password"
              required={!editing}
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={form.password}
              onChange={set('password')}
              placeholder="At least 8 characters"
              className={`mt-1 ${FIELD}`}
            />
          </label>
          {!editing && (
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Role
              <select value={form.role} onChange={set('role')} className={`mt-1 ${FIELD}`}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Institution
            <input maxLength={200} value={form.university_name} onChange={set('university_name')} className={`mt-1 ${FIELD}`} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Region
              <input maxLength={100} value={form.region} onChange={set('region')} className={`mt-1 ${FIELD}`} />
            </label>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Country
              <input maxLength={100} value={form.country} onChange={set('country')} className={`mt-1 ${FIELD}`} />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              data-testid="account-save"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Create account'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
