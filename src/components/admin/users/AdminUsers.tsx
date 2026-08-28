'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApiClient, ASSIGNABLE_ROLES, ROLE_LABELS } from '@/services/adminApi';
import type { AdminRole, AdminUser } from '@/services/adminApi';
import { apiClient } from '@/services/api';
import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  Shield,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_ORDER: AdminRole[] = ['user', 'lecturer', 'admin', 'super_admin'];

function fullName(u: AdminUser): string {
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return name || '—';
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminApiClient.getUsers({ pageSize: 100 });
    if (res.success && res.data) {
      setUsers(res.data.items);
    } else {
      setUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // The caller's own role decides which roles they may hand out, and it is not
  // in the users list response.
  useEffect(() => {
    void apiClient.getUserProfile().then((res) => {
      if (res.success && res.data) setMe({ id: res.data.id, role: res.data.role });
    });
  }, []);

  const isSuperAdmin = me?.role === 'super_admin';
  const assignable = ASSIGNABLE_ROLES[me?.role ?? ''] ?? [];

  const changeRole = async (user: AdminUser, role: AdminRole) => {
    if (role === user.role) return;

    // Spelled out rather than left to a generic confirm. Making somebody an
    // admin is the single most consequential control on this page, and
    // "Are you sure?" does not say what is about to change.
    const confirmed = window.confirm(
      `Change ${user.email} from ${ROLE_LABELS[user.role as AdminRole] ?? user.role} to ` +
        `${ROLE_LABELS[role]}?` +
        (role === 'admin' || role === 'super_admin'
          ? '\n\nThis grants access to every course, every student record and the whole admin console.'
          : '')
    );
    if (!confirmed) return;

    setSaving(user.id);
    const res = await adminApiClient.updateUserRole(user.id, role);
    setSaving(null);

    if (!res.success) {
      // The API explains exactly why — "only a super admin may grant or revoke
      // admin roles", "cannot change your own role" — so show it verbatim.
      toast.error(res.error?.message ?? 'Could not change that role');
      return;
    }
    toast.success(`${user.email} is now ${ROLE_LABELS[role]}`);
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      fullName(u).toLowerCase().includes(q) ||
      (u.university_name ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 dark:border-white/10 gap-4 flex-wrap">
        <h2 className="text-sm font-semibold text-slate-950 dark:text-white flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600 dark:text-cyan-200" />
          All Users
          {!loading && (
            <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">({users.length})</span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email…"
              className="w-56 rounded-xl border border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.06] pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200/70 dark:focus:ring-cyan-300/[0.16]"
            />
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500 dark:text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <UserCircle className="h-10 w-10 text-slate-500 dark:text-slate-400 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{search ? 'No users match your search' : 'No users found'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-white/10">
                {['User', 'Role', 'Change role', 'University', 'Country', 'Joined'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => (
                <tr
                  key={user.id}
                  className={cn(
                    'border-b border-slate-200/70 dark:border-white/10 hover:bg-blue-50 dark:hover:bg-cyan-300/[0.08] transition-colors',
                    i % 2 !== 0 && 'bg-slate-950/[0.03] dark:bg-white/[0.04]'
                  )}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 flex-shrink-0 rounded-full bg-blue-600/[0.12] dark:bg-cyan-300/[0.1] ring-1 ring-primary/20 flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-cyan-200">
                          {user.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-slate-900 dark:text-white font-medium">{fullName(user)}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    {user.role !== 'user' ? (
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-blue-600/[0.12] dark:bg-cyan-300/[0.1] text-blue-600 dark:text-cyan-200 uppercase">
                        <Shield className="h-2.5 w-2.5" /> {user.role.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400">Student</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <RoleSelect
                      user={user}
                      assignable={assignable}
                      isSelf={me?.id === user.id}
                      isSuperAdmin={isSuperAdmin}
                      saving={saving === user.id}
                      onChange={(role) => void changeRole(user, role)}
                    />
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{user.university_name ?? '—'}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{user.country ?? '—'}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stated once, at the bottom, rather than as a tooltip on every greyed
          control. An admin who cannot promote somebody needs to know why. */}
      {me && !isSuperAdmin && (
        <p className="border-t border-slate-200/70 px-6 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          You can move people between Student and Lecturer. Granting or revoking Admin is
          restricted to super admins — in both directions, so that removing someone&rsquo;s admin
          rights cannot be used as a way around it.
        </p>
      )}
    </div>
  );
}

/**
 * The role control for one row.
 *
 * Disabled states are explained on the control itself, because the three
 * reasons a change is refused are genuinely different and a single greyed
 * dropdown teaches nothing:
 *
 *   - it is you (self-demotion would lock the console);
 *   - the target is or would become an admin and you are not a super admin;
 *   - your role assigns nothing at all.
 */
function RoleSelect({
  user,
  assignable,
  isSelf,
  isSuperAdmin,
  saving,
  onChange,
}: {
  user: AdminUser;
  assignable: readonly AdminRole[];
  isSelf: boolean;
  isSuperAdmin: boolean;
  saving: boolean;
  onChange: (role: AdminRole) => void;
}) {
  const targetIsPrivileged = user.role === 'admin' || user.role === 'super_admin';
  const blockedByPrivilege = targetIsPrivileged && !isSuperAdmin;
  const disabled = saving || isSelf || blockedByPrivilege || assignable.length === 0;

  const reason = isSelf
    ? 'You cannot change your own role'
    : blockedByPrivilege
      ? 'Only a super admin can change an admin role'
      : assignable.length === 0
        ? 'Your role cannot assign roles'
        : undefined;

  if (disabled) {
    return <span className="text-xs text-slate-400" title={reason}>{reason ?? '—'}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={user.role}
        onChange={(e) => onChange(e.target.value as AdminRole)}
        data-testid={`role-select-${user.id}`}
        className="rounded-lg border border-slate-200/80 bg-white/70 px-2 py-1 text-xs text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
      >
        {ROLE_ORDER.map((role) => (
          <option
            key={role}
            value={role}
            disabled={role !== user.role && !assignable.includes(role)}
          >
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
      {saving && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
    </div>
  );
}
